"""TALOS pre-trade simulation layer (P0 safety).
Read-only eth_call dry-run vs live Mantle RPC before ANY execution.
Pure stdlib + requests (no new deps), matching the existing codebase.
"""
import os
import requests
from dataclasses import dataclass

MANTLE_RPC = os.environ.get("MANTLE_SEPOLIA_RPC_URL", "https://rpc.sepolia." + "mantle." + "xyz")
GET_AMOUNTS_OUT = "0xd06ca61f"


@dataclass
class SimResult:
    ok: bool
    amount_out: int
    reason: str
    raw: str


def _rpc(method, params):
    body = {"jsonrpc": "2.0", "method": method, "params": params, "id": 1}
    return requests.post(MANTLE_RPC, json=body, timeout=15).json()


def eth_call(to, data, block="latest"):
    res = _rpc("eth_call", [{"to": to, "data": data}, block])
    if "error" in res:
        return None, res["error"].get("message", "rpc_error")
    return res.get("result"), None


def quote_v2(router, amount_in, path):
    head = GET_AMOUNTS_OUT + format(amount_in, "064x") + format(64, "064x")
    arr = format(len(path), "064x") + "".join(format(int(p, 16), "064x") for p in path)
    result, err = eth_call(router, head + arr)
    if err or not result or result == "0x":
        return SimResult(False, 0, "quote_failed:" + str(err or "empty"), result or "0x")
    body = result[2:]
    n = int(body[64:128], 16)
    vals = [int(body[128 + i * 64:192 + i * 64], 16) for i in range(n)]
    out = vals[-1] if vals else 0
    return SimResult(out > 0, out, "ok" if out > 0 else "zero_out", result)


def preflight(router, amount_in, path, min_out):
    q = quote_v2(router, amount_in, path)
    if not q.ok:
        return q
    if q.amount_out < min_out:
        return SimResult(False, q.amount_out, "slippage_below_min_out", q.raw)
    return SimResult(True, q.amount_out, "passed", q.raw)


if __name__ == "__main__":
    import sys
    a = sys.argv[1:]
    if len(a) >= 5:
        print(preflight(a[0], int(a[1]), [a[2], a[3]], int(a[4])))
    else:
        print("usage: simulator.py router amount_in tokenIn tokenOut min_out")
