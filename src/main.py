import json
import os
from datetime import datetime
from src.agents.orchestrator import app

def save_log_to_json(state: dict, filepath: str = "simulation_history.json"):
    """Сохраняет ключевые метрики и payload симуляции в JSON-файл истории."""
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "block_number": state.get("market_signals", {}).get("block_number", "UNKNOWN"),
        "gas_price_gwei": state.get("market_signals", {}).get("gas_price_wei", 0) / 10**9,
        "vault_balance_mETH": state.get("market_signals", {}).get("vault_balance", 0),
        "next_action": state.get("next_action"),
        "risk_scores": state.get("risk_scores", {}),
        "payloads": state.get("execution_payload", [])
    }
    
    # Читаем старые логи, если файл существует
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                history = json.load(f)
                if not isinstance(history, list): history = []
        except:
            history = []
    else:
        history = []
        
    history.append(log_entry)
    
    # Ограничиваем историю последними 50 записями для оптимизации памяти на Android
    if len(history) > 50:
        history = history[-50:]
        
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2, ensure_ascii=False)
    print(f"[LOGGER] Execution entry successfully appended to {filepath}")

if __name__ == "__main__":
    print("--- STARTING TALOS AGENT CORE (NATIVE) ---")
    
    # Инициализируем стартовый стейт
    initial_state = {
        "market_signals": {},
        "risk_scores": {},
        "next_action": "watcher",
        "execution_payload": [],
        "errors": []
    }
    
    # Запускаем граф агента
    final_state = app.invoke(initial_state)
    
    print("\n--- FINAL AGENT STATE ---")
    print(f"Next Action: {final_state.get('next_action')}")
    print(f"Risk Scores: {final_state.get('risk_scores')}")
    print(f"Payloads: {final_state.get('execution_payload')}")
    print(f"Errors: {final_state.get('errors')}")
    
    # Сохраняем в историю
    save_log_to_json(final_state)
    
    # Для интеграции с TS выводим финальный стейт ОДНОЙ СТРОКОЙ в самом конце
    print(f"__FINAL_JSON_OUTPUT__:{json.dumps(final_state)}")
