"""
TALOS Orchestrator (SoSoValue edition).

State machine: WATCHER -> VALIDATOR -> [EMERGENCY | HOLD | EXECUTE_TRADE].
All market intelligence comes from SoSoValue (price, indices, news).
No external chain RPC, no third-party oracle, no mocked market data. Execution is off-chain
(paper) and gated by a human-veto Guardian.
"""

import os
import sys
import json
import time
from typing import Dict, List, Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.ai.llm_manager import get_llm_manager
from src.ai.memory import get_memory, MemoryEntry
from src.ai.risk_engine import get_risk_engine
from src.ai.react_agent import get_react_agent, AgentDecision
from src.integrations.sosovalue import get_sosovalue_client, SosoValueError
from src import config
from src.execution.guardian_gate import guardian_check
from src.execution.simulator import plan_trade

# A spot treasury has no leverage, so liquidation risk is ~0. We still feed the
# risk engine so VaR/Kelly/Sharpe are computed from REAL market volatility.
SPOT_HEALTH_FACTOR = 2.0


class TalosGraph:
    """Lightweight state machine (same engine, SoSoValue-only nodes)"""

    def __init__(self):
        self.nodes = {}
        self.edges = {}
        self.conditional_edges = {}
        self.entry_point = None

        self.llm = get_llm_manager()
        self.memory = get_memory()
        self.risk_engine = get_risk_engine()
        self.react_agent = get_react_agent()

        print("[ORCHESTRATOR] TALOS SoSoValue Engine initialized")
        print(f"[ORCHESTRATOR] LLM Providers: {list(self.llm.PROVIDERS.keys())}")
        print(f"[ORCHESTRATOR] Data source: SoSoValue OpenAPI")

    def add_node(self, name, func):
        self.nodes[name] = func

    def set_entry_point(self, name):
        self.entry_point = name

    def add_edge(self, source, target):
        self.edges[source] = target

    def add_conditional_edges(self, source_node, router_func, mapping):
        self.conditional_edges[source_node] = (router_func, mapping)

    def compile(self):
        return self

    def invoke(self, state: dict) -> dict:
        current_node = self.entry_point
        iteration = 0
        max_iterations = 10

        while current_node and iteration < max_iterations:
            print(f"\n[ORCHESTRATOR] >>> Node: {current_node} (iteration {iteration + 1})")
            updates = self.nodes[current_node](state)

            for k, v in updates.items():
                if isinstance(state.get(k), list) and isinstance(v, list):
                    state[k] = state[k] + v
                elif isinstance(state.get(k), dict) and isinstance(v, dict):
                    state[k] = {**state[k], **v}
                else:
                    state[k] = v

            if current_node in self.conditional_edges:
                router_func, mapping = self.conditional_edges[current_node]
                next_action = router_func(state)
                current_node = mapping.get(next_action)
                print(f"[ORCHESTRATOR] Conditional route: {next_action} -> {current_node}")
            elif current_node in self.edges:
                current_node = self.edges[current_node]
                print(f"[ORCHESTRATOR] Edge route: -> {current_node}")
            else:
                print(f"[ORCHESTRATOR] No outgoing edges, terminating")
                break

            iteration += 1

        if iteration >= max_iterations:
            print("[ORCHESTRATOR] WARNING: Max iterations reached, forcing termination")
            state["errors"] = state.get("errors", []) + ["Max iterations reached"]

        return state


def _price_and_market(client, symbol):
    """Real price + market data for one symbol; raises on missing data."""
    market = client.get_market_data(symbol)
    price = market.get("price")
    if not price or price <= 0:
        raise SosoValueError(f"no price for {symbol}")
    return price, market


def _portfolio_value(client, portfolio):
    """Compute real USD value of the holdings using live SoSoValue prices."""
    total = 0.0
    breakdown = {}
    for sym, qty in portfolio.items():
        price, _ = _price_and_market(client, sym)
        value = price * qty
        breakdown[sym] = {"qty": qty, "price": price, "value_usd": value}
        total += value
    return total, breakdown


