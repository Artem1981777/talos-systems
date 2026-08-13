export type Action = "BUY" | "SELL" | "HOLD";
export type Pick = "ok" | "no";
export type Row = { id: number; asset: string; ctx: string; sig: string; act: Action; conf: number; why: string; pnl: number };
export type SimResult = { ai: number; hu: number; aiRoi: number; huRoi: number; good: number; bad: number };

export const START_CAPITAL = 1000;

export const ROUNDS: Row[] = [
  { id: 1, asset: "SOL / USDT", ctx: "SOL +18% in 4h, RSI 79, funding hot.", sig: "OVERBOUGHT · FUNDING_HOT", act: "BUY", conf: 62, why: "Momentum strong — long despite stretched RSI.", pnl: -6.4 },
  { id: 2, asset: "ETH / USDT", ctx: "ETH reclaiming range low, deep liquidity, ssiMAG7 strength.", sig: "MEAN_REVERT · INDEX+", act: "BUY", conf: 88, why: "Mean-reversion plus index momentum. High-conviction.", pnl: 4.1 },
  { id: 3, asset: "BTC / USDT", ctx: "Risk-off, BTC -5%, total mcap bleeding.", sig: "RISK_OFF · OUTFLOW", act: "HOLD", conf: 71, why: "No edge in chop. Preserve capital.", pnl: 0 },
  { id: 4, asset: "PEPE / USDT", ctx: "New meme listing, vertical, unaudited, thin liquidity.", sig: "HYPE · UNAUDITED", act: "BUY", conf: 55, why: "Hype exceptional — allocating a tranche.", pnl: -22.0 },
  { id: 5, asset: "BTC / USDT", ctx: "Bullish divergence 4h, mcap stabilizing, oversold.", sig: "BULL_DIV · OVERSOLD", act: "BUY", conf: 79, why: "Reclaim of support with divergence. Long the bounce.", pnl: 9.5 },
  { id: 6, asset: "SOL / USDT", ctx: "Parabolic +40%/day, euphoria, RSI 88.", sig: "PARABOLIC · RSI_EXTREME", act: "BUY", conf: 51, why: "FOMO strong — chasing the vertical move.", pnl: -15.3 },
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
