"""
TALOS Orchestrator v2.1
Integrates ReAct Agent + Allora Network for decentralized reputation
"""

import os
import sys
import json
import time
from typing import Dict, List, Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.ai.llm_manager import get_llm_manager
from src.ai.memory import get_memory, MemoryEntry
from src.ai.risk_engine import get_risk_engine, RiskMetrics
from src.ai.react_agent import get_react_agent, AgentDecision
from src.integrations.allora import get_allora_client

from src.tools.simulation import simulate_swap_slippage, estimate_gas_cost_eth


class TalosGraph:
    """Enhanced state machine with AI + Allora reputation"""
    
    def __init__(self):
        self.nodes = {}
        self.edges = {}
        self.conditional_edges = {}
        self.entry_point = None
        
        # Initialize AI components
        self.llm = get_llm_manager()
        self.memory = get_memory()
        self.risk_engine = get_risk_engine()
        self.react_agent = get_react_agent()
        self.allora = get_allora_client()
        
        print("[ORCHESTRATOR] TALOS v2.1 AI + Allora Engine initialized")
        print(f"[ORCHESTRATOR] LLM Providers: {list(self.llm.PROVIDERS.keys())}")
        print(f"[ORCHESTRATOR] Allora: {'Mock' if self.allora.use_mock else 'Real'} mode")

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


def assert_chain_id(rpc_url: str):
    import requests
    payload = {"jsonrpc": "2.0", "method": "eth_chainId", "params": [], "id": 0}
    res = requests.post(rpc_url, json=payload, timeout=5).json()
    chain_hex = res.get("result", "0x0")
    chain_id = int(chain_hex, 16) if isinstance(chain_hex, str) else 0
    if chain_id != 5003:
        raise Exception(f"Wrong chainId: expected 5003 (Mantle Sepolia), got {chain_id} ({chain_hex})")


def get_erc20_balance(rpc_url, token_address, user_address):
    import requests
    clean_addr = user_address.replace("0x", "").lower().zfill(64)
    data_payload = f"0x70a08231{clean_addr}"
    rpc_payload = {
        "jsonrpc": "2.0",
        "method": "eth_call",
        "params": [{"to": token_address, "data": data_payload}, "latest"],
        "id": 2
    }
    try:
        res = requests.post(rpc_url, json=rpc_payload, timeout=5).json()
        hex_balance = res.get("result", "0x0")
        if hex_balance == "0x" or not hex_balance:
            return 0
        return int(hex_balance, 16)
    except:
        return 0


def watcher_node(state: dict) -> dict:
    print("\n[WATCHER v2.1] Querying Mantle L2 Metrics & Live Gas Prices...")
    
    url = os.getenv("MANTLE_SEPOLIA_RPC_URL", "https://rpc.sepolia.mantle.xyz")
    mETH_contract = "0xcDA867F2396E499B710c91527eCe1D904f8e3E43"
    real_whale_pool = "0xe90AA81B87A9e8Bc02a5074C40a12eE605616bB8"

    block_number = "UNKNOWN"
    gas_price_wei = 500000000
    vault_balance_meth = 250.5

    try:
        import requests
        
        gas_payload = {"jsonrpc": "2.0", "method": "eth_gasPrice", "params": [], "id": 3}
        res_gas = requests.post(url, json=gas_payload, timeout=5).json()
        if "result" in res_gas:
            gas_price_wei = int(res_gas["result"], 16)

        block_payload = {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}
        res_block = requests.post(url, json=block_payload, timeout=5).json()
        block_number = int(res_block["result"], 16)
        
        raw_balance = get_erc20_balance(url, mETH_contract, real_whale_pool)
        balance_eth = raw_balance / 10**18
        vault_balance_meth = balance_eth if balance_eth > 0 else 250.5
        
    except Exception as e:
        print(f"[WATCHER] RPC Warning: {str(e)}")

    print(f"[WATCHER] Current Mantle Block: {block_number}")
    print(f"[WATCHER] Live Gas Price: {gas_price_wei / 10**9:.4f} Gwei")
    print(f"[WATCHER] Target Pool Liquidity: {vault_balance_meth:.4f} mETH")

    # Calculate risk metrics
    risk_engine = get_risk_engine()
    risk_metrics = risk_engine.calculate_all_metrics(
        health_factor=1.85,
        total_collateral=vault_balance_meth,
        total_debt=vault_balance_meth * 0.5,
        current_apy=8.5,
        market_volatility=0.15,
        gas_price_gwei=gas_price_wei / 10**9
    )
    
    print(risk_engine.format_risk_report(risk_metrics))

    # Store observation in memory
    memory = get_memory()
    memory.store(MemoryEntry(
        id=f"obs_{int(time.time())}",
        timestamp=time.time(),
        type="observation",
        content=f"Block {block_number}, Gas {gas_price_wei/10**9:.4f} Gwei, Balance {vault_balance_meth:.2f} mETH",
        metadata={
            "block_number": block_number,
            "gas_price_wei": gas_price_wei,
            "vault_balance": vault_balance_meth,
            "risk_score": risk_metrics.risk_score
        },
        importance=0.5
    ))

    return {
        "market_signals": {
            "mETH_price_eth": 1.001,
            "vault_balance": vault_balance_meth,
            "gas_price_wei": gas_price_wei,
            "block_number": block_number,
            "risk_metrics": {
                "risk_score": risk_metrics.risk_score,
                "liquidation_probability": risk_metrics.liquidation_probability,
                "recommended_action": risk_metrics.recommended_action,
                "var_95": risk_metrics.value_at_risk_95,
                "kelly_fraction": risk_metrics.kelly_fraction
            }
        },
        "errors": []
    }


