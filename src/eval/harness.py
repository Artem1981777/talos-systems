"""TALOS eval + backtest harness (P1): deterministic policy regression + synthetic backtest; pure stdlib, mock LLM/Allora."""
import os
os.environ["USE_MOCK_LLM"] = "true"
os.environ["USE_MOCK_ALLORA"] = "true"
import io
import json
import time
import random
import contextlib
from src.agents.orchestrator import validator_node, rebalance_node
from src.ai.llm_manager import get_llm_manager
get_llm_manager().use_mock = True
from src.ai.react_agent import get_react_agent
get_react_agent().max_iterations = 1
from src.ai.react_agent import AgentDecision as _AD
def _stub_think(_s):
    return _AD(action="HOLD", confidence=0.6, reasoning="eval-stub", risk_score=40.0, expected_roi=0.0, execution_plan=list(), alternatives=list(), simulation_required=False, time_horizon="SHORT")
get_react_agent().think = _stub_think

SAFETY_CASES = [
    {"name": "depeg_hard", "signals": {"mETH_price_eth": 0.90, "gas_price_wei": 50000000, "vault_balance": 250.0, "risk_metrics": dict()}, "expected": "emergency_hold"},
    {"name": "depeg_edge", "signals": {"mETH_price_eth": 0.9699, "gas_price_wei": 50000000, "vault_balance": 250.0, "risk_metrics": dict()}, "expected": "emergency_hold"},
    {"name": "high_gas", "signals": {"mETH_price_eth": 1.001, "gas_price_wei": 5000000000000, "vault_balance": 1.0, "risk_metrics": dict()}, "expected": "yield_hold"},
    {"name": "healthy", "signals": {"mETH_price_eth": 1.001, "gas_price_wei": 500000000, "vault_balance": 250.0, "risk_metrics": dict()}, "expected": None},
]

def route(signals):
    state = {"market_signals": signals}
    sink = io.StringIO()
    t0 = time.time()
    with contextlib.redirect_stdout(sink):
        updates = validator_node(state)
    dt_ms = (time.time() - t0) * 1000.0
    for k, v in updates.items():
        state[k] = v
    return state, state.get("next_action", "yield_hold"), dt_ms

def grade_safety():
    results = []
    for case in SAFETY_CASES:
        state, action, dt_ms = route(case["signals"])
        expected = case["expected"]
        ok = True if expected is None else (action == expected)
        results.append({"name": case["name"], "expected": expected, "actual": action, "ok": ok, "latency_ms": round(dt_ms, 2)})
    return results

def synth_series(n, seed):
    rng = random.Random(seed)
    series = []
    for i in range(n):
        depeg = rng.random() < 0.15
        if depeg:
            price = round(rng.uniform(0.88, 0.965), 4)
            ret = round(rng.uniform(-0.22, -0.08), 4)
        else:
            price = round(rng.uniform(0.995, 1.01), 4)
            ret = round(rng.uniform(-0.01, 0.025), 4)
        spike = rng.random() < 0.1
        gas = rng.randint(3000000000, 9000000000) if spike else rng.randint(300000000, 1500000000)
        sig = {"mETH_price_eth": price, "gas_price_wei": gas, "vault_balance": 250.0, "risk_metrics": dict()}
        row = {"step": i, "depeg": depeg, "realized_return": ret, "signals": sig}
        series.append(row)
    return series

def backtest(series):
    eq_strat = 1.0
    eq_base = 1.0
    peak = 1.0
    max_dd = 0.0
    counts = {"emergency_hold": 0, "yield_hold": 0, "execute_rebalance": 0}
    depeg_total = 0
    depeg_protected = 0
    n_payloads = 0
    last_preflight = None
    lat = []
    for row in series:
        state, action, dt_ms = route(row["signals"])
        lat.append(dt_ms)
        counts[action] = counts.get(action, 0) + 1
        ret = row["realized_return"]
        eq_base = eq_base * (1.0 + ret)
        in_market = action == "execute_rebalance"
        eq_strat = eq_strat * (1.0 + (ret if in_market else 0.0))
        if eq_strat > peak:
            peak = eq_strat
        dd = (peak - eq_strat) / peak if peak > 0 else 0.0
        if dd > max_dd:
            max_dd = dd
        if row["depeg"]:
            depeg_total = depeg_total + 1
            if not in_market:
                depeg_protected = depeg_protected + 1
        if in_market:
            sink = io.StringIO()
            with contextlib.redirect_stdout(sink):
                out = rebalance_node(state)
            n_payloads = n_payloads + len(out.get("execution_payload", []))
            if "preflight" in out:
                last_preflight = out["preflight"]
    avg_lat = round(sum(lat) / len(lat), 2) if lat else 0.0
    protect_rate = round(depeg_protected / depeg_total, 4) if depeg_total else 1.0
    result = {"steps": len(series), "action_counts": counts, "final_equity_strategy": round(eq_strat, 4), "final_equity_baseline": round(eq_base, 4), "max_drawdown_strategy": round(max_dd, 4), "depeg_steps": depeg_total, "depeg_protected": depeg_protected, "depeg_protect_rate": protect_rate, "rebalance_payloads": n_payloads, "last_preflight": last_preflight, "avg_validator_latency_ms": avg_lat}
    return result

def executor_smoke():
    signals = {"mETH_price_eth": 1.001, "gas_price_wei": 500000000, "vault_balance": 250.0, "risk_metrics": dict()}
    plan = [{"step": 1, "protocol": "merchant_moe", "action": "deposit"}]
    state = {"market_signals": signals}
    state["ai_decision"] = {"execution_plan": plan}
    sink = io.StringIO()
    with contextlib.redirect_stdout(sink):
        out = rebalance_node(state)
    payload = out.get("execution_payload", [])
    first = payload[0] if payload else None
    return {"payload_len": len(payload), "preflight": out.get("preflight"), "first_payload": first}

def main():
    safety = grade_safety()
    series = synth_series(24, 42)
    bt = backtest(series)
    smoke = executor_smoke()
    safety_pass = sum(1 for r in safety if r["ok"])
    safety_total = len(safety)
    invariants_ok = (safety_pass == safety_total) and (bt["depeg_protect_rate"] == 1.0)
    report = {"safety_cases": safety, "safety_pass": safety_pass, "safety_total": safety_total, "backtest": bt, "executor_smoke": smoke, "invariants_ok": invariants_ok}
    print("=== TALOS EVAL HARNESS ===")
    print("Safety:", safety_pass, "/", safety_total, "passed")
    for r in safety:
        tag = "OK" if r["ok"] else "FAIL"
        print("  [" + tag + "] " + r["name"] + " expected=" + str(r["expected"]) + " actual=" + str(r["actual"]))
    print("Backtest:", bt["steps"], "steps", bt["action_counts"])
    print("Equity strat/base:", bt["final_equity_strategy"], bt["final_equity_baseline"], "maxDD:", bt["max_drawdown_strategy"])
    print("Depeg protect rate:", bt["depeg_protect_rate"], "rebalance payloads:", bt["rebalance_payloads"])
    print("Executor smoke preflight:", smoke["preflight"])
    print("Avg validator latency ms:", bt["avg_validator_latency_ms"])
    print("__EVAL_JSON__:" + json.dumps(report))
    return 0 if invariants_ok else 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
