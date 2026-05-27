"""
TALOS Mock LLM for demo/testing without API keys
Simulates realistic AI reasoning and decisions
"""

import random
import json
import time
from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class MockLLMResponse:
    content: str
    provider: str = "mock_phi3"
    model: str = "phi3:mini"
    latency_ms: float = 0.0
    tool_calls: Optional[List[Dict]] = None


class MockLLM:
    """
    Mock LLM that simulates realistic DeFi AI reasoning.
    Uses deterministic logic based on state, not random.
    """
    
    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 4096,
        tools: Optional[List[Dict]] = None,
        require_json: bool = False
    ) -> MockLLMResponse:
        start = time.time()
        
        # Parse state from prompt
        state = self._parse_state(user_prompt)
        
        # Simulate reasoning delay (realistic)
        time.sleep(0.5 + random.random() * 0.5)
        
        # Generate decision based on state
        decision = self._make_decision(state)
        
        # Generate realistic reasoning text
        reasoning = self._generate_reasoning(state, decision)
        
        latency = (time.time() - start) * 1000
        
        return MockLLMResponse(
            content=reasoning,
            latency_ms=latency
        )
    
    def _parse_state(self, prompt: str) -> Dict:
        """Extract state values from prompt"""
        state = {}
        
        # Extract health factor
        if "health_factor" in prompt or "Health factor" in prompt:
            import re
            match = re.search(r'health[_ ]factor[:=]\s*(\d+\.?\d*)', prompt, re.I)
            if match:
                state["health_factor"] = float(match.group(1))
        
        # Extract APY
        if "apy" in prompt.lower():
            import re
            match = re.search(r'apy[:=]\s*(\d+\.?\d*)', prompt, re.I)
            if match:
                state["apy"] = float(match.group(1))
        
        # Extract volatility
        if "volatility" in prompt.lower():
            import re
            match = re.search(r'volatility[:=]\s*(\d+\.?\d*)', prompt, re.I)
            if match:
                state["volatility"] = float(match.group(1))
        
        return state
    
    def _make_decision(self, state: Dict) -> Dict:
        """Deterministic decision logic"""
        hf = state.get("health_factor", 1.5)
        apy = state.get("apy", 5.0)
        vol = state.get("volatility", 0.15)
        
        # Risk-based decision tree
        if hf < 1.1:
            return {
                "action": "EMERGENCY_EXIT",
                "confidence": 0.95,
                "risk_score": 95,
                "reasoning": "CRITICAL: Health factor below 1.1. Immediate liquidation risk. Emergency withdrawal required."
            }
        elif hf < 1.3:
            return {
                "action": "REBALANCE",
                "confidence": 0.85,
                "risk_score": 75,
                "reasoning": "WARNING: Health factor in danger zone. Rebalancing to safer allocation recommended."
            }
        elif hf < 1.5:
            return {
                "action": "HOLD",
                "confidence": 0.7,
                "risk_score": 50,
                "reasoning": "CAUTION: Health factor below safe threshold. Monitoring closely, no action needed yet."
            }
        elif apy > 10 and vol < 0.2:
            return {
                "action": "YIELD_SWITCH",
                "confidence": 0.8,
                "risk_score": 30,
                "reasoning": "OPPORTUNITY: High APY with manageable volatility. Optimizing yield allocation."
            }
        elif vol > 0.25:
            return {
                "action": "HOLD",
                "confidence": 0.6,
                "risk_score": 45,
                "reasoning": "VOLATILITY: High market volatility detected. Conservative hold position."
            }
        else:
            return {
                "action": "HOLD",
                "confidence": 0.75,
                "risk_score": 25,
                "reasoning": "STABLE: Health factor optimal, volatility normal. Monitoring for opportunities."
            }
    
    def _generate_reasoning(self, state: Dict, decision: Dict) -> str:
        """Generate realistic AI reasoning text"""
        hf = state.get("health_factor", 1.5)
        apy = state.get("apy", 5.0)
        vol = state.get("volatility", 0.15)
        
        reasoning = f"""## TALOS AI Analysis

**Current State:**
- Health Factor: {hf:.2f} {'✅ SAFE' if hf > 1.5 else '⚠️ CAUTION' if hf > 1.2 else '🔴 DANGER'}
- APY: {apy:.1f}%
- Volatility: {vol:.1%}

**Risk Assessment:**
- Liquidation Probability: {max(0, min(100, (1.5 - hf) * 100)):.1f}%
- Risk Score: {decision['risk_score']}/100

**Decision: {decision['action']}**

**Confidence: {decision['confidence']*100:.0f}%**

**Reasoning:**
{decision['reasoning']}

**Execution Plan:**
1. Monitor health factor every 60 seconds
2. {'Rebalance if HF drops below 1.3' if decision['action'] == 'REBALANCE' else 'Hold position and wait for better conditions' if decision['action'] == 'HOLD' else 'Execute emergency withdrawal immediately' if decision['action'] == 'EMERGENCY_EXIT' else 'Switch to higher yield protocol'}

**Alternatives Considered:**
- REBALANCE: Risk {decision['risk_score']-10 if decision['risk_score'] > 20 else 15}/100, Expected ROI +2.5%
- HOLD: Risk {decision['risk_score']-20 if decision['risk_score'] > 30 else 10}/100, Expected ROI +0%

```json
{{
    "action": "{decision['action']}",
    "confidence": {decision['confidence']},
    "risk_score": {decision['risk_score']},
    "expected_roi": 0.0,
    "reasoning": "{decision['reasoning']}",
    "execution_plan": [
        {{"step": 1, "protocol": "merchant_moe", "action": "monitor", "amount": "0", "slippage": 0.5}}
    ],
    "alternatives": [
        {{"action": "REBALANCE", "expected_roi": 2.5, "risk_score": {decision['risk_score']-10 if decision['risk_score'] > 20 else 15}}},
        {{"action": "HOLD", "expected_roi": 0.0, "risk_score": {decision['risk_score']-20 if decision['risk_score'] > 30 else 10}}}
    ],
    "simulation_required": true,
    "time_horizon": "SHORT"
}}
```"""
        return reasoning


# Singleton
_mock_llm = None

def get_mock_llm():
    global _mock_llm
    if _mock_llm is None:
        _mock_llm = MockLLM()
    return _mock_llm
