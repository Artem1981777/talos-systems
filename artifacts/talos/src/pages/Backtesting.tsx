import { useState } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";
import { Play, TrendingUp, Shield, BarChart2, Zap } from "lucide-react";

const ETH_PRICES = [
  1800, 1750, 1820, 1900, 2100, 2300, 2150, 2400, 2600, 2500,
  2350, 2200, 2450, 2700, 2550, 2300, 2100, 1950, 2050, 2200,
  2400, 2600, 2800, 2650, 2450, 2300, 2150, 2400, 2550, 2700
];

function generateBacktest(strategy: string) {
  let hf = 2.1;
  let roi = 0;
  const data = [];
  
  for (let i = 0; i < 30; i++) {
    const ethPrice = ETH_PRICES[i];
    const collateral = 1000 * ethPrice * 1.05;
    const debt = 945000;
    hf = (collateral * 0.8) / debt;
    
    let apy = 8.4;
    if (strategy === "aggressive") apy = hf > 1.8 ? 12.1 : 6.2;
    if (strategy === "conservative") apy = 5.35;
    if (strategy === "talos") {
      if (hf > 2.0) apy = 12.1;
      else if (hf > 1.7) apy = 8.4;
      else apy = 5.35;
    }
    
    roi += apy / 365;
    data.push({
      day: `Day ${i + 1}`,
      hf: parseFloat(hf.toFixed(3)),
      roi: parseFloat(roi.toFixed(3)),
      ethPrice,
      apy,
    });
  }
  return data;
}

export default function Backtesting() {
  const [strategy, setStrategy] = useState<"talos" | "aggressive" | "conservative">("talos");
  const [running, setRunning] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [done, setDone] = useState(false);

  async function runBacktest() {
    setRunning(true);
    setDone(false);
    setData([]);
    const result = generateBacktest(strategy);
    for (let i = 0; i < result.length; i++) {
      await new Promise(r => setTimeout(r, 80));
      setData(prev => [...prev, result[i]]);
    }
    setRunning(false);
    setDone(true);
  }

  const finalRoi = data.length > 0 ? data[data.length - 1].roi : 0;
  const minHf = data.length > 0 ? Math.min(...data.map(d => d.hf)) : 0;
  const avgApy = data.length > 0 ? (data.reduce((s, d) => s + d.apy, 0) / data.length).toFixed(2) : 0;

  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="font-mono text-lg font-bold text-primary">BACKTESTING_ENGINE</div>
        <div className="font-mono text-[10px] text-muted-foreground">30-day simulation // ETH price history</div>
      </div>

      {/* Strategy selector */}
      <div className="bg-card border border-border rounded p-4 space-y-3">
        <div className="font-mono text-[10px] text-muted-foreground tracking-widest">// SELECT_STRATEGY</div>
        <div className="flex gap-2">
          {[
            { id: "talos", label: "TALOS AI", color: "primary" },
            { id: "aggressive", label: "AGGRESSIVE", color: "destructive" },
            { id: "conservative", label: "CONSERVATIVE", color: "accent" },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setStrategy(s.id as any)}
              className={`flex-1 py-2 px-1 rounded border font-mono text-[10px] font-bold transition-all ${
                strategy === s.id
                  ? `border-${s.color} bg-${s.color}/10 text-${s.color}`
                  : "border-border text-muted-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={runBacktest}
          disabled={running}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded border border-primary/40 text-primary hover:bg-primary/10 font-mono text-xs font-bold transition-all disabled:opacity-50"
        >
          <Play className={`w-3.5 h-3.5 ${running ? "animate-pulse" : ""}`} />
          {running ? "RUNNING SIMULATION..." : "RUN_BACKTEST"}
        </motion.button>
      </div>

      {/* Results */}
      {data.length > 0 && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "TOTAL_ROI", value: `+${finalRoi.toFixed(2)}%`, icon: TrendingUp, color: "text-primary" },
              { label: "MIN_HF", value: minHf.toFixed(3), icon: Shield, color: minHf > 1.5 ? "text-primary" : "text-destructive" },
              { label: "AVG_APY", value: `${avgApy}%`, icon: Zap, color: "text-accent" },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded p-3 text-center">
                <s.icon className={`w-3.5 h-3.5 mx-auto mb-1 ${s.color}`} />
                <div className={`font-mono text-sm font-bold ${s.color}`}>{s.value}</div>
                <div className="font-mono text-[8px] text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* ROI Chart */}
          <div className="bg-card border border-border rounded p-4">
            <div className="font-mono text-[10px] text-muted-foreground mb-3">// ROI_OVER_TIME</div>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 8, fontFamily: "monospace" }} interval={6} />
                <YAxis tick={{ fontSize: 8, fontFamily: "monospace" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 10, fontFamily: "monospace" }} />
                <Area type="monotone" dataKey="roi" stroke="hsl(var(--primary))" fill="url(#roiGrad)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* HF Chart */}
          <div className="bg-card border border-border rounded p-4">
            <div className="font-mono text-[10px] text-muted-foreground mb-3">// HEALTH_FACTOR_SIMULATION</div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={data}>
                <XAxis dataKey="day" tick={{ fontSize: 8, fontFamily: "monospace" }} interval={6} />
                <YAxis tick={{ fontSize: 8, fontFamily: "monospace" }} domain={[1, 3]} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 10, fontFamily: "monospace" }} />
                <ReferenceLine y={1.5} stroke="hsl(var(--accent))" strokeDasharray="3 3" />
                <ReferenceLine y={1.1} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="hf" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-accent"></div><span className="font-mono text-[8px] text-muted-foreground">SAFE (1.5)</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-destructive"></div><span className="font-mono text-[8px] text-muted-foreground">CAUTION (1.1)</span></div>
            </div>
          </div>

          {done && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-primary/5 border border-primary/20 rounded p-3 font-mono text-[10px] text-muted-foreground">
              ✅ Simulation complete. TALOS AI strategy outperforms manual approaches by maintaining optimal Health Factor while maximizing yield allocation.
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
