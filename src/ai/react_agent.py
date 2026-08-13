"""
TALOS ReAct Agent (SoSoValue edition).
Reasoning + Acting pattern with tool calling.
Market intelligence is sourced EXCLUSIVELY from the SoSoValue OpenAPI
(prices, indices, news). No mocks, no hardcoded market data: if SoSoValue
is unavailable the tool returns an explicit error, never fabricated data.
"""

import os
import json
import time
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field

from src.ai.llm_manager import get_llm_manager, LLMResponse
from src.ai.memory import get_memory, MemoryEntry
from src.ai.risk_engine import get_risk_engine, RiskMetrics
from src.integrations.sosovalue import get_sosovalue_client, SosoValueError


# --- SoSoValue-backed tool implementations (module-level, no LLM required) ---

def tool_get_market_data(params: Dict) -> Dict[str, Any]:
    """Real market data for one asset from SoSoValue."""
    symbol = (params or {}).get("symbol", "BTC")
    try:
        return get_sosovalue_client().get_market_data(symbol)
    except SosoValueError as e:
        return {"error": str(e), "symbol": symbol}


def tool_get_index_data(params: Dict) -> Dict[str, Any]:
    """Real SoSoValue index snapshot + top constituents (sector exposure)."""
    ticker = (params or {}).get("ticker", "ssiMAG7")
    try:
        client = get_sosovalue_client()
        snapshot = client.get_index_snapshot(ticker)
        try:
            snapshot["constituents"] = client.get_index_constituents(ticker)[:10]
        except SosoValueError:
            snapshot["constituents"] = []
        return snapshot
    except SosoValueError as e:
        return {"error": str(e), "ticker": ticker}


