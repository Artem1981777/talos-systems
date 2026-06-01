import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Check, X, Trophy, TrendingUp, TrendingDown, Minus, ShieldCheck, RotateCcw } from "lucide-react";

type Action = "BUY" | "SELL" | "HOLD";
type Row = { id: number; asset: string; ctx: string; sig: string; act: Action; conf: number; why: string; pnl: number };

const ROUNDS: Row[] = [
  { id: 1, asset: "MNT / USDC", ctx: "MNT +18% in 4h, RSI 79, funding hot.", sig: "OVERBOUGHT · FUNDING_HOT", act: "BUY", conf: 62, why: "Momentum strong — long despite stretched RSI.", pnl: -6.4 },
  { id: 2, asset: "mETH / WETH", ctx: "mETH 0.7% below peg, deep liquidity, yield intact.", sig: "PEG_DISLOCATION · YIELD+", act: "BUY", conf: 88, why: "Mean-reversion on peg plus carry. High-conviction.", pnl: 4.1 },
  { id: 3, asset: "MNT / USDC", ctx: "Risk-off, BTC -5%, Mantle TVL bleeding.", sig: "RISK_OFF · TVL_OUTFLOW", act: "HOLD", conf: 71, why: "No edge in chop. Preserve capital.", pnl: 0 },
  { id: 4, asset: "COOK / USDC", ctx: "900% APR farm, unaudited, 2-day liquidity.", sig: "APR_INSANE · UNAUDITED", act: "BUY", conf: 55, why: "Yield exceptional — allocating a tranche.", pnl: -22.0 },
  { id: 5, asset: "MNT / USDC", ctx: "Bullish divergence 4h, TVL stabilizing, oversold.", sig: "BULL_DIV · OVERSOLD", act: "BUY", conf: 79, why: "Reclaim of support with divergence. Long the bounce.", pnl: 9.5 },
  { id: 6, asset: "MNT / USDC", ctx: "Parabolic +40%/day, euphoria, RSI 88.", sig: "PARABOLIC · RSI_EXTREME", act: "BUY", conf: 51, why: "FOMO strong — chasing the vertical move.", pnl: -15.3 },
];

const CAP0 = 1000;
const fadeI = { opacity: 0, y: 14 };
const fadeA = { opacity: 1, y: 0 };
const fadeX = { opacity: 0, y: -14 };
const t35 = { duration: 0.35 };
const w = (p: number) => ({ width: p + "%" });

function meta(a: Action) {
  if (a === "BUY") return { c: "text-primary", Icon: TrendingUp };
  if (a === "SELL") return { c: "text-destructive", Icon: TrendingDown };
  return { c: "text-muted-foreground", Icon: Minus };
}
function pct(n: number) { return (n > 0 ? "+" : "") + n.toFixed(1) + "%"; }