def watcher_node(state: dict) -> dict:
    print("\n[WATCHER] Pulling live SoSoValue market intelligence...")
    client = get_sosovalue_client()
    symbol = config.DEFAULT_SYMBOL

    market = client.get_market_data(symbol)
    portfolio = config.get_portfolio()
    portfolio_value, breakdown = _portfolio_value(client, portfolio)

    try:
        index = client.get_index_snapshot(config.DEFAULT_INDEX)
    except SosoValueError as e:
        index = {"ticker": config.DEFAULT_INDEX, "error": str(e)}

    try:
        news = client.get_news(category=config.NEWS_CATEGORY, page_size=5)
        headlines = [n.get("title") for n in news]
    except SosoValueError as e:
        headlines = []

    volatility = market.get("volatility") or 0.0
    change_24h = market.get("change_pct_24h") or 0.0

    risk_engine = get_risk_engine()
    risk = risk_engine.calculate_all_metrics(
        health_factor=SPOT_HEALTH_FACTOR,
        total_collateral=portfolio_value,
        total_debt=0.0,
        current_apy=change_24h * 100.0,
        market_volatility=volatility,
        gas_price_gwei=0.0,
    )
    print(risk_engine.format_risk_report(risk))
    print(f"[WATCHER] {symbol} @ ${market.get('price')}, portfolio ${portfolio_value:,.2f}")

    memory = get_memory()
    memory.store(MemoryEntry(
        id=f"obs_{int(time.time())}",
        timestamp=time.time(),
        type="observation",
        content=f"{symbol} price {market.get('price')}, vol {volatility:.4f}, portfolio ${portfolio_value:,.2f}",
        metadata={
            "symbol": symbol,
            "price": market.get("price"),
            "portfolio_value": portfolio_value,
            "risk_score": risk.risk_score,
        },
        importance=0.5,
    ))

    return {
        "market_signals": {
            "symbol": symbol,
            "price": market.get("price"),
            "change_pct_24h": change_24h,
            "volatility": volatility,
            "turnover_24h": market.get("turnover_24h"),
            "portfolio_value_usd": portfolio_value,
            "portfolio_breakdown": breakdown,
            "index": index,
            "news_headlines": headlines,
            "market_data": market,
            "risk_metrics": {
                "risk_score": risk.risk_score,
                "var_95": risk.value_at_risk_95,
                "kelly_fraction": risk.kelly_fraction,
                "sharpe_ratio": risk.sharpe_ratio,
                "liquidation_probability": risk.liquidation_probability,
                "recommended_action": risk.recommended_action,
            },
        },
        "errors": [],
    }


def validator_node(state: dict) -> dict:
    print("\n[VALIDATOR] Running AI-powered analysis on live SoSoValue data...")
    signals = state.get("market_signals", {})
    risk_metrics = signals.get("risk_metrics", {})
    change_24h = signals.get("change_pct_24h", 0.0)
    portfolio_value = signals.get("portfolio_value_usd", 0.0)

    # Hard guardrail on a real crash signal (>15% daily drop)
    if change_24h is not None and change_24h <= -0.15:
        print("[VALIDATOR] CRITICAL: >15% 24h drawdown detected -> emergency")
        return {
            "risk_scores": {"crash_risk": 1.0, "ai_confidence": 1.0},
            "next_action": "emergency_hold",
        }

    print("[VALIDATOR] Invoking ReAct Agent for deep analysis...")
    try:
        agent = get_react_agent()
        agent_state = {
            "symbol": signals.get("symbol"),
            "price": signals.get("price"),
            "change_pct_24h": change_24h,
            "market_volatility": signals.get("volatility"),
            "health_factor": SPOT_HEALTH_FACTOR,
            "total_collateral": portfolio_value,
            "total_debt": 0.0,
            "current_apy": (change_24h or 0.0) * 100.0,
            "portfolio_breakdown": signals.get("portfolio_breakdown", {}),
            "index": signals.get("index", {}),
            "news_headlines": signals.get("news_headlines", []),
        }

        decision = agent.think(agent_state)

        action_map = {
            "HOLD": "yield_hold",
            "BUY": "execute_trade",
            "SELL": "execute_trade",
            "REBALANCE": "execute_trade",
            "EMERGENCY_EXIT": "emergency_hold",
            # risk-engine fallback vocabulary:
            "YIELD_OPTIMIZE": "yield_hold",
            "LIQUIDATE": "emergency_hold",
        }
        next_action = action_map.get(decision.action, "yield_hold")

        print(f"[VALIDATOR] AI Decision: {decision.action} -> {next_action}")
        print(f"[VALIDATOR] Confidence: {decision.confidence*100:.1f}%, Risk: {decision.risk_score:.1f}/100")

        return {
            "risk_scores": {
                "ai_confidence": decision.confidence,
                "ai_risk_score": decision.risk_score,
                "ai_expected_roi": decision.expected_roi,
                "ai_reasoning": decision.reasoning[:200],
            },
            "next_action": next_action,
            "ai_decision": {
                "action": decision.action,
                "confidence": decision.confidence,
                "reasoning": decision.reasoning,
                "risk_score": decision.risk_score,
                "expected_roi": decision.expected_roi,
                "execution_plan": decision.execution_plan,
                "simulation_required": decision.simulation_required,
            },
        }

    except Exception as e:
        print(f"[VALIDATOR] AI Agent failed: {str(e)}")
        print("[VALIDATOR] Falling back to risk engine recommendation...")
        recommended = risk_metrics.get("recommended_action", "HOLD")
        action_map = {
            "EMERGENCY_EXIT": "emergency_hold",
            "LIQUIDATE": "emergency_hold",
            "REBALANCE": "execute_trade",
            "HOLD": "yield_hold",
            "YIELD_OPTIMIZE": "yield_hold",
        }
        return {
            "risk_scores": {
                "ai_confidence": 0.5,
                "ai_risk_score": risk_metrics.get("risk_score", 50),
                "fallback": True,
            },
            "next_action": action_map.get(recommended, "yield_hold"),
        }


