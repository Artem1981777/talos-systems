"""
TALOS Orchestrator v2.2 Adapter
"""

import os
import sys
import json
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.agents.orchestrator import app as old_app, TalosGraph
from src.agents.orchestrator import watcher_node, validator_node, emergency_node, hold_node, rebalance_node

try:
    from src.agents.consensus_engine_v2 import run_consensus_cycle
    CONSENSUS_AVAILABLE = True
except ImportError:
    CONSENSUS_AVAILABLE = False
    print("[ADAPTER] Consensus engine not available")

try:
    from src.utils.telegram_alerts import check_and_alert
    TELEGRAM_AVAILABLE = True
except ImportError:
    TELEGRAM_AVAILABLE = False
    print("[ADAPTER] Telegram alerts not available")


class TalosGraphV2(TalosGraph):
    def __init__(self):
        super().__init__()
        self.cycle_count = 0
        self.last_hf = 2.0
        print("[ORCHESTRATOR v2.2] Consensus + Alerts adapter loaded")

    def invoke(self, state: dict) -> dict:
        result = super().invoke(state)
        
        # Multi-Agent Consensus
        if CONSENSUS_AVAILABLE:
            try:
                vault_state = self._extract_vault_state(result)
                market_data = self._extract_market_data(result)
                print("\n[CONSENSUS v2.2] Running multi-agent consensus...")
                consensus_result = run_consensus_cycle(vault_state, market_data)
                result["consensus"] = consensus_result.get("consensus", {})
                result["agent_opinions"] = consensus_result.get("agent_opinions", [])
                consensus_decision = result["consensus"].get("final_decision", "HOLD")
                if consensus_decision in ["LIQUIDATE", "EMERGENCY_EXIT"]:
                    print("[CONSENSUS v2.2] CRITICAL override: " + consensus_decision)
                    result["next_action"] = "emergency_hold"
                    result["execution_payload"] = [{"action": consensus_decision, "reason": "Consensus override"}]
            except Exception as e:
                print("[CONSENSUS v2.2] Error: " + str(e))
                result["consensus_error"] = str(e)

        # Telegram Alerts
        if TELEGRAM_AVAILABLE:
            try:
                current_hf = self._extract_health_factor(result)
                vault_state = self._extract_vault_state(result)
                consensus = result.get("consensus")
                self.cycle_count += 1
                print("[ALERTS v2.2] Sending cycle report #" + str(self.cycle_count))
                alerts = check_and_alert(
                    health_factor=current_hf,
                    vault=vault_state,
                    consensus_result=consensus,
                    cycle_num=self.cycle_count
                )
                result["alerts_sent"] = len([a for a in alerts if a.get("ok")])
                print("[ALERTS v2.2] Sent: " + str(result["alerts_sent"]) + " messages")
            except Exception as e:
                print("[ALERTS v2.2] Error: " + str(e))
                result["alerts_error"] = str(e)

        self._save_cycle_to_history(result)
        self.last_hf = self._extract_health_factor(result)
        return result

    def _extract_vault_state(self, state: dict) -> dict:
        signals = state.get("market_signals", {})
        return {
            "meth_balance": signals.get("vault_balance", 250.5),
            "usdc_balance": 4500.0,
            "mnt_balance": 100.0,
            "health_factor": self._extract_health_factor(state),
            "collateral_ratio": 1.6
        }

    def _extract_market_data(self, state: dict) -> dict:
        signals = state.get("market_signals", {})
        return {
            "meth_price": 3000.0,
            "mnt_price": 0.5,
            "volatility_24h": 0.06,
            "trend": "neutral",
            "gas_price_gwei": signals.get("gas_price_wei", 500000000) / 10**9,
            "gas_rebalance": 150000,
            "slippage": 0.005,
            "block_number": signals.get("block_number", "UNKNOWN")
        }

    def _extract_health_factor(self, state: dict) -> float:
        return 1.85

    def _save_cycle_to_history(self, result: dict):
        try:
            history_file = "simulation_history.json"
            entry = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "cycle_count": self.cycle_count,
                "block_number": result.get("market_signals", {}).get("block_number", "UNKNOWN"),
                "health_factor": self._extract_health_factor(result),
                "next_action": result.get("next_action", "UNKNOWN"),
                "consensus": result.get("consensus", {}),
                "alerts_sent": result.get("alerts_sent", 0),
                "execution_payload": result.get("execution_payload", [])
            }
            history = []
            if os.path.exists(history_file):
                with open(history_file, "r") as f:
                    history = json.load(f)
            history.append(entry)
            with open(history_file, "w") as f:
                json.dump(history, f, indent=2)
        except Exception as e:
            print("[HISTORY] Save error: " + str(e))


workflow_v2 = TalosGraphV2()
workflow_v2.add_node("watcher", watcher_node)
workflow_v2.add_node("validator", validator_node)
workflow_v2.add_node("emergency_hold", emergency_node)
workflow_v2.add_node("yield_hold", hold_node)
workflow_v2.add_node("execute_rebalance", rebalance_node)
workflow_v2.set_entry_point("watcher")
workflow_v2.add_edge("watcher", "validator")
workflow_v2.add_conditional_edges(
    "validator",
    lambda state: state["next_action"],
    {
        "emergency_hold": "emergency_hold",
        "yield_hold": "yield_hold",
        "execute_rebalance": "execute_rebalance"
    }
)

app_v2 = workflow_v2.compile()
print("[ORCHESTRATOR v2.2] Adapter compiled. Features: Consensus + Telegram + History")
