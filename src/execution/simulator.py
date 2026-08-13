"""TALOS pre-trade planner (off-chain).

Replaces the old on-chain dry-run. Produces a pre-trade sizing
and a slippage estimate derived from REAL SoSoValue market data (24h turnover),
not a hardcoded constant. No RPC, no external deps.
"""
from dataclasses import dataclass


@dataclass
class TradePlan:
    ok: bool
    symbol: str
    side: str
    notional_usd: float
    est_price: float
    est_units: float
    est_slippage_pct: float
    reason: str


def plan_trade(symbol, side, notional_usd, market_data):
    """Estimate execution for a notional trade using live market data.

    Slippage is modelled from the trade size relative to 24h turnover:
    bigger size vs. liquidity => more impact. Capped at 5%.
    """
    price = (market_data or {}).get("price")
    turnover = (market_data or {}).get("turnover_24h") or 0.0

    if not price or price <= 0:
        return TradePlan(False, symbol, side, notional_usd, 0.0, 0.0, 0.0, "no_price")

    impact_pct = 0.0
    if turnover > 0:
        impact_pct = min(5.0, 100.0 * float(notional_usd) / float(turnover))

    units = float(notional_usd) / float(price)
    return TradePlan(
        ok=True,
        symbol=symbol,
        side=side,
        notional_usd=float(notional_usd),
        est_price=float(price),
        est_units=units,
        est_slippage_pct=round(impact_pct, 4),
        reason="planned",
    )


if __name__ == "__main__":
    md = {"price": 63444.68, "turnover_24h": 22050029854.0}
    print(plan_trade("BTC", "BUY", 5000, md))
