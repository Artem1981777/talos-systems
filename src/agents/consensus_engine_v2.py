"""
TALOS Multi-Agent Consensus Engine v2
Синхронная версия — без aiohttp, работает в termux.
"""

import json
import hashlib
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
import re
import os
import urllib.request
import urllib.error


@dataclass
class AgentOpinion:
    agent_id: str
    role: str
    decision: str
    confidence: float
    reasoning: str
    risk_score: float
    suggested_allocation: Dict[str, float]
    timestamp: str
    signature: str = ""


@dataclass
class ConsensusResult:
    final_decision: str
    consensus_confidence: float
    quorum_reached: bool
    agent_votes: Dict[str, str]
    execution_plan: Dict[str, Any]
    block_until: Optional[str]
    risk_level: str


class LLMManager:
    """
    Синхронный LLM manager через urllib (requests не нужен).
    """
    
    def __init__(self):
        self.groq_keys = self._load_groq_keys()
        self.current_key_idx = 0
    
    def _load_groq_keys(self):
        keys = []
        for i in range(1, 6):
            key = os.getenv("GROQ_API_KEY_" + str(i))
            if key:
                keys.append(key)
        default = os.getenv("GROQ_API_KEY")
        if default:
            keys.insert(0, default)
        return keys or ["mock_key"]
    
    def call_sync(self, prompt, provider_priority=None):
        """
        Синхронный вызов LLM через urllib.
        """
        if not self.groq_keys or self.groq_keys == ["mock_key"]:
            return self._mock_response(prompt)
        
        key = self.groq_keys[self.current_key_idx % len(self.groq_keys)]
        self.current_key_idx += 1
        
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": "Bearer " + key,
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 500,
            "response_format": {"type": "json_object"}
        }
        
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as e:
            print("[LLM] HTTP Error " + str(e.code) + ": " + e.read().decode("utf-8")[:200])
            return self._mock_response(prompt)
        except Exception as e:
            print("[LLM] Exception: " + str(e))
            return self._mock_response(prompt)
    
    def _mock_response(self, prompt):
        """Mock fallback."""
        if "WATCHER" in prompt or "conservative" in prompt:
            return '{"decision": "HOLD", "confidence": 0.85, "reasoning": "Mock WATCHER: HF stable at 1.8, volatility moderate 6%, no immediate liquidation risk. Recommend preventive monitoring.", "risk_score": 0.25, "suggested_allocation": {"meth": 0.4, "usdc": 0.4, "mnt": 0.2}}'
        elif "VALIDATOR" in prompt or "mathematical" in prompt:
            return '{"decision": "HOLD", "confidence": 0.92, "reasoning": "Mock VALIDATOR: Math checks out. Portfolio diversified, HF=1.8 above threshold, Sharpe ratio acceptable. No concentration risk detected.", "risk_score": 0.15, "suggested_allocation": {"meth": 0.35, "usdc": 0.45, "mnt": 0.2}}'
        elif "EXECUTOR" in prompt or "pragmatic" in prompt:
            return '{"decision": "HOLD", "confidence": 0.78, "reasoning": "Mock EXECUTOR: Gas cost $0.09 for rebalance, but HF=1.8 not critical. Rebalancing profit uncertain, better wait for clearer signal.", "risk_score": 0.3, "suggested_allocation": {"meth": 0.33, "usdc": 0.33, "mnt": 0.34}}'
        return '{"decision": "HOLD", "confidence": 0.5, "reasoning": "Mock fallback", "risk_score": 0.5, "suggested_allocation": {"meth": 0.33, "usdc": 0.33, "mnt": 0.34}}'


class RiskEngineAdapter:
    """Адаптер для Risk Engine."""
    
    def calculate_var(self, vault, market):
        return 0.02
    
    def liquidation_probability(self, vault, market):
        hf = vault.get("health_factor", 2.0)
        return max(0, min(1, (2.0 - hf) / 2.0))
    
    def kelly_criterion(self, vault, market):
        return 0.25
    
    def sharpe_ratio(self, vault, market):
        return 1.2
    
    def max_drawdown(self, vault, market):
        return 0.05
    
    def full_analysis(self, vault, market):
        return {
            "var_95": self.calculate_var(vault, market),
            "liq_prob": self.liquidation_probability(vault, market),
            "kelly": self.kelly_criterion(vault, market),
            "sharpe": self.sharpe_ratio(vault, market),
            "max_dd": self.max_drawdown(vault, market)
        }


