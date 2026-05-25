from src.agents.orchestrator import app

def run_agent():
    print("--- STARTING TALOS AGENT CORE (NATIVE) ---")
    initial_state = {
        "market_signals": {},
        "risk_scores": {},
        "execution_payload": [],
        "errors": [],
        "next_action": ""
    }
    
    final_output = app.invoke(initial_state)
    
    print("\n--- FINAL AGENT STATE ---")
    print(f"Next Action: {final_output.get('next_action')}")
    print(f"Risk Scores: {final_output.get('risk_scores')}")
    print(f"Payloads: {final_output.get('execution_payload')}")
    print(f"Errors: {final_output.get('errors')}")

if __name__ == "__main__":
    run_agent()

