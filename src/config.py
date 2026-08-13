"""TALOS central configuration (SoSoValue edition).

Everything is driven by real inputs:
- The watched asset, sector index and news category come from env (with sane defaults).
- The portfolio is the trader's REAL holdings, provided via TALOS_PORTFOLIO.
  There is no mock/demo portfolio: if it is missing we fail with a clear error.
"""
import os
import json

DEFAULT_SYMBOL = os.getenv("TALOS_SYMBOL", "BTC")
DEFAULT_INDEX = os.getenv("TALOS_INDEX", "ssiMAG7")
NEWS_CATEGORY = int(os.getenv("TALOS_NEWS_CATEGORY", "1"))

# Human-veto Guardian limits (off-chain safety layer)
MAX_TRADE_PCT = float(os.getenv("TALOS_MAX_TRADE_PCT", "20"))     # max % of portfolio per single trade
MAX_RISK_SCORE = float(os.getenv("TALOS_MAX_RISK_SCORE", "70"))   # block trades above this risk score


def get_portfolio():
    """Return the trader's real holdings as {SYMBOL: quantity}.

    Source: TALOS_PORTFOLIO env var, a JSON object, e.g.
        TALOS_PORTFOLIO='{"BTC": 0.5, "ETH": 4, "USDS": 1000}'
    """
    raw = os.getenv("TALOS_PORTFOLIO", "").strip()
    if not raw:
        raise RuntimeError(
            "TALOS_PORTFOLIO not set. Provide your real holdings as JSON, e.g. "
            "export TALOS_PORTFOLIO='{\"BTC\": 0.5, \"ETH\": 4, \"USDS\": 1000}'"
        )
    try:
        data = json.loads(raw)
    except Exception as e:
        raise RuntimeError(f"TALOS_PORTFOLIO is not valid JSON: {e}")
    if not isinstance(data, dict) or not data:
        raise RuntimeError("TALOS_PORTFOLIO must be a non-empty JSON object of {symbol: quantity}")
    return {str(k).upper(): float(v) for k, v in data.items()}
