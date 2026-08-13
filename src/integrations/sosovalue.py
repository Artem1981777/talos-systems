"""
TALOS SoSoValue Market Data Integration.
Real market data via the SoSoValue OpenAPI. No mocks, no stubbed fallbacks:
on ANY failure this module raises SosoValueError.
Base: https://openapi.sosovalue.com/openapi/v1  Auth header: x-soso-api-key
"""
from __future__ import annotations

import os
import time
import threading
from collections import deque
from typing import Any, Dict, List, Optional

import requests
from diskcache import Cache

DEFAULT_BASE_URL = "https://openapi.sosovalue.com/openapi/v1"


class SosoValueError(RuntimeError):
    """Raised when the SoSoValue API is unavailable or returns an error."""


class _RateLimiter:
    def __init__(self, per_min: int):
        self.per_min = max(1, per_min)
        self._calls = deque()
        self._lock = threading.Lock()

    def acquire(self) -> None:
        with self._lock:
            now = time.monotonic()
            while self._calls and now - self._calls[0] >= 60.0:
                self._calls.popleft()
            if len(self._calls) >= self.per_min:
                sleep_for = 60.0 - (now - self._calls[0])
                if sleep_for > 0:
                    time.sleep(sleep_for)
                now = time.monotonic()
                while self._calls and now - self._calls[0] >= 60.0:
                    self._calls.popleft()
            self._calls.append(time.monotonic())


