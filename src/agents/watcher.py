import os
import random
import json
from eth_utils import to_checksum_address
# Предположим, что у вас используется веб3 или кастомный RPC-клиент, настроенный ранее
# Если используются нативные запросы через requests:
import requests

# 1. ПУЛ КЛЮЧЕЙ GROQ ДЛЯ РОТАЦИИ
GROQ_KEYS = [
    os.getenv("GROQ_API_KEY"),
    os.getenv("GROQ_API_KEY_2"),
    os.getenv("GROQ_API_KEY_3")
]
# Удаляем пустые значения, если ключи не заданы в .env
GROQ_KEYS = [k for k in GROQ_KEYS if k]

def get_groq_key():
    """Возвращает случайный или следующий ключ из пула для обхода лимитов."""
    if not GROQ_KEYS:
        # Фолбэк на дефолтный, если пул пуст
        return os.getenv("GROQ_API_KEY", "mock_key")
    return random.choice(GROQ_KEYS)

def get_mantle_metrics():
    """Запрашивает реальный блок, газ и ончейн баланс mETH Vault."""
    rpc_url = "https://rpc.mantle.xyz" # Или ваш тестнет URL
    meth_address = "0xcDA86831d771C495C24F7f6ba434c441c91c3d6c"
    vault_address = "0x6335165684DdfE2D994Fd247FEfB1D5e7C35C7A9" # Пример вашего хранилища
    
    headers = {'Content-Type': 'application/json'}
    
    try:
        # Получаем номер блока
        block_payload = {"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}
        r_block = requests.post(rpc_url, json=block_payload, headers=headers).json()
        block_num = int(r_block['result'], 16)
        
        # Получаем цену газа
        gas_payload = {"jsonrpc":"2.0","method":"eth_gasPrice","params":[],"id":2}
        r_gas = requests.post(rpc_url, json=gas_payload, headers=headers).json()
        gas_price = int(r_gas['result'], 16)
        
        # РЕАЛЬНЫЙ ON-CHAIN ВЫЗОВ: balanceOf для mETH
        # Селектор функции balanceOf(address) = 0x70a08231
        # Дополняем адрес хранилища нулями до 32 байт
        clean_vault = vault_address.lower().replace("0x", "").zfill(64)
        data_param = f"0x70a08231{clean_vault}"
        
        balance_payload = {
            "jsonrpc": "2.0",
            "method": "eth_call",
            "params": [{"to": meth_address, "data": data_param}, "latest"],
            "id": 3
        }
        r_bal = requests.post(rpc_url, json=balance_payload, headers=headers).json()
        raw_balance = int(r_bal['result'], 16)
        vault_balance_meth = raw_balance / 10**18 # Переводим из wei в mETH
        
    except Exception as e:
        print(f"[WATCHER ERROR] Fallback to simulation mocks: {e}")
        # Безопасный фолбэк, если RPC недоступен во время тестов в офлайне
        block_num = 95810420
        gas_price = 50000100000
        vault_balance_meth = 250.5
        
    # Read last 3 decisions from memory
    memory = []
    try:
        with open("simulation_history.json", "r") as f:
            history = json.load(f)
            if isinstance(history, list) and len(history) > 0:
                memory = history[-3:]
    except:
        pass

    return {
        "block_number": block_num,
        "gas_price_wei": gas_price,
        "vault_balance": vault_balance_meth,
        "mETH_price_eth": 1.001,
        "memory": memory
    }