export default function Arena() {
  const [picks, setPicks] = useState<Array<"ok" | "no">>([]);
  const i = picks.length;
  const done = i >= ROUNDS.length;
  const cur = ROUNDS[Math.min(i, ROUNDS.length - 1)];

  const r = useMemo(() => {
    let ai = CAP0, hu = CAP0, good = 0, bad = 0;
    ROUNDS.forEach((x, k) => {
      const ok = picks[k] === "ok";
      ai *= 1 + x.pnl / 100;
      hu *= 1 + (ok ? x.pnl : 0) / 100;
      if (!ok && x.act !== "HOLD") { if (x.pnl < 0) good++; else if (x.pnl > 0) bad++; }
    });
    return { ai, hu, aiRoi: ((ai - CAP0) / CAP0) * 100, huRoi: ((hu - CAP0) / CAP0) * 100, good, bad };
  }, [picks]);

  const win = r.huRoi > r.aiRoi;
  const d = r.huRoi - r.aiRoi;
  const m = meta(cur.act);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h1 className="font-mono text-base font-bold tracking-wider">HUMAN_VS_AI // OVERSIGHT_MODE</h1>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground mt-0.5 pl-6">TALOS proposes autonomous trades — you hold the veto. Approve or reject each call, then see who managed risk better.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 items-center">
        <div className="bg-card border border-accent/25 rounded-lg p-3 text-center">
          <div className="font-mono text-[9px] text-muted-foreground/60 tracking-widest">AI_AUTONOMOUS</div>
          <div className="font-mono text-2xl font-bold text-accent">{done ? pct(r.aiRoi) : "--"}</div>
          <div className="font-mono text-[9px] text-muted-foreground/40">every trade</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-[9px] text-muted-foreground/50 tracking-widest">ROUND</div>
          <div className="font-mono text-2xl font-bold text-primary">{done ? ROUNDS.length : i + 1}<span className="text-muted-foreground/40 text-sm">/{ROUNDS.length}</span></div>
        </div>
        <div className="bg-card border border-primary/25 rounded-lg p-3 text-center">
          <div className="font-mono text-[9px] text-muted-foreground/60 tracking-widest">HUMAN_SUPERVISED</div>
          <div className="font-mono text-2xl font-bold text-primary">{done ? pct(r.huRoi) : "--"}</div>
          <div className="font-mono text-[9px] text-muted-foreground/40">approved only</div>
        </div>
      </div>

      <div className="flex gap-1.5">
        {ROUNDS.map((x, k) => (
          <div key={x.id} className={`h-1 flex-1 rounded-full ${k < picks.length ? (picks[k] === "ok" ? "bg-primary" : "bg-destructive") : k === i && !done ? "bg-primary/40" : "bg-border"}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div key={cur.id} initial={fadeI} animate={fadeA} exit={fadeX} transition={t35} className="bg-card border border-primary/25 rounded-lg p-6 space-y-5 shadow-lg shadow-primary/5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0"><Cpu className="w-5 h-5 text-primary" /></div>
                <div>
                  <div className="font-mono text-[10px] text-muted-foreground/60 tracking-widest">TALOS_PROPOSES</div>
                  <div className="font-mono text-lg font-bold tracking-wider">{cur.asset}</div>
                </div>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded border border-border/40 ${m.c}`}><m.Icon className="w-4 h-4" /><span className="font-mono text-sm font-bold">{cur.act}</span></div>
            </div>
            <div className="space-y-2">
              <div className="font-mono text-[10px] text-muted-foreground/60 tracking-widest">MARKET_CONTEXT</div>
              <p className="text-sm text-foreground/90 leading-relaxed">{cur.ctx}</p>
              <div className="font-mono text-[10px] text-accent/70">{cur.sig}</div>
            </div>
            <div className="bg-background/40 rounded border border-border/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground/60 tracking-widest">AI_REASONING</span>
                <span className="font-mono text-[10px] text-primary">CONF {cur.conf}%</span>
              </div>
              <p className="text-sm text-foreground/80 italic leading-relaxed">"{cur.why}"</p>
              <div className="h-1 bg-border/50 rounded-full overflow-hidden"><div className={`h-full rounded-full ${cur.conf >= 75 ? "bg-primary" : cur.conf >= 60 ? "bg-accent" : "bg-yellow-500"}`} style={w(cur.conf)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setPicks((p) => [...p, "no"])} className="flex items-center justify-center gap-2 px-4 py-3 rounded border border-destructive/40 text-destructive hover:bg-destructive/10 font-mono text-sm font-bold transition-all"><X className="w-4 h-4" /> REJECT</button>
              <button onClick={() => setPicks((p) => [...p, "ok"])} className="flex items-center justify-center gap-2 px-4 py-3 rounded border border-primary/40 text-primary hover:bg-primary/10 font-mono text-sm font-bold transition-all"><Check className="w-4 h-4" /> APPROVE</button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="res" initial={fadeI} animate={fadeA} transition={t35} className="space-y-5">
            <div className={`rounded-lg border p-6 ${win ? "border-primary/40 bg-primary/5" : "border-destructive/40 bg-destructive/5"}`}>
              <div className="flex items-center gap-3">
                <Trophy className={`w-8 h-8 ${win ? "text-primary" : "text-destructive"}`} />
                <div>
                  <div className="font-mono text-lg font-bold tracking-wider">{win ? "HUMAN OVERSIGHT WINS" : "AI AUTONOMY WINS"}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{win ? "Your vetoes beat the autonomous agent by " + pct(d) + "." : "Your vetoes cost " + pct(Math.abs(d)) + " vs letting TALOS run free."}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-5">
                <div className="space-y-1.5">
                  <div className="flex justify-between"><span className="font-mono text-[9px] text-muted-foreground/60 tracking-widest">HUMAN_SUPERVISED</span><span className="font-mono text-sm font-bold text-primary">{pct(r.huRoi)}</span></div>
                  <div className="h-2 bg-border/40 rounded-full overflow-hidden"><motion.div className="h-full rounded-full bg-primary" initial={w(0)} animate={w(Math.max(2, Math.min(100, 50 + r.huRoi * 2)))} transition={t35} /></div>
                  <div className="font-mono text-[10px] text-foreground/70">{"$" + r.hu.toFixed(0)}</div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between"><span className="font-mono text-[9px] text-muted-foreground/60 tracking-widest">AI_AUTONOMOUS</span><span className="font-mono text-sm font-bold text-accent">{pct(r.aiRoi)}</span></div>
                  <div className="h-2 bg-border/40 rounded-full overflow-hidden"><motion.div className="h-full rounded-full bg-accent" initial={w(0)} animate={w(Math.max(2, Math.min(100, 50 + r.aiRoi * 2)))} transition={t35} /></div>
                  <div className="font-mono text-[10px] text-foreground/70">{"$" + r.ai.toFixed(0)}</div>
                </div>
              </div>
              <div className="flex gap-6 mt-5 pt-4 border-t border-border/30">
                <div><span className="font-mono text-xl font-bold text-primary">{r.good}</span> <span className="font-mono text-[9px] text-muted-foreground/60 tracking-widest">GOOD_VETOES</span><div className="font-mono text-[9px] text-muted-foreground/40">bad trades blocked</div></div>
                <div><span className="font-mono text-xl font-bold text-muted-foreground">{r.bad}</span> <span className="font-mono text-[9px] text-muted-foreground/60 tracking-widest">BAD_VETOES</span><div className="font-mono text-[9px] text-muted-foreground/40">winners rejected</div></div>
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] text-muted-foreground/50 tracking-widest mb-3">// ROUND_BREAKDOWN</div>
              <div className="space-y-1.5">
                {ROUNDS.map((x, k) => {
                  const mm = meta(x.act);
                  const ok = picks[k] === "ok";
                  return (
                    <div key={x.id} className="flex items-center gap-3 bg-card/60 border border-border/30 rounded px-3 py-2">
                      <div className={`flex items-center gap-1 font-mono text-[10px] font-bold w-14 shrink-0 ${mm.c}`}><mm.Icon className="w-3 h-3" /> {x.act}</div>
                      <div className="font-mono text-[11px] text-foreground/80 flex-1 truncate">{x.asset}</div>
                      <div className={`font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0 ${ok ? "text-primary border border-primary/30" : "text-destructive border border-destructive/30"}`}>{ok ? "APPROVED" : "VETOED"}</div>
                      <div className={`font-mono text-[11px] font-bold w-16 text-right shrink-0 ${x.pnl > 0 ? "text-primary" : x.pnl < 0 ? "text-destructive" : "text-muted-foreground"}`}>{pct(x.pnl)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <button onClick={() => setPicks([])} className="flex items-center gap-2 px-4 py-2 rounded border border-primary/40 text-primary hover:bg-primary/10 font-mono text-xs transition-all"><RotateCcw className="w-3.5 h-3.5" /> REPLAY_SIMULATION</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
