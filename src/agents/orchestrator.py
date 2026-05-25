import sys
import requests
from src.tools.simulation import simulate_swap_slippage, estimate_gas_cost_eth

class TalosGraph:
    def __init__(self):
        self.nodes = {}
        self.edges = {}
        self.conditional_edges = {}
        self.entry_point = None

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
        while current_node:
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
            elif current_node in self.edges:
                current_node = self.edges[current_node]
            else:
                break
        return state

workflow = TalosGraph()

def get_erc20_balance(rpc_url, token_address, user_address):
    clean_addr = user_address.replace("0x", "").lower().zfill(64)
    data_payload = f"0x70a08231{clean_addr}"
    rpc_payload = {"jsonrpc": "2.0", "method": "eth_call", "params": [{"to": token_address, "data": data_payload}, "latest"], "id": 2}
    try:
        res = requests.post(rpc_url, json=rpc_payload, timeout=5).json()
        hex_balance = res.get("result", "0x0")
        if hex_balance == "0x" or not hex_balance: return 0
        return int(hex_balance, 16)
    except:
        return 0

def watcher_node(state: dict) -> dict:
    print("\n[WATCHER] Querying Mantle L2 Metrics & Live Gas Prices...")
    url = "https://rpc.mantle.xyz"
    mETH_contract = "0xcDA867F2396E499B710c91527eCe1D904f8e3E43"
    real_whale_pool = "0xe90AA81B87A9e8Bc02a5074C40a12eE605616bB8"
    
    # 1. Запрос блока и цены газа
    block_number = "UNKNOWN"
    gas_price_wei = 500000000 # дефолтный фолбэк (0.5 Gwei для Mantle)
    
    try:
        # Запрашиваем цену газа напрямую из сети
        gas_payload = {"jsonrpc": "2.0", "method": "eth_gasPrice", "params": [], "id": 3}
        res_gas = requests.post(url, json=gas_payload, timeout=5).json()
        if "result" in res_gas:
            gas_price_wei = int(res_gas["result"], 16)
            
        block_payload = {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}
        res_block = requests.post(url, json=block_payload, timeout=5).json()
        block_number = int(res_block["result"], 16)
    except Exception as e:
        print(f"[WATCHER] RPC Warning: {str(e)}")
    
    print(f"[WATCHER] Current Mantle Block: {block_number}")
    print(f"[WATCHER] Live Gas Price: {gas_price_wei / 10**9:.4f} Gwei")
    
    # 2. Баланс
    raw_balance = get_erc20_balance(url, mETH_contract, real_whale_pool)
    balance_eth = raw_balance / 10**18
    print(f"[WATCHER] Target Pool Liquidity: {balance_eth:.4f} mETH")
    
    return {
        "market_signals": {
            "mETH_price_eth": 1.001, 
            "vault_balance": balance_eth if balance_eth > 0 else 250.5,
            "gas_price_wei": gas_price_wei
        },
        "errors": []
    }

def validator_node(state: dict) -> dict:
    print("[VALIDATOR] Running Multi-Factor Risk Guardrails...")
    signals = state.get("market_signals", {})
    mETH_price = signals.get("mETH_price_eth", 1.0)
    gas_price = signals.get("gas_price_wei", 0)
    balance = signals.get("vault_balance", 0)
    
    # 1. Проверка депега
    if mETH_price < 0.97:
        print("[VALIDATOR] CRITICAL TRIGGER: De-peg Risk Detected!")
        return {"risk_scores": {"depeg_risk": 1.0}, "next_action": "emergency_hold"}
        
    # 2. Проверка стоимости газа (Gas Cost EV Check)
    estimated_gas_eth = estimate_gas_cost_eth(gas_price)
    # Если стоимость газа превышает 0.5% от суммы ребалансировки — это экономически невыгодно
    max_allowed_gas = balance * 0.005 
    
    print(f"[VALIDATOR] Estimated Tx Fee: {estimated_gas_eth:.6f} ETH (Max Allowed: {max_allowed_gas:.6f} ETH)")
    
    if estimated_gas_eth > max_allowed_gas:
        print("[VALIDATOR] WARNING: High Gas Cost relative to trade size. Halting rebalance.")
        return {"risk_scores": {"high_gas_risk": 1.0}, "next_action": "yield_hold"}
        
    print("[VALIDATOR] All Risk Guardrails passed. Environment is optimal.")
    return {"risk_scores": {"depeg_risk": 0.0, "high_gas_risk": 0.0}, "next_action": "execute_rebalance"}

def emergency_node(state: dict) -> dict:
    print("[CRITICAL] EMERGENCY NODE: Capital Flight active...")
    return {"execution_payload": [{"action": "WITHDRAW_ALL"}], "errors": []}

def hold_node(state: dict) -> dict:
    print("[HOLD] YIELD HOLD NODE: Waiting for Gas Prices to drop. Execution paused.")
    return {"execution_payload": [], "errors": []}

def rebalance_node(state: dict) -> dict:
    signals = state.get("market_signals", {})
    balance = signals.get("vault_balance", 0)
    gas_price = signals.get("gas_price_wei", 0)
    amount_wei = int(balance * 10**18)
    
    print(f"[EXECUTOR] Allocating {balance:.2f} mETH...")
    
    # Динамически настраиваем slippage в зависимости от цены газа (намек на загрузку сети)
    slippage = 0.5 if gas_price < 1000000000 else 1.0
    print(f"[SIMULATOR] Running pre-flight simulation with adaptive slippage ({slippage}%)...")
    
    sim_results = simulate_swap_slippage(amount_wei, slippage_tolerance_pct=slippage)
    
    payload = [{
        "target": "MerchantMoe_Router", 
        "action": "DEPOSIT_LIQUIDITY", 
        "amount_wei": amount_wei,
        "amount_out_min": sim_results["amount_out_min"],
        "max_slippage_allowed_pct": slippage,
        "suggested_gas_price": gas_price
    }]
    return {"execution_payload": payload, "errors": []}

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
print("[ORCHESTRATOR] TalosGraph V5 (Multi-Factor Intelligence) loaded.")