def emergency_node(state: dict) -> dict:
    print("[CRITICAL] EMERGENCY NODE: move to stables / exit risk...")
    memory = get_memory()
    memory.store(MemoryEntry(
        id=f"emergency_{int(time.time())}",
        timestamp=time.time(),
        type="decision",
        content="EMERGENCY_EXIT recommended - exit risk",
        metadata={"action": "EMERGENCY_EXIT", "trigger": "validator"},
        importance=1.0,
    ))
    return {
        "execution_payload": [{"action": "EXIT_TO_STABLES", "reason": "Emergency", "requires_human_approval": True}],
        "errors": [],
    }


def hold_node(state: dict) -> dict:
    print("[HOLD] Conditions not favourable for a trade. Monitoring...")
    memory = get_memory()
    memory.store(MemoryEntry(
        id=f"hold_{int(time.time())}",
        timestamp=time.time(),
        type="decision",
        content="HOLD - conditions not optimal for a trade",
        metadata={"action": "HOLD"},
        importance=0.3,
    ))
    return {"execution_payload": [], "errors": []}


def execute_trade_node(state: dict) -> dict:
    signals = state.get("market_signals", {})
    ai_decision = state.get("ai_decision", {})
    portfolio_value = signals.get("portfolio_value_usd", 0.0)
    symbol = signals.get("symbol")
    market = signals.get("market_data", {})
    risk_score = signals.get("risk_metrics", {}).get("risk_score", 0.0)

    side = ai_decision.get("action", "BUY")
    target_symbol = symbol
    size_pct = config.MAX_TRADE_PCT

    plan = ai_decision.get("execution_plan", [])
    if plan:
        step = plan[0]
        try:
            size_pct = float(step.get("size_pct", size_pct))
        except (TypeError, ValueError):
            pass
        side = step.get("action", side)
        target_symbol = step.get("symbol", symbol)

    size_pct = max(0.0, min(size_pct, config.MAX_TRADE_PCT))
    notional = portfolio_value * size_pct / 100.0

    # [SAFETY] off-chain Guardian gate (human-veto)
    g = guardian_check(notional, portfolio_value, risk_score)
    print("[GUARDIAN]", "ALLOW" if g["allowed"] else "BLOCK", g["reason"])
    if not g["allowed"]:
        return {"execution_payload": [], "errors": ["guardian_blocked:" + g["reason"]], "guardian": g}

    client = get_sosovalue_client()
    try:
        target_market = market if target_symbol == symbol else client.get_market_data(target_symbol)
    except SosoValueError as e:
        return {"execution_payload": [], "errors": ["market_data_error:" + str(e)], "guardian": g}

    tp = plan_trade(target_symbol, side, notional, target_market)
    print(f"[PLANNER] {side} {target_symbol} ${notional:,.2f} ~ {tp.est_units:.6f} units, slippage ~{tp.est_slippage_pct}%")

    payload = [{
        "symbol": target_symbol,
        "side": side,
        "notional_usd": notional,
        "est_price": tp.est_price,
        "est_units": tp.est_units,
        "est_slippage_pct": tp.est_slippage_pct,
        "planned": tp.ok,
        "reason": tp.reason,
        "requires_human_approval": True,
    }]

    memory = get_memory()
    memory.store(MemoryEntry(
        id=f"exec_{int(time.time())}",
        timestamp=time.time(),
        type="decision",
        content=f"{side} {target_symbol} ${notional:,.2f} (slippage ~{tp.est_slippage_pct}%)",
        metadata={"action": side, "symbol": target_symbol, "notional_usd": notional},
        importance=0.8,
    ))

    return {"execution_payload": payload, "errors": [], "guardian": g}


# Build workflow
workflow = TalosGraph()

workflow.add_node("watcher", watcher_node)
workflow.add_node("validator", validator_node)
workflow.add_node("emergency_hold", emergency_node)
workflow.add_node("yield_hold", hold_node)
workflow.add_node("execute_trade", execute_trade_node)

workflow.set_entry_point("watcher")
workflow.add_edge("watcher", "validator")

workflow.add_conditional_edges(
    "validator",
    lambda state: state["next_action"],
    {
        "emergency_hold": "emergency_hold",
        "yield_hold": "yield_hold",
        "execute_trade": "execute_trade",
    },
)

app = workflow.compile()
print("[ORCHESTRATOR] TALOS SoSoValue Graph compiled successfully.")
print("[ORCHESTRATOR] Nodes: WATCHER -> VALIDATOR -> [EMERGENCY|HOLD|EXECUTE_TRADE]")
