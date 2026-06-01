export type Action = "BUY" | "SELL" | "HOLD";
export type Pick = "ok" | "no";
export type Row = { id: number; asset: string; ctx: string; sig: string; act: Action; conf: number; why: string; pnl: number };
export type SimResult = { ai: number; hu: number; aiRoi: number; huRoi: number; good: number; bad: number };

export const START_CAPITAL = 1000;

export const ROUNDS: Row[] = [
  { id: 1, asset: "MNT / USDC", ctx: "MNT +18% in 4h, RSI 79, funding hot.", sig: "OVERBOUGHT · FUNDING_HOT", act: "BUY", conf: 62, why: "Momentum strong — long despite stretched RSI.", pnl: -6.4 },
  { id: 2, asset: "mETH / WETH", ctx: "mETH 0.7% below peg, deep liquidity, yield intact.", sig: "PEG_DISLOCATION · YIELD+", act: "BUY", conf: 88, why: "Mean-reversion on peg plus carry. High-conviction.", pnl: 4.1 },
  { id: 3, asset: "MNT / USDC", ctx: "Risk-off, BTC -5%, Mantle TVL bleeding.", sig: "RISK_OFF · TVL_OUTFLOW", act: "HOLD", conf: 71, why: "No edge in chop. Preserve capital.", pnl: 0 },
  { id: 4, asset: "COOK / USDC", ctx: "900% APR farm, unaudited, 2-day liquidity.", sig: "APR_INSANE · UNAUDITED", act: "BUY", conf: 55, why: "Yield exceptional — allocating a tranche.", pnl: -22.0 },
  { id: 5, asset: "MNT / USDC", ctx: "Bullish divergence 4h, TVL stabilizing, oversold.", sig: "BULL_DIV · OVERSOLD", act: "BUY", conf: 79, why: "Reclaim of support with divergence. Long the bounce.", pnl: 9.5 },
  { id: 6, asset: "MNT / USDC", ctx: "Parabolic +40%/day, euphoria, RSI 88.", sig: "PARABOLIC · RSI_EXTREME", act: "BUY", conf: 51, why: "FOMO strong — chasing the vertical move.", pnl: -15.3 },
];

export function pct(n: number): string {
  return (n > 0 ? "+" : "") + n.toFixed(1) + "%";
}

export function simulate(picks: Pick[]): SimResult {
  let ai = START_CAPITAL, hu = START_CAPITAL, good = 0, bad = 0;
  ROUNDS.forEach((x, k) => {
    const ok = picks[k] === "ok";
    ai *= 1 + x.pnl / 100;
    hu *= 1 + (ok ? x.pnl : 0) / 100;
    if (!ok && x.act !== "HOLD") { if (x.pnl < 0) good++; else if (x.pnl > 0) bad++; }
  });
  return { ai, hu, aiRoi: ((ai - START_CAPITAL) / START_CAPITAL) * 100, huRoi: ((hu - START_CAPITAL) / START_CAPITAL) * 100, good, bad };
}