def tool_get_crypto_news(params: Dict) -> Dict[str, Any]:
    """Latest real crypto news headlines from SoSoValue."""
    category = (params or {}).get("category", 1)
    try:
        items = get_sosovalue_client().get_news(category=int(category), page_size=5)
        return {
            "count": len(items),
            "headlines": [n.get("title") for n in items],
        }
    except SosoValueError as e:
        return {"error": str(e)}


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
    action: str  # HOLD, BUY, SELL, REBALANCE, EMERGENCY_EXIT
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
    Iteratively reasons and uses SoSoValue-backed tools until it reaches a decision.
    """

    ACTIONS = ["HOLD", "BUY", "SELL", "REBALANCE", "EMERGENCY_EXIT"]
    TIME_HORIZONS = ["IMMEDIATE", "SHORT", "MEDIUM", "LONG"]

    def __init__(self, max_iterations: int = 5):
        self.llm = get_llm_manager()
        self.memory = get_memory()
        self.risk_engine = get_risk_engine()
        self.max_iterations = max_iterations
        self.tools = self._define_tools()

    def _define_tools(self) -> List[Tool]:
        """Define available tools for the agent (all market data via SoSoValue)"""
        return [
            Tool(
                name="get_market_data",
                description="Get real-time market data for a crypto asset from SoSoValue: price, 24h change, turnover, market cap, market-cap rank and volatility.",
                parameters={
                    "type": "object",
                    "properties": {
                        "symbol": {"type": "string", "description": "Ticker symbol, e.g. BTC, ETH, SOL"}
                    },
                    "required": ["symbol"]
                },
                execute=self._tool_get_market_data
            ),
            Tool(
                name="get_index_data",
                description="Get a SoSoValue crypto index snapshot (price, ROI, YTD) and its top constituents for sector exposure analysis.",
                parameters={
                    "type": "object",
                    "properties": {
                        "ticker": {"type": "string", "description": "Index ticker, e.g. ssiMAG7, ssiDeFi, ssiAI, ssiLayer1, ssiRWA"}
                    },
                    "required": ["ticker"]
                },
                execute=self._tool_get_index_data
            ),
            Tool(
                name="get_crypto_news",
                description="Get the latest crypto market news headlines from SoSoValue to inform the decision.",
                parameters={
                    "type": "object",
                    "properties": {
                        "category": {"type": "integer", "description": "1=news, 2=research, 3=institution, 4=insights, 7=announcement"}
                    }
                },
                execute=self._tool_get_crypto_news
            ),
            Tool(
                name="calculate_risk_metrics",
                description="Calculate VaR, Kelly Criterion, Sharpe ratio and other risk metrics for the current portfolio.",
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

    def _tool_get_market_data(self, params: Dict) -> Dict[str, Any]:
        """Tool: real market data from SoSoValue"""
        return tool_get_market_data(params)

    def _tool_get_index_data(self, params: Dict) -> Dict[str, Any]:
        """Tool: real index snapshot from SoSoValue"""
        return tool_get_index_data(params)

    def _tool_get_crypto_news(self, params: Dict) -> Dict[str, Any]:
        """Tool: real crypto news from SoSoValue"""
        return tool_get_crypto_news(params)

    def _tool_calculate_risk(self, params: Dict) -> Dict[str, Any]:
        """Tool: Calculate risk metrics"""
        metrics = self.risk_engine.calculate_all_metrics(
            health_factor=params["health_factor"],
            total_collateral=params["total_collateral"],
            total_debt=params["total_debt"],
            current_apy=params["current_apy"],
            market_volatility=params["market_volatility"],
            gas_price_gwei=0.0
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
        """Main ReAct loop: reason and act until decision is reached."""
        print("\n" + "=" * 60)
        print("\U0001f9e0 TALOS ReAct Agent Starting Reasoning Cycle")
        print("=" * 60)

        memory_context = self.memory.get_context_for_decision(state)
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_initial_prompt(state, memory_context)

        iteration = 0
        tool_results: List[Dict] = []
        final_decision: Optional[AgentDecision] = None

        while iteration < self.max_iterations and not final_decision:
            print(f"\n[ReAct] Iteration {iteration + 1}/{self.max_iterations}")

            current_prompt = user_prompt
            if tool_results:
                current_prompt += "\n\n## Previous Tool Results:\n"
                for tr in tool_results:
                    current_prompt += f"\n### {tr['tool']}:\n{json.dumps(tr['result'], indent=2)}\n"

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

                if response.tool_calls:
                    for tool_call in response.tool_calls:
                        result = self._execute_tool_call(tool_call)
                        tool_results.append({
                            "tool": tool_call.get("function", {}).get("name", "unknown"),
                            "result": result
                        })
                else:
                    final_decision = self._parse_decision(response.content)
                    if final_decision:
                        print(f"[ReAct] Decision reached: {final_decision.action}")
                    else:
                        print("[ReAct] No decision yet, continuing...")

            except Exception as e:
                print(f"[ReAct] LLM error: {str(e)}")
                metrics = self.risk_engine.calculate_all_metrics(
                    health_factor=state.get("health_factor", 1.5),
                    total_collateral=state.get("total_collateral", 100),
                    total_debt=state.get("total_debt", 50),
                    current_apy=state.get("current_apy", 8.0),
                    market_volatility=state.get("market_volatility", 0.15),
                    gas_price_gwei=state.get("gas_price_gwei", 0.0)
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

        self._print_decision(final_decision)
        return final_decision

    def _build_system_prompt(self) -> str:
        """Build system prompt for ReAct agent"""
        return """You are TALOS, an autonomous AI treasury agent for a solo crypto trader.
Your goal is to turn real market intelligence into risk-scored trade decisions
while protecting capital. A human keeps veto power over every executed trade.

All market intelligence comes from the SoSoValue API via your tools:
- get_market_data: live price, 24h change, turnover, market cap and volatility for an asset
- get_index_data: SoSoValue sector index snapshot + constituents (exposure analysis)
- get_crypto_news: latest market-moving headlines
- calculate_risk_metrics: VaR, Kelly, Sharpe for the current portfolio
- get_recent_decisions: your recent decision history

Never invent numbers. Base every claim on tool output. If a tool returns an
"error" field, acknowledge the missing data instead of guessing.

