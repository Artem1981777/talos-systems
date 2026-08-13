"""TALOS Guardian gate (off-chain human-veto safety layer).

Replaces the old on-chain guardian module. Pure, deterministic and
testable: it blocks any trade that exceeds the per-trade notional cap or the
max acceptable risk score. No RPC, no chain, no external deps.
"""
import os


def guardian_check(notional_usd, portfolio_usd, risk_score,
                   max_trade_pct=None, max_risk_score=None):
    """Decide whether a proposed trade may proceed.

    Returns a dict describing the decision. allowed=False means a human must
    intervene (or the trade is simply rejected).
    """
    if max_trade_pct is None:
        max_trade_pct = float(os.getenv("TALOS_MAX_TRADE_PCT", "20"))
    if max_risk_score is None:
        max_risk_score = float(os.getenv("TALOS_MAX_RISK_SCORE", "70"))

    result = {
        "enabled": True,
        "allowed": True,
        "reason": "ok",
        "notional_usd": notional_usd,
        "portfolio_usd": portfolio_usd,
        "risk_score": risk_score,
        "max_trade_pct": max_trade_pct,
        "max_risk_score": max_risk_score,
    }

    if portfolio_usd is None or portfolio_usd <= 0:
        result["allowed"] = False
        result["reason"] = "empty_or_unknown_portfolio"
        return result

    trade_pct = 100.0 * float(notional_usd) / float(portfolio_usd)
    result["trade_pct"] = round(trade_pct, 2)

    if trade_pct > max_trade_pct:
        result["allowed"] = False
        result["reason"] = f"per_trade_cap_exceeded:{trade_pct:.1f}%>{max_trade_pct:.1f}%"
        return result

    if risk_score is not None and risk_score > max_risk_score:
        result["allowed"] = False
        result["reason"] = f"risk_too_high:{risk_score:.1f}>{max_risk_score:.1f}"
        return result

    return result


if __name__ == "__main__":
    print(guardian_check(1000, 10000, 40))   # allow (10% <= 20%, risk 40 <= 70)
    print(guardian_check(5000, 10000, 40))   # block (50% > 20%)
    print(guardian_check(1000, 10000, 85))   # block (risk 85 > 70)