def validator_node(state: dict) -> dict:
    print("\n[VALIDATOR v2.1] Running AI-Powered Risk Assessment + Allora Reputation...")
    
    signals = state.get("market_signals", {})
    risk_metrics = signals.get("risk_metrics", {})
    
    # Quick guardrails
    mETH_price = signals.get("mETH_price_eth", 1.0)
    gas_price = signals.get("gas_price_wei", 0)
    balance = signals.get("vault_balance", 0)
    
    if mETH_price < 0.97:
        print("[VALIDATOR] CRITICAL TRIGGER: De-peg Risk Detected!")
        return {
            "risk_scores": {"depeg_risk": 1.0, "ai_confidence": 1.0},
            "next_action": "emergency_hold"
        }
    
    estimated_gas_eth = estimate_gas_cost_eth(gas_price)
    max_allowed_gas = balance * 0.005
    if estimated_gas_eth > max_allowed_gas:
        print("[VALIDATOR] WARNING: High Gas Cost relative to trade size")
        return {
            "risk_scores": {"high_gas_risk": 1.0, "ai_confidence": 0.8},
            "next_action": "yield_hold"
        }
    
    # AI-powered deep analysis via ReAct Agent
    print("[VALIDATOR] Invoking ReAct Agent for deep analysis...")
    
    try:
        agent = get_react_agent()
        
        agent_state = {
            "health_factor": 1.85,
            "total_collateral": balance,
            "total_debt": balance * 0.5,
            "current_apy": 8.5,
            "market_volatility": 0.15,
            "gas_price_gwei": gas_price / 10**9,
            "block_number": signals.get("block_number", "UNKNOWN"),
            "vault_balance": balance
        }
        
        decision = agent.think(agent_state)
        
        # Submit to Allora for reputation verification
        print("[VALIDATOR] Submitting decision to Allora Network...")
        allora = get_allora_client()
        allora_result = allora.submit_inference(
            agent_id="talos_v2_1",
            prediction=decision.confidence,
            metadata={
                "action": decision.action,
                "risk_score": decision.risk_score,
                "expected_roi": decision.expected_roi,
                "timestamp": int(time.time())
            }
        )
        
        # Get Allora reputation
        allora_rep = allora.get_agent_reputation("talos_v2_1")
        print(f"[ALLORA] Reputation: {allora_rep['tier']} (Score: {allora_rep['score']})")
        
        action_map = {
            "HOLD": "yield_hold",
            "REBALANCE": "execute_rebalance",
            "LIQUIDATE": "emergency_hold",
            "FLASH_LOAN_ARB": "execute_rebalance",
            "YIELD_SWITCH": "execute_rebalance",
            "EMERGENCY_EXIT": "emergency_hold"
        }
        
        next_action = action_map.get(decision.action, "yield_hold")
        
        print(f"[VALIDATOR] AI Decision: {decision.action} -> Routing to: {next_action}")
        print(f"[VALIDATOR] Confidence: {decision.confidence*100:.1f}%, Risk: {decision.risk_score:.1f}/100")
        print(f"[VALIDATOR] Allora Consensus: {allora_result.get('consensus_score', 'N/A')}")
        
        return {
            "risk_scores": {
                "ai_confidence": decision.confidence,
                "ai_risk_score": decision.risk_score,
                "ai_expected_roi": decision.expected_roi,
                "ai_reasoning": decision.reasoning[:200],
                "allora_consensus": allora_result.get("consensus_score", 0),
                "allora_reputation": allora_rep.get("score", 0),
                "allora_tier": allora_rep.get("tier", "UNKNOWN")
            },
            "next_action": next_action,
            "ai_decision": {
                "action": decision.action,
                "confidence": decision.confidence,
                "reasoning": decision.reasoning,
                "risk_score": decision.risk_score,
                "expected_roi": decision.expected_roi,
                "execution_plan": decision.execution_plan,
                "simulation_required": decision.simulation_required
            }
        }
        
    except Exception as e:
        print(f"[VALIDATOR] AI Agent failed: {str(e)}")
        print("[VALIDATOR] Falling back to risk engine recommendation...")
        
        recommended = risk_metrics.get("recommended_action", "HOLD")
        action_map = {
            "EMERGENCY_EXIT": "emergency_hold",
            "REBALANCE": "execute_rebalance",
            "HOLD": "yield_hold",
            "YIELD_OPTIMIZE": "execute_rebalance"
        }
        
        return {
            "risk_scores": {
                "ai_confidence": 0.5,
                "ai_risk_score": risk_metrics.get("risk_score", 50),
                "fallback": True
            },
            "next_action": action_map.get(recommended, "yield_hold")
        }


