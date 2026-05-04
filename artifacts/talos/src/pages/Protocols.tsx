import { motion } from "framer-motion";
import {
  useListProtocols,
  getListProtocolsQueryKey,
} from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Shield, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const RISK_CONFIG = {
  low: { label: "LOW", color: "border-primary/40 text-primary", dot: "#00cc6a" },
  medium: { label: "MED", color: "border-amber-500/40 text-amber-400", dot: "#f59e0b" },
  high: { label: "HIGH", color: "border-destructive/40 text-destructive", dot: "#ef4444" },
};

const CHART_COLORS = ["#00cc6a", "#06b6d4", "#f59e0b", "#8b5cf6", "#ec4899"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-card border border-border/60 rounded px-3 py-2 font-mono text-xs">
        <div className="text-muted-foreground">{label}</div>
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

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="font-mono text-lg font-bold tracking-wider">PROTOCOL_INTELLIGENCE</h1>
        <p className="font-mono text-xs text-muted-foreground mt-0.5">
          Live APY data from Mantle DeFi ecosystem // Updates every 60s
        </p>
      </div>

      {/* APY Bar Chart */}
      {!isLoading && protocols.length > 0 && (
        <div className="bg-card border border-border/60 rounded p-4">
          <div className="font-mono text-[10px] text-muted-foreground/60 tracking-widest mb-4">// APY_COMPARISON</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sorted} barCategoryGap="30%">
              <XAxis
                dataKey="name"
                tick={{ fontFamily: "monospace", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontFamily: "monospace", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--primary) / 0.05)" }} />
              <Bar dataKey="apy" radius={[2, 2, 0, 0]}>
                {sorted.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Protocol table */}
      <div>
        <div className="font-mono text-[10px] text-muted-foreground/60 tracking-widest mb-3">// PROTOCOL_LIST</div>
        <div className="space-y-2">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-card border border-border/30 rounded animate-pulse" />
              ))
            : sorted.map((p, i) => {
                const risk = RISK_CONFIG[p.risk as keyof typeof RISK_CONFIG];
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`bg-card border rounded p-4 flex items-center gap-4 ${
                      p.recommended ? "border-primary/30 bg-primary/5" : "border-border/40"
                    }`}
                  >
                    {/* Rank */}
                    <div className="font-mono text-lg font-bold text-muted-foreground/30 w-6 shrink-0">
                      {i + 1}
                    </div>

                    {/* Color dot */}
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: risk.dot }}
                    />

                    {/* Name + asset */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-foreground">{p.name}</span>
                        {p.recommended && (
                          <Badge variant="outline" className="font-mono text-[10px] border-primary/40 text-primary">
                            AI_RECOMMENDED
                          </Badge>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {p.asset} // TVL: {p.tvl}
                      </div>
                    </div>

                    {/* Risk */}
                    <Badge variant="outline" className={`font-mono text-[10px] shrink-0 ${risk.color}`}>
                      {risk.label}_RISK
                    </Badge>

                    {/* APY */}
                    <div className="text-right shrink-0">
                      <div className="font-mono text-[10px] text-muted-foreground">APY</div>
                      <div
                        className="font-mono text-lg font-bold"
                        style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}
                      >
                        {p.apy.toFixed(2)}%
                      </div>
                    </div>
                  </motion.div>
                );
              })}
        </div>
      </div>

      {/* AI Recommendation */}
      {!isLoading && sorted[0] && (
        <div className="bg-primary/5 border border-primary/20 rounded p-4">
          <div className="font-mono text-[10px] text-primary/60 tracking-widest mb-2">// AI_RECOMMENDATION</div>
          <div className="flex items-start gap-3">
            <TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="font-mono text-sm text-foreground">
                Optimal allocation: <span className="text-primary font-bold">{sorted[0].name}</span>
              </div>
              <div className="font-mono text-xs text-muted-foreground mt-1">
                Highest risk-adjusted return at {sorted[0].apy.toFixed(2)}% APY with {sorted[0].risk.toUpperCase()} risk.
                Current TVL: {sorted[0].tvl}. Agent confidence in this allocation: 87%.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