Follow this reasoning process:
1. OBSERVE: Gather live market data, index context and news using tools
2. ANALYZE: Evaluate risk and opportunity with risk metrics
3. DECIDE: Choose an action with a confidence score
4. PLAN: Create a detailed execution plan
5. REFLECT: Consider alternatives and downside

Available actions:
- HOLD: Wait and monitor
- BUY: Increase exposure to an asset
- SELL: Reduce exposure to an asset
- REBALANCE: Adjust allocation across assets/sectors
- EMERGENCY_EXIT: Move to stables / exit risk immediately

Be conservative with risk - prefer capital preservation over aggressive gains.

When you have enough information to decide, output ONLY a JSON object:
{
    "action": "HOLD|BUY|SELL|REBALANCE|EMERGENCY_EXIT",
    "confidence": 0.0-1.0,
    "reasoning": "detailed explanation grounded in SoSoValue data",
    "risk_score": 0-100,
    "expected_roi": 0.0,
    "execution_plan": [{"step": 1, "symbol": "BTC", "action": "BUY", "size_pct": 10, "slippage": 0.5}],
    "alternatives": [{"action": "...", "expected_roi": 0.0, "risk_score": 0}],
    "simulation_required": true|false,
    "time_horizon": "IMMEDIATE|SHORT|MEDIUM|LONG"
}

If you need more information, use a tool call instead."""

    def _build_initial_prompt(self, state: Dict, memory_context: str) -> str:
        """Build initial user prompt with state and memory"""
        return f"""Current Portfolio & Market State:
{json.dumps(state, indent=2)}

{memory_context}

Analyze the current situation and decide on the best action.
Use available tools to pull live SoSoValue market data, index context and news.
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
        except Exception:
            arguments = {}

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
            if "```json" in content:
                json_str = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                json_str = content.split("```")[1].split("```")[0].strip()
            else:
                start = content.find("{")
                end = content.rfind("}")
                if start != -1 and end != -1:
                    json_str = content[start:end + 1]
                else:
                    return None

            data = json.loads(json_str)

            if "action" not in data:
                return None

            action = data["action"]
            if action not in self.ACTIONS:
                action_map = {
                    "WAIT": "HOLD",
                    "MONITOR": "HOLD",
                    "REBALANCING": "REBALANCE",
                    "ACCUMULATE": "BUY",
                    "LONG": "BUY",
                    "SHORT": "SELL",
                    "REDUCE": "SELL",
                    "LIQUIDATE": "SELL",
                    "EMERGENCY": "EMERGENCY_EXIT",
                    "EXIT": "EMERGENCY_EXIT"
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
            "HOLD": "\u23f8\ufe0f",
            "BUY": "\U0001f7e2",
            "SELL": "\U0001f534",
            "REBALANCE": "\u2696\ufe0f",
            "EMERGENCY_EXIT": "\U0001f6a8"
        }

        emoji = action_emoji.get(decision.action, "\u2753")

        print("\n" + "=" * 60)
        print(f"{emoji} FINAL DECISION: {decision.action}")
        print("=" * 60)
        print(f"Confidence:    {decision.confidence*100:.1f}%")
        print(f"Risk Score:    {decision.risk_score:.1f}/100")
        print(f"Expected ROI:  {decision.expected_roi:+.2f}%")
        print(f"Time Horizon:  {decision.time_horizon}")
        print(f"Simulation:    {'Required' if decision.simulation_required else 'Skip'}")
        print(f"\nReasoning:\n{decision.reasoning[:300]}...")
        print("=" * 60)


# Singleton instance
_react_agent = None


def get_react_agent() -> ReActAgent:
    global _react_agent
    if _react_agent is None:
        _react_agent = ReActAgent()
    return _react_agent


if __name__ == "__main__":
    # Self-test: exercises the SoSoValue-backed tools directly (no LLM needed).
    print("get_market_data(BTC):", json.dumps(tool_get_market_data({"symbol": "BTC"}), indent=2))
    print("get_index_data(ssiMAG7):", json.dumps(tool_get_index_data({"ticker": "ssiMAG7"}), indent=2))
    print("get_crypto_news:", json.dumps(tool_get_crypto_news({"category": 1}), indent=2))