def emergency_node(state: dict) -> dict:
    print("[CRITICAL] EMERGENCY NODE: Capital Flight active...")
    
    memory = get_memory()
    memory.store(MemoryEntry(
        id=f"emergency_{int(time.time())}",
        timestamp=time.time(),
        type="decision",
        content="EMERGENCY_EXIT executed - capital flight mode",
        metadata={"action": "EMERGENCY_EXIT", "trigger": "validator"},
        importance=1.0
    ))
    
    return {
        "execution_payload": [{"action": "WITHDRAW_ALL", "reason": "Emergency"}],
        "errors": []
    }


def hold_node(state: dict) -> dict:
    print("[HOLD] YIELD HOLD NODE: Waiting for better conditions...")
    
    memory = get_memory()
    memory.store(MemoryEntry(
        id=f"hold_{int(time.time())}",
        timestamp=time.time(),
        type="decision",
        content="HOLD - conditions not optimal for rebalancing",
        metadata={"action": "HOLD"},
        importance=0.3
    ))
    
    return {"execution_payload": [], "errors": []}


def rebalance_node(state: dict) -> dict:
    signals = state.get("market_signals", {})
    balance = signals.get("vault_balance", 0)
    gas_price = signals.get("gas_price_wei", 0)
    ai_decision = state.get("ai_decision", {})
    
    amount_wei = int(balance * 10**18)
    
    print(f"[EXECUTOR] AI-planned rebalancing: {balance:.2f} mETH")
    
    execution_plan = ai_decision.get("execution_plan", [])
    if execution_plan:
        print(f"[EXECUTOR] Using AI execution plan ({len(execution_plan)} steps)")
        for step in execution_plan:
            print(f"  Step {step.get('step', '?')}: {step.get('action', '?')} on {step.get('protocol', '?')}")
    
    slippage = 0.5 if gas_price < 1000000000 else 1.0
    print(f"[SIMULATOR] Running pre-flight simulation with adaptive slippage ({slippage}%)...")
    
    sim_results = simulate_swap_slippage(amount_wei, slippage_tolerance_pct=slippage)
    
    payload = [{
        "target": "MerchantMoe_Router",
        "action": "DEPOSIT_LIQUIDITY",
        "amount_wei": amount_wei,
        "amount_out_min": sim_results["amount_out_min"],
        "max_slippage_allowed_pct": slippage,
        "suggested_gas_price": gas_price,
        "ai_planned": bool(execution_plan)
    }]
    
    memory = get_memory()
    memory.store(MemoryEntry(
        id=f"exec_{int(time.time())}",
        timestamp=time.time(),
        type="decision",
        content=f"REBALANCE executed: {balance:.2f} mETH, slippage {slippage}%",
        metadata={
            "action": "REBALANCE",
            "amount": balance,
            "slippage": slippage,
            "gas_price": gas_price
        },
        importance=0.8
    ))
    
    return {"execution_payload": payload, "errors": []}


# Build workflow
workflow = TalosGraph()

workflow.add_node("watcher", watcher_node)
workflow.add_node("validator", validator_node)
workflow.add_node("emergency_hold", emergency_node)
workflow.add_node("yield_hold", hold_node)
workflow.add_node("execute_rebalance", rebalance_node)

workflow.set_entry_point("watcher")
workflow.add_edge("watcher", "validator")

workflow.add_conditional_edges(
    "validator",
    lambda state: state["next_action"],
    {
        "emergency_hold": "emergency_hold",
        "yield_hold": "yield_hold",
        "execute_rebalance": "execute_rebalance"
    }
)

app = workflow.compile()
print("[ORCHESTRATOR] TALOS v2.1 Graph compiled successfully.")
print("[ORCHESTRATOR] Nodes: WATCHER -> VALIDATOR -> [EMERGENCY|HOLD|REBALANCE]")
print("[ORCHESTRATOR] Allora: Decentralized reputation verification enabled")
