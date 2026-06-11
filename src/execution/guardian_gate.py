"""TALOS GuardianModule read-only gate (P0).
Consults on-chain canExecute(amountWei, pegE18) before (simulated) execution.
requests-only JSON-RPC, no new deps. Env-gated and offline-safe:
no MANTLE_GUARDIAN_ADDR -> enabled False, allowed True (skip).
fail-closed: addr set but RPC missing or revert -> allowed False.
"""
import os

CAN_EXECUTE_SELECTOR = "0x2ba29217"

def _enc_uint(value):
    return format(int(value), "064x")

def guardian_check(amount_wei, peg_e18, rpc_url=None, address=None):
    addr = address or os.environ.get("MANTLE_GUARDIAN_ADDR")
    result = dict()
    result["enabled"] = False
    result["allowed"] = True
    result["address"] = addr
    result["reason"] = "MANTLE_GUARDIAN_ADDR not set"
    if not addr:
        return result
    result["enabled"] = True
    url = rpc_url or os.environ.get("MANTLE_SEPOLIA_RPC_URL", "")
    if not url:
        result["allowed"] = False
        result["reason"] = "no rpc url configured"
        return result
    import requests
    data = CAN_EXECUTE_SELECTOR + _enc_uint(amount_wei) + _enc_uint(peg_e18)
    call = dict()
    call["to"] = addr
    call["data"] = data
    payload = dict()
    payload["jsonrpc"] = "2.0"
    payload["method"] = "eth_call"
    payload["params"] = [call, "latest"]
    payload["id"] = 7
    try:
        res = requests.post(url, json=payload, timeout=5).json()
        raw = res.get("result", "0x")
        ok = isinstance(raw, str) and raw.rstrip().endswith("1")
        result["allowed"] = ok
        result["reason"] = "canExecute=true" if ok else "canExecute=false"
    except Exception as e:
        result["allowed"] = False
        result["reason"] = "rpc_error:" + str(e)[:80]
    return result
