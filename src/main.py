import os
import sys
import json
from datetime import datetime

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.agents.orchestrator import app

def save_log_to_json(state: dict, filepath: str = "simulation_history.json"):
    """Save execution history to JSON file"""
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "block_number": state.get("market_signals", {}).get("block_number", "UNKNOWN"),
        "gas_price_gwei": state.get("market_signals", {}).get("gas_price_wei", 0) / 10**9,
        "vault_balance_mETH": state.get("market_signals", {}).get("vault_balance", 0),
        "next_action": state.get("next_action"),
        "risk_scores": state.get("risk_scores", {}),
        "ai_decision": state.get("ai_decision", {}),
        "payloads": state.get("execution_payload", [])
    }

    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                history = json.load(f)
                if not isinstance(history, list):
                    history = []
        except:
            history = []
    else:
        history = []

    history.append(log_entry)

    # Keep last 50 entries for optimization
    if len(history) > 50:
        history = history[-50:]

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2, ensure_ascii=False)
    print(f"[LOGGER] Execution entry saved to {filepath}")

if __name__ == "__main__":
    print("--- STARTING TALOS AGENT CORE v2.0 ---")
    print("AI Engine: Multi-provider LLM with fallback")
    print("Memory: Short-term (diskcache) + Long-term (JSON)")
    print("Risk: VaR + Kelly Criterion + Sharpe Ratio")
    print("-" * 50)

    initial_state = {
        "market_signals": {},
        "risk_scores": {},
        "next_action": "watcher",
        "execution_payload": [],
        "errors": []
    }

    try:
        final_state = app.invoke(initial_state)
        
        print("\n" + "=" * 50)
        print("--- FINAL AGENT STATE ---")
        print(f"Next Action: {final_state.get('next_action')}")
        print(f"Risk Scores: {final_state.get('risk_scores')}")
        print(f"AI Decision: {final_state.get('ai_decision', {}).get('action', 'N/A')}")
        print(f"Payloads: {len(final_state.get('execution_payload', []))} items")
        print(f"Errors: {final_state.get('errors', [])}")
        
        save_log_to_json(final_state)
        
        # Output final state as JSON for API integration
        print(f"\n__FINAL_JSON_OUTPUT__:{json.dumps(final_state, default=str)}")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