class MultiAgentConsensus:
    """
    Синхронный multi-agent consensus.
    """
    
    def __init__(self, llm_manager=None, risk_engine=None, min_confidence=0.6, quorum_threshold=2):
        self.llm = llm_manager or LLMManager()
        self.risk = risk_engine or RiskEngineAdapter()
        self.min_confidence = min_confidence
        self.quorum_threshold = quorum_threshold
        self._last_opinions = []
    
    def run_consensus(self, vault_state, market_data):
        """
        Запускает 3 последовательных LLM-вызова (синхронно).
        В termux параллельность не критична — 3 вызова по 1-2 сек.
        """
        opinions = []
        
        # WATCHER
        try:
            op = self._call_watcher(vault_state, market_data)
            opinions.append(op)
            print("[CONSENSUS] WATCHER: " + op.decision + " | confidence=" + str(round(op.confidence, 2)))
        except Exception as e:
            print("[CONSENSUS] WATCHER failed: " + str(e))
        
        # VALIDATOR
        try:
            op = self._call_validator(vault_state, market_data)
            opinions.append(op)
            print("[CONSENSUS] VALIDATOR: " + op.decision + " | confidence=" + str(round(op.confidence, 2)))
        except Exception as e:
            print("[CONSENSUS] VALIDATOR failed: " + str(e))
        
        # EXECUTOR
        try:
            op = self._call_executor(vault_state, market_data)
            opinions.append(op)
            print("[CONSENSUS] EXECUTOR: " + op.decision + " | confidence=" + str(round(op.confidence, 2)))
        except Exception as e:
            print("[CONSENSUS] EXECUTOR failed: " + str(e))
        
        self._last_opinions = opinions
        return self._compute_consensus(opinions, vault_state, market_data)
    
    def _call_watcher(self, vault, market):
        hf = vault.get("health_factor", 2.0)
        vol = market.get("volatility_24h", 0.05)
        
        prompt = "You are TALOS WATCHER - conservative risk monitor.\n"
        prompt += "Detect early warnings and recommend PREVENTIVE action.\n\n"
        prompt += "POSITION: mETH=" + str(vault.get("meth_balance", 0))
        prompt += " USDC=" + str(vault.get("usdc_balance", 0))
        prompt += " MNT=" + str(vault.get("mnt_balance", 0))
        prompt += " HF=" + str(hf) + "\n"
        prompt += "MARKET: vol=" + str(vol) + " trend=" + market.get("trend", "neutral") + "\n\n"
        prompt += "RULES:\n"
        prompt += "1. HF<<1.5 -> LIQUIDATE\n"
        prompt += "2. HF 1.5-2.0 and vol>0.08 -> REBALANCE\n"
        prompt += "3. HF>2.0 and vol<<0.05 -> HOLD\n\n"
        prompt += "Respond JSON only:\n"
        prompt += '{"decision":"HOLD","confidence":0.9,"reasoning":"string","risk_score":0.1,"suggested_allocation":{"meth":0.33,"usdc":0.33,"mnt":0.34}}'
        
        response = self.llm.call_sync(prompt)
        parsed = self._parse_llm_response(response, "WATCHER")
        return AgentOpinion(
            agent_id="watcher_001", role="WATCHER",
            decision=parsed["decision"], confidence=parsed["confidence"],
            reasoning=parsed["reasoning"], risk_score=parsed["risk_score"],
            suggested_allocation=parsed["suggested_allocation"],
            timestamp=datetime.now(timezone.utc).isoformat(),
            signature=self._sign_opinion(parsed)
        )
    
    def _call_validator(self, vault, market):
        hf = vault.get("health_factor", 2.0)
        
        prompt = "You are TALOS VALIDATOR - mathematical verifier.\n"
        prompt += "Verify if risk assessment is mathematically sound.\n\n"
        prompt += "POSITION: mETH=" + str(vault.get("meth_balance", 0))
        prompt += " USDC=" + str(vault.get("usdc_balance", 0))
        prompt += " MNT=" + str(vault.get("mnt_balance", 0))
        prompt += " HF=" + str(hf) + "\n\n"
        prompt += "RULES:\n"
        prompt += "1. Check over-concentration -> flag risk\n"
        prompt += "2. Verify HF = (Collateral*LTV)/Debt\n"
        prompt += "3. Sharpe<<0.5 -> inefficient\n\n"
        prompt += "Respond JSON only:\n"
        prompt += '{"decision":"HOLD","confidence":0.9,"reasoning":"string","risk_score":0.1,"suggested_allocation":{"meth":0.33,"usdc":0.33,"mnt":0.34}}'
        
        response = self.llm.call_sync(prompt)
        parsed = self._parse_llm_response(response, "VALIDATOR")
        return AgentOpinion(
            agent_id="validator_001", role="VALIDATOR",
            decision=parsed["decision"], confidence=parsed["confidence"],
            reasoning=parsed["reasoning"], risk_score=parsed["risk_score"],
            suggested_allocation=parsed["suggested_allocation"],
            timestamp=datetime.now(timezone.utc).isoformat(),
            signature=self._sign_opinion(parsed)
        )
    
    def _call_executor(self, vault, market):
        hf = vault.get("health_factor", 2.0)
        gas_gwei = market.get("gas_price_gwei", 20)
        gas_rebal = market.get("gas_rebalance", 150000)
        mnt_price = market.get("mnt_price", 0.5)
        gas_cost = gas_rebal * gas_gwei * 1e-9 * mnt_price
        
        prompt = "You are TALOS EXECUTOR - pragmatic executor.\n"
        prompt += "Determine IF and HOW to execute, consider gas costs.\n\n"
        prompt += "POSITION: mETH=" + str(vault.get("meth_balance", 0))
        prompt += " USDC=" + str(vault.get("usdc_balance", 0))
        prompt += " MNT=" + str(vault.get("mnt_balance", 0)) + "\n"
        prompt += "CONTEXT: gas=" + str(gas_gwei) + "gwei"
        prompt += " cost=$" + str(round(gas_cost, 4)) + "\n"
        prompt += " slippage=" + str(market.get("slippage", 0.005)) + "\n\n"
        prompt += "RULES:\n"
        prompt += "1. HF>2.0 and gas>$5 -> HOLD\n"
        prompt += "2. HF 1.5-2.0 and gas<$3 -> REBALANCE if profit>3x gas\n"
        prompt += "3. HF<<1.5 -> EXECUTE regardless\n"
        prompt += "4. HF<<1.2 -> EMERGENCY_EXIT\n\n"
        prompt += "Respond JSON only:\n"
        prompt += '{"decision":"HOLD","confidence":0.9,"reasoning":"string","risk_score":0.1,"suggested_allocation":{"meth":0.33,"usdc":0.33,"mnt":0.34}}'
        
        response = self.llm.call_sync(prompt)
        parsed = self._parse_llm_response(response, "EXECUTOR")
        return AgentOpinion(
            agent_id="executor_001", role="EXECUTOR",
            decision=parsed["decision"], confidence=parsed["confidence"],
            reasoning=parsed["reasoning"], risk_score=parsed["risk_score"],
            suggested_allocation=parsed["suggested_allocation"],
            timestamp=datetime.now(timezone.utc).isoformat(),
            signature=self._sign_opinion(parsed)
        )
    
    def _parse_llm_response(self, response, agent_name):
        try:
            json_match = re.search(r'\{.*\}', str(response), re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                return {
                    "decision": data.get("decision", "HOLD"),
                    "confidence": float(data.get("confidence", 0.5)),
                    "reasoning": data.get("reasoning", "No reasoning"),
                    "risk_score": float(data.get("risk_score", 0.5)),
                    "suggested_allocation": data.get("suggested_allocation", {"meth": 0.33, "usdc": 0.33, "mnt": 0.34})
                }
        except Exception as e:
            print("[" + agent_name + "] Parse error: " + str(e))
        
        return {
            "decision": "HOLD", "confidence": 0.5,
            "reasoning": "Parse failed for " + agent_name,
            "risk_score": 0.5,
            "suggested_allocation": {"meth": 0.33, "usdc": 0.33, "mnt": 0.34}
        }
    
    def _sign_opinion(self, data):
        payload = json.dumps(data, sort_keys=True)
        return hashlib.sha256(payload.encode()).hexdigest()[:16]
    
    def _compute_consensus(self, opinions, vault, market):
        if len(opinions) < self.quorum_threshold:
            return ConsensusResult(
                final_decision="HOLD", consensus_confidence=0.0,
                quorum_reached=False,
                agent_votes={},
                execution_plan={"action": "HOLD", "reason": "Quorum not reached"},
                block_until=datetime.now(timezone.utc).isoformat(),
                risk_level="UNKNOWN"
            )
        
        role_weights = {"WATCHER": 1.0, "VALIDATOR": 1.2, "EXECUTOR": 0.8}
        
        votes = {}
        for op in opinions:
            weight = role_weights.get(op.role, 1.0) * op.confidence
            votes[op.decision] = votes.get(op.decision, 0) + weight
        
        best_decision = max(votes, key=votes.get)
        total_weight = sum(votes.values())
        consensus_confidence = votes[best_decision] / total_weight if total_weight > 0 else 0
        quorum_reached = consensus_confidence >= self.min_confidence and len(opinions) >= self.quorum_threshold
        
        avg_allocation = {"meth": 0, "usdc": 0, "mnt": 0}
        total_alloc_weight = 0
        for op in opinions:
            w = role_weights.get(op.role, 1.0) * op.confidence
            for token in avg_allocation:
                avg_allocation[token] += op.suggested_allocation.get(token, 0) * w
            total_alloc_weight += w
        
        for token in avg_allocation:
            avg_allocation[token] /= total_alloc_weight if total_alloc_weight > 0 else 1
        
        avg_risk = sum(op.risk_score * role_weights.get(op.role, 1.0) for op in opinions)
        avg_risk /= sum(role_weights.get(op.role, 1.0) for op in opinions)
        risk_level = "LOW" if avg_risk < 0.3 else "MEDIUM" if avg_risk < 0.6 else "HIGH" if avg_risk < 0.8 else "CRITICAL"
        
        return ConsensusResult(
            final_decision=best_decision,
            consensus_confidence=consensus_confidence,
            quorum_reached=quorum_reached,
            agent_votes={op.role: op.decision for op in opinions},
            execution_plan={
                "action": best_decision,
                "target_allocation": avg_allocation,
                "gas_estimate_usd": market.get("gas_rebalance", 150000) * market.get("gas_price_gwei", 20) * 1e-9 * market.get("mnt_price", 0.5),
                "expected_slippage": market.get("slippage", 0.005)
            },
            block_until=None if quorum_reached else datetime.now(timezone.utc).isoformat(),
            risk_level=risk_level
        )
    
    def to_dict(self, consensus):
        return {
            "final_decision": consensus.final_decision,
            "consensus_confidence": consensus.consensus_confidence,
            "quorum_reached": consensus.quorum_reached,
            "agent_votes": consensus.agent_votes,
            "execution_plan": consensus.execution_plan,
            "risk_level": consensus.risk_level,
            "block_until": consensus.block_until
        }


# ── ФУНКЦИЯ ДЛЯ ИНТЕГРАЦИИ В ORCHESTRATOR ──

def run_consensus_cycle(vault_state, market_data, llm_manager=None, risk_engine=None):
    """
    Синхронная функция-адаптер для интеграции в orchestrator.py.
    """
    engine = MultiAgentConsensus(llm_manager, risk_engine)
    consensus = engine.run_consensus(vault_state, market_data)
    
    return {
        "consensus": engine.to_dict(consensus),
        "agent_opinions": [asdict(op) for op in engine._last_opinions],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ── ТЕСТ ──

if __name__ == "__main__":
    print("=" * 50)
    print("TALOS Consensus Engine v2 - TEST")
    print("=" * 50)
    
    vault = {
        "meth_balance": 1.5,
        "usdc_balance": 4500.0,
        "mnt_balance": 100.0,
        "health_factor": 1.8,
        "collateral_ratio": 1.6
    }
    market = {
        "meth_price": 3000.0,
        "mnt_price": 0.5,
        "volatility_24h": 0.06,
        "trend": "bearish",
        "gas_price_gwei": 25,
        "gas_rebalance": 150000,
        "slippage": 0.005,
        "block_number": 12345678
    }
    
    result = run_consensus_cycle(vault, market)
    
    print("\n--- CONSENSUS RESULT ---")
    print(json.dumps(result["consensus"], indent=2))
    print("\n--- AGENT OPINIONS ---")
    for op in result["agent_opinions"]:
        print("[" + op["role"] + "] " + op["decision"] + " | confidence=" + str(round(op["confidence"], 2)))
        print("  reasoning: " + op["reasoning"][:100])
    print("\n--- DONE ---")
