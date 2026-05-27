"""
TALOS Risk Engine
Formal risk metrics: VaR, Kelly Criterion, Sharpe Ratio, Max Drawdown
Pure Python, no external dependencies
"""

import math
import json
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass


@dataclass
class RiskMetrics:
    """Container for all risk metrics"""
    value_at_risk_95: float  # 95% VaR
    kelly_fraction: float  # Optimal position size (0-1)
    sharpe_ratio: float
    max_drawdown: float
    liquidation_probability: float  # Probability of liquidation
    recommended_action: str  # HOLD, REBALANCE, EMERGENCY_EXIT
    max_safe_leverage: float
    risk_score: float  # 0-100 aggregated score


class RiskEngine:
    """
    Formal risk engine for DeFi vault management.
    Uses statistical methods for risk quantification.
    """
    
    # Risk thresholds
    LIQUIDATION_THRESHOLD = 1.0  # Health factor < 1.0 = liquidation
    WARNING_THRESHOLD = 1.2  # Health factor < 1.2 = warning
    SAFE_THRESHOLD = 1.5  # Health factor > 1.5 = safe
    
    def __init__(self):
        # Historical data for volatility calculation
        self.price_history: List[float] = []
        self.max_history = 100
    
    def calculate_all_metrics(
        self,
        health_factor: float,
        total_collateral: float,
        total_debt: float,
        current_apy: float,
        market_volatility: float,
        gas_price_gwei: float
    ) -> RiskMetrics:
        """
        Calculate comprehensive risk metrics for current vault state.
        """
        # 1. Value at Risk (95% confidence)
        var_95 = self._calculate_var(total_collateral, market_volatility)
        
        # 2. Kelly Criterion (optimal position sizing)
        kelly = self._calculate_kelly(current_apy, market_volatility)
        
        # 3. Sharpe Ratio (risk-adjusted return)
        sharpe = self._calculate_sharpe(current_apy, market_volatility)
        
        # 4. Liquidation probability (Black-Scholes inspired)
        liq_prob = self._calculate_liquidation_probability(health_factor, market_volatility)
        
        # 5. Max drawdown estimate
        max_dd = var_95 * 2  # Simplified: 2x VaR
        
        # 6. Recommended action based on health factor
        action = self._get_recommended_action(health_factor, liq_prob)
        
        # 7. Max safe leverage (Half-Kelly for safety)
        max_leverage = max(1.0, kelly * 2)
        
        # 8. Aggregated risk score (0-100)
        risk_score = self._calculate_risk_score(health_factor, liq_prob, var_95, max_dd)
        
        return RiskMetrics(
            value_at_risk_95=var_95,
            kelly_fraction=kelly,
            sharpe_ratio=sharpe,
            max_drawdown=max_dd,
            liquidation_probability=liq_prob,
            recommended_action=action,
            max_safe_leverage=max_leverage,
            risk_score=risk_score
        )
    
    def _calculate_var(self, collateral: float, volatility: float) -> float:
        """
        Calculate 95% Value at Risk using normal distribution.
        VaR = collateral * volatility * z_score(95%)
        z_score(95%) ≈ 1.645
        """
        z_score_95 = 1.645
        return collateral * volatility * z_score_95
    
    def _calculate_kelly(self, expected_return: float, volatility: float) -> float:
        """
        Calculate Kelly Criterion fraction.
        f* = (bp - q) / b
        Where: b = odds, p = win probability, q = loss probability
        
        Simplified for continuous returns:
        f* = (mu - 0.5 * sigma^2) / sigma^2
        """
        if volatility <= 0:
            return 1.0  # No risk = full allocation
        
        # Convert APY to decimal
        mu = expected_return / 100
        
        # Kelly fraction
        kelly = (mu - 0.5 * volatility * volatility) / (volatility * volatility)
        
        # Clamp to [0, 1] for safety
        return max(0.0, min(1.0, kelly))
    
    def _calculate_sharpe(self, expected_return: float, volatility: float) -> float:
        """
        Calculate Sharpe Ratio.
        Sharpe = (Return - Risk_Free) / Volatility
        Assuming risk-free rate = 0 for simplicity
        """
        if volatility <= 0:
            return float('inf')  # No risk = infinite Sharpe
        
        return (expected_return / 100) / volatility
    
    def _calculate_liquidation_probability(self, health_factor: float, volatility: float) -> float:
        """
        Estimate liquidation probability using log-normal distribution.
        Inspired by Black-Scholes model.
        
        P(liquidation) = P(HF < 1.0) = N(-d1)
        Where d1 = (ln(HF) + 0.5 * sigma^2) / sigma
        """
        if health_factor <= 1.0:
            return 1.0  # Already liquidated or at threshold
        
        if volatility <= 0:
            return 0.0  # No volatility = no liquidation risk
        
        # d1 calculation
        d1 = (math.log(health_factor) + 0.5 * volatility * volatility) / volatility
        
        # P(HF < 1) = 1 - N(d1) = N(-d1)
        liq_prob = 1.0 - self._normal_cdf(d1)
        
        return liq_prob
    
    def _normal_cdf(self, x: float) -> float:
        """
        Approximation of cumulative normal distribution.
        Using error function approximation.
        """
        return 0.5 * (1 + math.erf(x / math.sqrt(2)))
    
    def _get_recommended_action(self, health_factor: float, liq_prob: float) -> str:
        """
        Determine recommended action based on risk metrics.
        """
        if health_factor < self.LIQUIDATION_THRESHOLD:
            return "EMERGENCY_EXIT"  # Critical - liquidate immediately
        
        if health_factor < self.WARNING_THRESHOLD or liq_prob > 0.1:
            return "REBALANCE"  # High risk - rebalance to safety
        
        if health_factor < self.SAFE_THRESHOLD:
            return "HOLD"  # Moderate risk - monitor closely
        
        return "YIELD_OPTIMIZE"  # Safe - can optimize for yield
    
    def _calculate_risk_score(self, health_factor: float, liq_prob: float, var: float, max_dd: float) -> float:
        """
        Calculate aggregated risk score (0-100).
        Higher = more risky.
        """
        # Health factor component (0-40)
        if health_factor >= 2.0:
            hf_score = 0
        elif health_factor >= 1.5:
            hf_score = 10
        elif health_factor >= 1.2:
            hf_score = 25
        elif health_factor >= 1.0:
            hf_score = 35
        else:
            hf_score = 40
        
        # Liquidation probability component (0-30)
        liq_score = min(30, liq_prob * 300)
        
        # VaR component (0-20)
        var_score = min(20, var / 1000)  # Scaled
        
        # Drawdown component (0-10)
        dd_score = min(10, max_dd / 500)  # Scaled
        
        total = hf_score + liq_score + var_score + dd_score
        return min(100, total)
    
    def update_price_history(self, price: float):
        """Add price point for volatility calculation"""
        self.price_history.append(price)
        if len(self.price_history) > self.max_history:
            self.price_history.pop(0)
    
    def calculate_volatility(self) -> float:
        """Calculate realized volatility from price history"""
        if len(self.price_history) < 2:
            return 0.15  # Default 15% volatility
        
        # Calculate log returns
        returns = []
        for i in range(1, len(self.price_history)):
            if self.price_history[i-1] > 0:
                log_return = math.log(self.price_history[i] / self.price_history[i-1])
                returns.append(log_return)
        
        if not returns:
            return 0.15
        
        # Standard deviation of returns (annualized)
        mean = sum(returns) / len(returns)
        variance = sum((r - mean) ** 2 for r in returns) / len(returns)
        daily_vol = math.sqrt(variance)
        
        # Annualize (assuming daily data)
        annual_vol = daily_vol * math.sqrt(365)
        
        return annual_vol
    
    def format_risk_report(self, metrics: RiskMetrics) -> str:
        """Format risk metrics as human-readable report"""
        lines = [
            "╔══════════════════════════════════════════╗",
            "║         TALOS RISK ASSESSMENT            ║",
            "╠══════════════════════════════════════════╣",
            f"║ Risk Score:        {metrics.risk_score:>6.1f}/100           ║",
            f"║ Health Factor:      {metrics.liquidation_probability:>6.2%} liq. prob.   ║",
            f"║ VaR (95%):          ${metrics.value_at_risk_95:>10.2f}      ║",
            f"║ Kelly Fraction:     {metrics.kelly_fraction:>6.2%} optimal    ║",
            f"║ Sharpe Ratio:       {metrics.sharpe_ratio:>6.2f}             ║",
            f"║ Max Drawdown:       {metrics.max_drawdown:>6.2f}             ║",
            f"║ Safe Leverage:      {metrics.max_safe_leverage:>6.2f}x           ║",
            f"║ Action:             {metrics.recommended_action:>15} ║",
            "╚══════════════════════════════════════════╝"
        ]
        return "\n".join(lines)


# Singleton instance
_risk_engine = None

def get_risk_engine() -> RiskEngine:
    global _risk_engine
    if _risk_engine is None:
        _risk_engine = RiskEngine()
    return _risk_engine
