"""TALOS market watcher (SoSoValue edition).

Legacy on-chain watcher removed. This module now exposes a single
helper that returns a live market snapshot from SoSoValue. No RPC, no random,
no mocks: on failure it raises SosoValueError.
"""
from src.integrations.sosovalue import get_sosovalue_client, SosoValueError
from src import config


def get_market_metrics(symbol=None, index_ticker=None):
    """Return a live SoSoValue market snapshot for one asset + sector index."""
    client = get_sosovalue_client()
    symbol = symbol or config.DEFAULT_SYMBOL
    index_ticker = index_ticker or config.DEFAULT_INDEX

    market = client.get_market_data(symbol)
    try:
        index = client.get_index_snapshot(index_ticker)
    except SosoValueError as e:
        index = {"ticker": index_ticker, "error": str(e)}

    return {
        "symbol": symbol,
        "price": market.get("price"),
        "change_pct_24h": market.get("change_pct_24h"),
        "volatility": market.get("volatility"),
        "turnover_24h": market.get("turnover_24h"),
        "marketcap_rank": market.get("marketcap_rank"),
        "index": index,
        "market_data": market,
    }


if __name__ == "__main__":
    import json
    print(json.dumps(get_market_metrics(), indent=2))
