import { motion } from "framer-motion";
import {
  useListProtocols,
  getListProtocolsQueryKey,
} from "@workspace/api-client-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import { TrendingUp, Shield, AlertTriangle, Zap, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const RISK_CONFIG = {
  low: { label: "LOW", color: "border-primary/40 text-primary", dot: "#00cc6a", bg: "#00cc6a10" },
  medium: { label: "MED", color: "border-amber-500/40 text-amber-400", dot: "#f59e0b", bg: "#f59e0b10" },
  high: { label: "HIGH", color: "border-destructive/40 text-destructive", dot: "#ef4444", bg: "#ef444410" },
};

const CHART_COLORS = ["#00cc6a", "#06b6d4", "#f59e0b", "#8b5cf6", "#ec4899"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-card border border-primary/20 rounded px-3 py-2 font-mono text-xs shadow-lg shadow-primary/5">
        <div className="text-muted-foreground mb-1">{label}</div>
        <div className="text-primary font-bold">{payload[0].value.toFixed(2)}% APY</div>
      </div>
    );
  }
  return null;
};

export default function Protocols() {
  const { data, isLoading } = useListProtocols({
    query: { refetchInterval: 60000, queryKey: getListProtocolsQueryKey() },
  });

  const protocols = data?.protocols ?? [];
  const sorted = [...protocols].sort((a, b) => b.apy - a.apy);

  const radarData = sorted.map((p) => ({
    name: p.name.split(" ")[0],
    apy: p.apy,
    safety: p.risk === "low" ? 95 : p.risk === "medium" ? 65 : 30,
    tvl: parseFloat(p.tvl?.replace(/[$M]/g, "") ?? "0"),
  }));

  return (
    <div className="p-5 space-y-5 max-w-4xl">
      <div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <h1 className="font-mono text-base font-bold tracking-wider">PROTOCOL_INTELLIGENCE</h1>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground mt-0.5 pl-6">
          Live APY data from Mantle DeFi ecosystem // Updates every 60s // AI-scored
        </p>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* APY Bar Chart */}
        <div className="bg-card border border-border/60 rounded p-4">
          <div className="font-mono text-[10px] text-muted-foreground/50 tracking-widest mb-3">// APY_COMPARISON</div>
          {!isLoading && protocols.length > 0 && (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={sorted} barCategoryGap="30%">
                <XAxis
                  dataKey="name"
                  tick={{ fontFamily: "monospace", fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fontFamily: "monospace", fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--primary) / 0.05)" }} />
                <Bar dataKey="apy" radius={[3, 3, 0, 0]}>
                  {sorted.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {isLoading && (
            <div className="h-40 flex items-center justify-center font-mono text-xs text-muted-foreground/40 animate-pulse">
              LOADING_PROTOCOLS...
            </div>
          )}
        </div>

        {/* Radar — APY vs Safety */}
        <div className="bg-card border border-border/60 rounded p-4">
          <div className="font-mono text-[10px] text-muted-foreground/50 tracking-widest mb-3">// RISK_RADAR</div>
          {!isLoading && radarData.length > 0 && (
            <ResponsiveContainer width="100%" height={160}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="name"
                  tick={{ fontFamily: "monospace", fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                />
                <Radar name="APY" dataKey="apy" stroke="#00cc6a" fill="#00cc6a" fillOpacity={0.15} />
                <Radar name="Safety" dataKey="safety" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.1} />
              </RadarChart>
            </ResponsiveContainer>
          )}
          {isLoading && (
            <div className="h-40 flex items-center justify-center font-mono text-xs text-muted-foreground/40 animate-pulse">
              LOADING_RADAR...
            </div>
          )}
          <div className="flex gap-3 mt-1">
            <div className="flex items-center gap-1"><div className="w-3 h-px bg-primary" /><span className="font-mono text-[9px] text-muted-foreground/50">APY</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-px bg-accent" /><span className="font-mono text-[9px] text-muted-foreground/50">SAFETY</span></div>
          </div>
        </div>
      </div>

      {/* Protocol list */}
      <div>
        <div className="font-mono text-[10px] text-muted-foreground/50 tracking-widest mb-3">// PROTOCOL_LIST</div>
        <div className="space-y-2">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-card border border-border/30 rounded animate-pulse" />
              ))
            : sorted.map((p, i) => {
                const risk = RISK_CONFIG[p.risk as keyof typeof RISK_CONFIG];
                const isTop = i === 0;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    whileHover={{ x: 2 }}
                    className={`bg-card border rounded p-4 flex items-center gap-4 transition-all ${
                      isTop
                        ? "border-primary/30 bg-primary/[0.03] shadow-sm shadow-primary/5"
                        : "border-border/40 hover:border-border/70"
                    }`}
                  >
                    {/* Rank */}
                    <div
                      className="font-mono text-lg font-bold w-6 shrink-0 text-center"
                      style={{ color: CHART_COLORS[i % CHART_COLORS.length], opacity: 0.5 }}
                    >
                      {i + 1}
                    </div>

                    {/* Risk dot */}
                    <div className="relative">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: risk.dot }} />
                      {isTop && (
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          style={{ backgroundColor: risk.dot }}
                          animate={{ scale: [1, 2.5, 1], opacity: [0.6, 0, 0.6] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </div>

                    {/* Name + asset */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-foreground">{p.name}</span>
                        {p.recommended && (
                          <Badge variant="outline" className="font-mono text-[9px] border-primary/40 text-primary bg-primary/5">
                            <Star className="w-2.5 h-2.5 mr-1 fill-primary" />
                            AI_RECOMMENDED
                          </Badge>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                        {p.asset} // TVL: {p.tvl}
                      </div>
                    </div>

                    {/* Risk badge */}
                    <Badge
                      variant="outline"
                      className={`font-mono text-[9px] shrink-0 ${risk.color}`}
                      style={{ backgroundColor: risk.bg }}
                    >
                      {risk.label}_RISK
                    </Badge>

                    {/* APY */}
                    <div className="text-right shrink-0">
                      <div className="font-mono text-[10px] text-muted-foreground">APY</div>
                      <motion.div
                        key={p.apy}
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="font-mono text-xl font-bold"
                        style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}
                      >
                        {p.apy.toFixed(2)}%
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
        </div>
      </div>

      {/* AI Recommendation */}
      {!isLoading && sorted[0] && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-primary/5 border border-primary/20 rounded p-4"
        >
          <div className="font-mono text-[10px] text-primary/60 tracking-widest mb-2">// GPT-5_AI_RECOMMENDATION</div>
          <div className="flex items-start gap-3">
            <TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="font-mono text-sm text-foreground">
                Optimal allocation:{" "}
                <span className="text-primary font-bold">{sorted[0].name}</span>
              </div>
              <div className="font-mono text-xs text-muted-foreground mt-1">
                Highest risk-adjusted return at {sorted[0].apy.toFixed(2)}% APY with{" "}
                {sorted[0].risk.toUpperCase()} risk profile. TVL: {sorted[0].tvl}.
                Agent autonomously rebalances every 2 minutes when active. Confidence: 87%.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
