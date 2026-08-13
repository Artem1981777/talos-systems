import os
import sys
import json
from datetime import datetime

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.agents.orchestrator import app


def save_log_to_json(state: dict, filepath: str = "simulation_history.json"):
    """Save execution history to JSON file"""
    signals = state.get("market_signals", {})
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "symbol": signals.get("symbol"),
        "price": signals.get("price"),
        "portfolio_value_usd": signals.get("portfolio_value_usd"),
        "volatility": signals.get("volatility"),
        "next_action": state.get("next_action"),
        "risk_scores": state.get("risk_scores", {}),
        "ai_decision": state.get("ai_decision", {}),
        "guardian": state.get("guardian", {}),
        "payloads": state.get("execution_payload", []),
    }
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                history = json.load(f)
            if not isinstance(history, list):
                history = []
        except Exception:
            history = []
    else:
        history = []

    history.append(log_entry)
    if len(history) > 50:
        history = history[-50:]

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2, ensure_ascii=False)
    print(f"[LOGGER] Execution entry saved to {filepath}")


if __name__ == "__main__":
    print("--- STARTING TALOS AGENT CORE (SoSoValue) ---")
    print("AI Engine: Multi-provider LLM with fallback")
    print("Data: SoSoValue OpenAPI (price + indices + news)")
    print("Risk: VaR + Kelly Criterion + Sharpe Ratio")
    print("Safety: off-chain human-veto Guardian")
    print("-" * 50)

    initial_state = {
        "market_signals": {},
        "risk_scores": {},
        "next_action": "watcher",
        "execution_payload": [],
        "errors": [],
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
        print(f"\n__FINAL_JSON_OUTPUT__:{json.dumps(final_state, default=str)}")

    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