def _f(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


class SosoValueClient:
    def __init__(self):
        self.base_url = os.getenv("SOSO_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
        self.api_key = os.getenv("SOSO_API_KEY", "").strip()
        self.timeout = float(os.getenv("SOSO_TIMEOUT", "10"))
        self.rate = _RateLimiter(int(os.getenv("SOSO_RATE_PER_MIN", "8")))
        self.cache = Cache(os.getenv("SOSO_CACHE_DIR", ".talos_cache/soso"))
        if not self.api_key:
            raise SosoValueError(
                "SOSO_API_KEY is not set. Real market data is required "
                "(no mock fallback). Export your SoSoValue API key first."
            )
        print(f"[SOSO] Real mode base={self.base_url} rate={self.rate.per_min}/min")

    def _request(self, path: str, params: Optional[Dict[str, Any]] = None,
                 cache_ttl: float = 0.0) -> Any:
        key = None
        if cache_ttl > 0:
            key = f"{path}?{sorted((params or {}).items())}"
            hit = self.cache.get(key)
            if hit is not None:
                return hit
        self.rate.acquire()
        url = f"{self.base_url}{path}"
        try:
            resp = requests.get(
                url, params=params or {},
                headers={"accept": "application/json",
                        "x-soso-api-key": self.api_key},
                timeout=self.timeout,
            )
        except requests.RequestException as e:
            raise SosoValueError(f"network error calling {path}: {e}") from e
        if resp.status_code == 429:
            raise SosoValueError(f"rate limit exceeded (429) on {path}: {resp.text}")
        if resp.status_code != 200:
            raise SosoValueError(f"HTTP {resp.status_code} on {path}: {resp.text}")
        try:
            payload = resp.json()
        except ValueError as e:
            raise SosoValueError(f"non-JSON response on {path}: {e}") from e
        if isinstance(payload, dict) and "code" in payload:
            if payload.get("code") != 0:
                raise SosoValueError(
                    f"API error on {path}: code={payload.get('code')} "
                    f"message={payload.get('message')}"
                )
            data = payload.get("data")
        else:
            data = payload
        if cache_ttl > 0 and key is not None and data is not None:
            self.cache.set(key, data, expire=cache_ttl)
        return data

    def list_currencies(self) -> List[Dict[str, Any]]:
        data = self._request("/currencies", cache_ttl=6 * 3600)
        if not isinstance(data, list):
            raise SosoValueError("unexpected /currencies response shape")
        return data

    def resolve_currency_id(self, symbol: str) -> str:
        symbol = symbol.strip().upper()
        ck = f"cid:{symbol}"
        hit = self.cache.get(ck)
        if hit:
            return hit
        for row in self.list_currencies():
            if str(row.get("symbol", "")).upper() == symbol:
                cid = str(row["currency_id"])
                self.cache.set(ck, cid, expire=6 * 3600)
                return cid
        raise SosoValueError(f"currency symbol not found on SoSoValue: {symbol}")

    def get_market_snapshot(self, symbol_or_id: str) -> Dict[str, Any]:
        cid = symbol_or_id if symbol_or_id.isdigit() \
            else self.resolve_currency_id(symbol_or_id)
        data = self._request(f"/currencies/{cid}/market-snapshot", cache_ttl=60)
        if not isinstance(data, dict):
            raise SosoValueError("unexpected market-snapshot response shape")
        return data

    def get_news(self, category: Optional[int] = None,
                 currency_id: Optional[str] = None,
                 page: int = 1, page_size: int = 20) -> List[Dict[str, Any]]:
        params: Dict[str, Any] = {"page": page, "page_size": min(page_size, 100)}
        if category is not None:
            params["category"] = category
        if currency_id is not None:
            params["currency_id"] = currency_id
        data = self._request("/news", params=params, cache_ttl=300)
        if isinstance(data, dict):
            return data.get("list", []) or []
        return data or []

    def list_indices(self) -> List[str]:
        data = self._request("/indices", cache_ttl=6 * 3600)
        if not isinstance(data, list):
            raise SosoValueError("unexpected /indices response shape")
        return data

    def get_index_snapshot(self, ticker: str) -> Dict[str, Any]:
        t = ticker.strip().lower()
        data = self._request(f"/indices/{t}/market-snapshot", cache_ttl=60)
        if not isinstance(data, dict):
            raise SosoValueError("unexpected index market-snapshot response shape")
        return {
            "ticker": t,
            "price": _f(data.get("price")),
            "change_pct_24h": _f(data.get("24h_change_pct")),
            "roi_7d": _f(data.get("7day_roi")),
            "roi_1m": _f(data.get("1month_roi")),
            "roi_3m": _f(data.get("3month_roi")),
            "roi_1y": _f(data.get("1year_roi")),
            "ytd": _f(data.get("ytd")),
            "source": "sosovalue-openapi",
            "timestamp": int(time.time()),
        }

    def get_index_constituents(self, ticker: str) -> List[Dict[str, Any]]:
        t = ticker.strip().lower()
        data = self._request(f"/indices/{t}/constituents", cache_ttl=3600)
        if not isinstance(data, list):
            raise SosoValueError("unexpected index constituents response shape")
        return data

    def get_market_data(self, symbol: str = "BTC") -> Dict[str, Any]:
        snap = self.get_market_snapshot(symbol)
        price = _f(snap.get("price")) or 0.0
        high = _f(snap.get("high_24h")) or 0.0
        low = _f(snap.get("low_24h")) or 0.0
        if price <= 0:
            raise SosoValueError(f"invalid price from SoSoValue for {symbol}")
        volatility = round((high - low) / price, 6) if high and low else None
        return {
            "symbol": symbol.upper(),
            "price": price,
            "change_pct_24h": _f(snap.get("change_pct_24h")),
            "turnover_24h": _f(snap.get("turnover_24h")),
            "high_24h": high or None,
            "low_24h": low or None,
            "marketcap": _f(snap.get("marketcap")),
            "marketcap_rank": snap.get("marketcap_rank"),
            "volatility": volatility,
            "source": "sosovalue-openapi",
            "timestamp": int(time.time()),
        }


_client: Optional[SosoValueClient] = None


def get_sosovalue_client() -> SosoValueClient:
    global _client
    if _client is None:
        _client = SosoValueClient()
    return _client


if __name__ == "__main__":
    c = get_sosovalue_client()
    print("currencies sample:", c.list_currencies()[:3])
    print("BTC market_data:", c.get_market_data("BTC"))
    print("indices:", c.list_indices())
    idx = (c.list_indices() or ["ssimag7"])[0]
    print(f"index {idx} snapshot:", c.get_index_snapshot(idx))
    news = c.get_news(category=1, page_size=3)
    print(f"news items: {len(news)}")
    for n in news[:3]:
        print(" -", n.get("title"))
