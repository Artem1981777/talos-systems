"""
TALOS ReAct Agent
Reasoning + Acting pattern with tool calling
Pure Python, no external dependencies
"""

import os
import json
import time
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field

from src.ai.llm_manager import get_llm_manager, LLMResponse
from src.ai.memory import get_memory, MemoryEntry
from src.ai.risk_engine import get_risk_engine, RiskMetrics


@dataclass
class Tool:
    """Tool definition for ReAct pattern"""
    name: str
    description: str
    parameters: Dict[str, Any]
    execute: Callable[[Dict[str, Any]], Dict[str, Any]]


@dataclass
class AgentDecision:
    """Structured decision output"""
    action: str  # HOLD, REBALANCE, LIQUIDATE, FLASH_LOAN_ARB, YIELD_SWITCH, EMERGENCY_EXIT
    confidence: float  # 0.0 - 1.0
    reasoning: str
    risk_score: float  # 0-100
    expected_roi: float
    execution_plan: List[Dict[str, Any]]
    alternatives: List[Dict[str, Any]]
    simulation_required: bool
    time_horizon: str  # IMMEDIATE, SHORT, MEDIUM, LONG


class ReActAgent:
    """
    ReAct (Reasoning + Acting) Agent for TALOS.
    Iteratively reasons and uses tools until reaching a decision.
    """
    
    # Available actions
    ACTIONS = ["HOLD", "REBALANCE", "LIQUIDATE", "FLASH_LOAN_ARB", "YIELD_SWITCH", "EMERGENCY_EXIT"]
    TIME_HORIZONS = ["IMMEDIATE", "SHORT", "MEDIUM", "LONG"]
    
    def __init__(self, max_iterations: int = 5):
        self.llm = get_llm_manager()
        self.memory = get_memory()
        self.risk_engine = get_risk_engine()
        self.max_iterations = max_iterations
        
        # Define tools
        self.tools = self._define_tools()
    
    def _define_tools(self) -> List[Tool]:
        """Define available tools for the agent"""
        return [
            Tool(
                name="get_vault_state",
                description="Get current mETH vault state including health factor, collateral, debt",
                parameters={
                    "type": "object",
                    "properties": {
                        "vault_address": {"type": "string"}
                    },
                    "required": ["vault_address"]
                },
                execute=self._tool_get_vault_state
            ),
            Tool(
                name="get_market_data",
                description="Get current market conditions across Mantle DeFi protocols",
                parameters={
                    "type": "object",
                    "properties": {
                        "protocol": {"type": "string", "enum": ["merchant_moe", "agni_finance", "fluxion", "all"]}
                    },
                    "required": ["protocol"]
                },
                execute=self._tool_get_market_data
            ),
            Tool(
                name="calculate_risk_metrics",
                description="Calculate VaR, Kelly Criterion, and other risk metrics",
                parameters={
                    "type": "object",
                    "properties": {
                        "health_factor": {"type": "number"},
                        "total_collateral": {"type": "number"},
                        "total_debt": {"type": "number"},
                        "current_apy": {"type": "number"},
                        "market_volatility": {"type": "number"}
                    },
                    "required": ["health_factor", "total_collateral", "total_debt", "current_apy", "market_volatility"]
                },
                execute=self._tool_calculate_risk
            ),
            Tool(
                name="check_flash_loan_opportunity",
                description="Check for arbitrage opportunities using flash loans",
                parameters={
                    "type": "object",
                    "properties": {
                        "token_in": {"type": "string"},
                        "token_out": {"type": "string"},
                        "amount": {"type": "string"}
                    },
                    "required": ["token_in", "token_out", "amount"]
                },
                execute=self._tool_check_flash_loan
            ),
            Tool(
                name="get_recent_decisions",
                description="Get recent agent decisions from memory",
                parameters={
                    "type": "object",
                    "properties": {
                        "limit": {"type": "integer", "default": 5}
                    }
                },
                execute=self._tool_get_recent_decisions
            )
        ]
    
    def _tool_get_vault_state(self, params: Dict) -> Dict[str, Any]:
        """Tool: Get vault state from RPC"""
        # In production, this would query on-chain data
        # For now, return mock data that will be overridden by actual watcher data
        return {
            "health_factor": 1.85,
            "total_collateral": 150.5,
            "total_debt": 80.2,
            "liquidation_threshold": 1.0,
            "available_liquidity": 70.3,
            "timestamp": int(time.time())
        }
    
    def _tool_get_market_data(self, params: Dict) -> Dict[str, Any]:
        """Tool: Get market data from protocols"""
        protocol = params.get("protocol", "all")
        
        if protocol == "all":
            return {
                "apy": {
                    "merchant_moe": 8.5,
                    "agni_finance": 7.2,
                    "fluxion": 9.1
                },
                "tvl": 450000000,
                "volatility": 0.15,
                "timestamp": int(time.time())
            }
        
        apys = {
            "merchant_moe": 8.5,
            "agni_finance": 7.2,
            "fluxion": 9.1
        }
        
        return {
            "apy": apys.get(protocol, 8.0),
            "tvl": 150000000,
            "volatility": 0.15
        }
    
    def _tool_calculate_risk(self, params: Dict) -> Dict[str, Any]:
        """Tool: Calculate risk metrics"""
        metrics = self.risk_engine.calculate_all_metrics(
            health_factor=params["health_factor"],
            total_collateral=params["total_collateral"],
            total_debt=params["total_debt"],
            current_apy=params["current_apy"],
            market_volatility=params["market_volatility"],
            gas_price_gwei=0.5
        )
        
        return {
            "var_95": metrics.value_at_risk_95,
            "kelly_fraction": metrics.kelly_fraction,
            "sharpe_ratio": metrics.sharpe_ratio,
            "max_drawdown": metrics.max_drawdown,
            "liquidation_probability": metrics.liquidation_probability,
            "recommended_action": metrics.recommended_action,
            "risk_score": metrics.risk_score
        }
    
    def _tool_check_flash_loan(self, params: Dict) -> Dict[str, Any]:
        """Tool: Check flash loan arbitrage opportunities"""
        # In production, this would scan DEX prices
        return {
            "opportunity": False,
            "expected_profit": 0.0,
            "protocols": [],
            "risk": "UNKNOWN"
        }
    
    def _tool_get_recent_decisions(self, params: Dict) -> Dict[str, Any]:
        """Tool: Get recent decisions from memory"""
        limit = params.get("limit", 5)
        decisions = self.memory.get_recent(limit=limit, memory_type="decision")
        
        return {
            "count": len(decisions),
            "decisions": [
                {
                    "timestamp": d.timestamp,
                    "action": d.metadata.get("action", "UNKNOWN"),
                    "confidence": d.metadata.get("confidence", 0),
                    "risk_score": d.metadata.get("risk_score", 0)
                }
                for d in decisions
            ]
        }
    
    def think(self, state: Dict[str, Any]) -> AgentDecision:
        """
        Main ReAct loop: reason and act until decision is reached.
        """
        print("\n" + "="*60)
        print("🧠 TALOS ReAct Agent Starting Reasoning Cycle")
        print("="*60)
        
        # Get memory context
        memory_context = self.memory.get_context_for_decision(state)
        
        # Build system prompt
        system_prompt = self._build_system_prompt()
        
        # Build initial user prompt with state and memory
        user_prompt = self._build_initial_prompt(state, memory_context)
        
        # ReAct loop
        iteration = 0
        tool_results: List[Dict] = []
        final_decision: Optional[AgentDecision] = None
        
        while iteration < self.max_iterations and not final_decision:
            print(f"\n[ReAct] Iteration {iteration + 1}/{self.max_iterations}")
            
            # Build prompt with tool results
            current_prompt = user_prompt
            if tool_results:
                current_prompt += "\n\n## Previous Tool Results:\n"
                for tr in tool_results:
                    current_prompt += f"\n### {tr['tool']}:\n{json.dumps(tr['result'], indent=2)}\n"
            
            # Call LLM
            try:
                response = self.llm.generate(
                    system_prompt=system_prompt,
                    user_prompt=current_prompt,
                    temperature=0.1,
                    max_tokens=4096,
                    tools=self._format_tools_for_llm(),
                    require_json=False
                )
                
                print(f"[ReAct] LLM response via {response.provider} ({response.latency_ms:.0f}ms)")
                
                # Check for tool calls
                if response.tool_calls:
                    for tool_call in response.tool_calls:
                        result = self._execute_tool_call(tool_call)
                        tool_results.append({
                            "tool": tool_call.get("function", {}).get("name", "unknown"),
                            "result": result
                        })
                else:
                    # Try to parse as final decision
                    final_decision = self._parse_decision(response.content)
                    if final_decision:
                        print(f"[ReAct] Decision reached: {final_decision.action}")
                    else:
                        print("[ReAct] No decision yet, continuing...")
                        
            except Exception as e:
                print(f"[ReAct] LLM error: {str(e)}")
                # Fallback to risk engine recommendation
                metrics = self.risk_engine.calculate_all_metrics(
                    health_factor=state.get("health_factor", 1.5),
                    total_collateral=state.get("total_collateral", 100),
                    total_debt=state.get("total_debt", 50),
                    current_apy=state.get("current_apy", 8.0),
                    market_volatility=state.get("market_volatility", 0.15),
                    gas_price_gwei=state.get("gas_price_gwei", 0.5)
                )
                
                final_decision = AgentDecision(
                    action=metrics.recommended_action,
                    confidence=0.5,
                    reasoning=f"LLM failed ({str(e)}). Fallback to risk engine: {metrics.recommended_action}",
                    risk_score=metrics.risk_score,
                    expected_roi=0.0,
                    execution_plan=[],
                    alternatives=[],
                    simulation_required=True,
                    time_horizon="SHORT"
                )
                break
            
            iteration += 1
        
        # If no decision after max iterations, use conservative fallback
        if not final_decision:
            print("[ReAct] Max iterations reached, using conservative fallback")
            final_decision = AgentDecision(
                action="HOLD",
                confidence=0.3,
                reasoning="Could not reach confident decision after max iterations. Defaulting to HOLD for safety.",
                risk_score=50.0,
                expected_roi=0.0,
                execution_plan=[],
                alternatives=[],
                simulation_required=False,
                time_horizon="SHORT"
            )
        
        # Store decision in memory
        self.memory.store(MemoryEntry(
            id=f"decision_{int(time.time())}",
            timestamp=time.time(),
            type="decision",
            content=json.dumps({
                "action": final_decision.action,
                "reasoning": final_decision.reasoning,
                "confidence": final_decision.confidence,
                "risk_score": final_decision.risk_score
            }),
            metadata={
                "action": final_decision.action,
                "confidence": final_decision.confidence,
                "risk_score": final_decision.risk_score,
                "provider": response.provider if 'response' in locals() else "fallback",
                "iterations": iteration
            },
            importance=final_decision.confidence
        ))
        
        # Print decision summary
        self._print_decision(final_decision)
        
        return final_decision
    
    def _build_system_prompt(self) -> str:
        """Build system prompt for ReAct agent"""
        return """You are TALOS, an autonomous AI agent managing a DeFi vault on Mantle Network.
Your goal is to maximize yield while protecting against liquidation.

You have access to tools. Use them to gather information before making decisions.
Follow this reasoning process:
1. OBSERVE: Gather current state data using tools
2. ANALYZE: Evaluate risks and opportunities using risk metrics
3. DECIDE: Choose optimal action with confidence score
4. PLAN: Create detailed execution plan
5. REFLECT: Consider alternatives and risks

Available actions:
- HOLD: Wait and monitor
- REBALANCE: Adjust position for better risk/reward
- LIQUIDATE: Close position to prevent losses
- FLASH_LOAN_ARB: Execute arbitrage with flash loan
- YIELD_SWITCH: Move funds to higher yield protocol
- EMERGENCY_EXIT: Emergency withdrawal of all funds

Always provide structured output matching the DecisionSchema.
Be conservative with risk - prefer capital preservation over aggressive yield.

When you have enough information to make a decision, output ONLY a JSON object:
{
    "action": "HOLD|REBALANCE|LIQUIDATE|FLASH_LOAN_ARB|YIELD_SWITCH|EMERGENCY_EXIT",
    "confidence": 0.0-1.0,
    "reasoning": "detailed explanation",
    "risk_score": 0-100,
    "expected_roi": 0.0,
    "execution_plan": [{"step": 1, "protocol": "...", "action": "...", "amount": "...", "slippage": 0.5}],
    "alternatives": [{"action": "...", "expected_roi": 0.0, "risk_score": 0}],
    "simulation_required": true|false,
    "time_horizon": "IMMEDIATE|SHORT|MEDIUM|LONG"
}

If you need more information, use a tool call instead."""
    
    def _build_initial_prompt(self, state: Dict, memory_context: str) -> str:
        """Build initial user prompt with state and memory"""
        return f"""Current Vault State:
{json.dumps(state, indent=2)}

{memory_context}

Analyze the current situation and decide on the best action.
Use available tools if you need more data (market conditions, risk metrics, etc.).
When ready, output your final decision as JSON."""
    
    def _format_tools_for_llm(self) -> List[Dict]:
        """Format tools for LLM API"""
        return [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters
                }
            }
            for tool in self.tools
        ]
    
    def _execute_tool_call(self, tool_call: Dict) -> Dict[str, Any]:
        """Execute a tool call from LLM"""
        function_data = tool_call.get("function", {})
        tool_name = function_data.get("name", "")
        arguments_str = function_data.get("arguments", "{}")
        
        try:
            arguments = json.loads(arguments_str) if isinstance(arguments_str, str) else arguments_str
        except:
            arguments = {}
        
        # Find and execute tool
        for tool in self.tools:
            if tool.name == tool_name:
                print(f"[TOOL] Executing {tool_name}({json.dumps(arguments)})")
                result = tool.execute(arguments)
                print(f"[TOOL] Result: {json.dumps(result, indent=2)[:200]}...")
                return result
        
        return {"error": f"Tool {tool_name} not found"}
    
    def _parse_decision(self, content: str) -> Optional[AgentDecision]:
        """Parse LLM response into structured decision"""
        try:
            # Try to find JSON in response
            # Look for JSON block
            if "```json" in content:
                json_str = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                json_str = content.split("```")[1].split("```")[0].strip()
            else:
                # Try to find JSON object directly
                start = content.find("{")
                end = content.rfind("}")
                if start != -1 and end != -1:
                    json_str = content[start:end+1]
                else:
                    return None
            
            data = json.loads(json_str)
            
            # Validate required fields
            if "action" not in data:
                return None
            
            action = data["action"]
            if action not in self.ACTIONS:
                # Try to map similar actions
                action_map = {
                    "WAIT": "HOLD",
                    "MONITOR": "HOLD",
                    "REBALANCING": "REBALANCE",
                    "ARBITRAGE": "FLASH_LOAN_ARB",
                    "EMERGENCY": "EMERGENCY_EXIT"
                }
                action = action_map.get(action, "HOLD")
            
            return AgentDecision(
                action=action,
                confidence=float(data.get("confidence", 0.5)),
                reasoning=data.get("reasoning", "No reasoning provided"),
                risk_score=float(data.get("risk_score", 50)),
                expected_roi=float(data.get("expected_roi", 0)),
                execution_plan=data.get("execution_plan", []),
                alternatives=data.get("alternatives", []),
                simulation_required=bool(data.get("simulation_required", True)),
                time_horizon=data.get("time_horizon", "SHORT")
            )
            
        except Exception as e:
            print(f"[ReAct] Failed to parse decision: {str(e)}")
            return None
    
    def _print_decision(self, decision: AgentDecision):
        """Print formatted decision summary"""
        action_emoji = {
            "HOLD": "⏸️",
            "REBALANCE": "⚖️",
            "LIQUIDATE": "🔥",
            "FLASH_LOAN_ARB": "⚡",
            "YIELD_SWITCH": "🔄",
            "EMERGENCY_EXIT": "🚨"
        }
        
        emoji = action_emoji.get(decision.action, "❓")
        
        print("\n" + "="*60)
        print(f"{emoji} FINAL DECISION: {decision.action}")
        print("="*60)
        print(f"Confidence:    {decision.confidence*100:.1f}%")
        print(f"Risk Score:    {decision.risk_score:.1f}/100")
        print(f"Expected ROI:  {decision.expected_roi:+.2f}%")
        print(f"Time Horizon:  {decision.time_horizon}")
        print(f"Simulation:    {'Required' if decision.simulation_required else 'Skip'}")
        print(f"\nReasoning:\n{decision.reasoning[:300]}...")
        print("="*60)


# Singleton instance
_react_agent = None

def get_react_agent() -> ReActAgent:
    global _react_agent
    if _react_agent is None:
        _react_agent = ReActAgent()
    return _react_agent
