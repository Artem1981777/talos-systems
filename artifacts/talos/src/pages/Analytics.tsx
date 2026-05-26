import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  useGetDecisionsSummary,
  useListDecisions,
  getGetDecisionsSummaryQueryKey,
  getListDecisionsQueryKey,
} from "@workspace/api-client-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { TrendingUp, Activity, BarChart2, Clock } from "lucide-react";

const COLORS = {
  ALLOCATE: "#00cc6a",
  "DE-RISK": "#ef4444",
  HOLD: "#06b6d4",
  other: "#8b5cf6",
};

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/50 rounded p-4 space-y-1 hover:border-primary/30 transition-colors"
    >
      <div className="font-mono text-[10px] text-muted-foreground tracking-wider">{label}</div>
      <div className="font-mono text-2xl font-bold" style={{ color: color ?? "hsl(var(--foreground))" }}>
        {value}
      </div>
      {sub && <div className="font-mono text-[10px] text-muted-foreground/50">{sub}</div>}
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/60 rounded px-3 py-2 font-mono text-xs shadow-lg">
      <div className="text-muted-foreground text-[10px] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span style={{ color: p.color }}>{p.value?.toFixed ? p.value.toFixed(4) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Analytics() {
  const { data: summary } = useGetDecisionsSummary({
    query: { refetchInterval: 30000, queryKey: getGetDecisionsSummaryQueryKey() },
  });
  const { data: decisionsData } = useListDecisions(
    { limit: 50, offset: 0 },
    { query: { refetchInterval: 30000, queryKey: getListDecisionsQueryKey({ limit: 50, offset: 0 }) } }
  );

  const [uptime, setUptime] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setUptime(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const decisions = decisionsData?.decisions ?? [];

  // ROI over time
  const roiHistory = decisions
    .slice()
    .reverse()
    .map((d, i) => ({
      t: new Date(d.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      roi: parseFloat((d.expectedRoi * 100).toFixed(4)),
      conf: parseFloat((d.confidence * 100).toFixed(1)),
      idx: i + 1,
    }));

  // Decision type distribution
  const typeCounts: Record<string, number> = {};
  decisions.forEach((d) => {
    const type = d.action.startsWith("ALLOCATE")
      ? "ALLOCATE"
      : d.action.startsWith("DE-RISK") || d.action.startsWith("DERISK")
      ? "DE-RISK"
      : d.action.startsWith("HOLD")
      ? "HOLD"
      : "other";
    typeCounts[type] = (typeCounts[type] ?? 0) + 1;
  });
  const pieData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

  // Protocol usage
  const protocolCounts: Record<string, number> = {};
  decisions.forEach((d) => {
    if (d.protocol) protocolCounts[d.protocol] = (protocolCounts[d.protocol] ?? 0) + 1;
  });
  const protocolData = Object.entries(protocolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name: name.split(" ")[0], count }));

  const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`;

  return (
    <div className="p-5 space-y-5 max-w-6xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-primary" />
          <h1 className="font-mono text-base font-bold tracking-wider">PERFORMANCE_ANALYTICS</h1>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground mt-0.5 pl-6">
          Agent performance metrics // Decision intelligence // Real-time
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="TOTAL_DECISIONS"
          value={String(summary?.totalDecisions ?? decisions.length)}
          sub="all-time cycles"
          color="#00cc6a"
        />
        <StatCard
          label="AVG_CONFIDENCE"
          value={`${((summary?.avgConfidence ?? 0) * 100).toFixed(0)}%`}
          sub="AI certainty score"
          color="#06b6d4"
        />
        <StatCard
          label="TOTAL_ROI"
          value={`${(summary?.totalRoiPercent ?? 0).toFixed(2)}%`}
          sub="cumulative yield"
          color={(summary?.totalRoiPercent ?? 0) >= 0 ? "#00cc6a" : "#ef4444"}
        />
        <StatCard
          label="SESSION_UPTIME"
          value={uptimeStr}
          sub="agent active time"
          color="#8b5cf6"
        />
      </div>

      {/* ROI + Confidence charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border/60 rounded p-4">
          <div className="font-mono text-[10px] text-muted-foreground/50 tracking-widest mb-3">
            // ROI_HISTORY
          </div>
          {roiHistory.length < 2 ? (
            <div className="flex items-center justify-center h-32 font-mono text-xs text-muted-foreground/40">
              NEED_2+_DECISIONS
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={roiHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="idx" tick={{ fontFamily: "monospace", fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontFamily: "monospace", fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="roi" stroke="#00cc6a" strokeWidth={1.5} dot={{ r: 2, fill: "#00cc6a" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card border border-border/60 rounded p-4">
          <div className="font-mono text-[10px] text-muted-foreground/50 tracking-widest mb-3">
            // CONFIDENCE_HISTORY
          </div>
          {roiHistory.length < 2 ? (
            <div className="flex items-center justify-center h-32 font-mono text-xs text-muted-foreground/40">
              NEED_2+_DECISIONS
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={roiHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="idx" tick={{ fontFamily: "monospace", fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis domain={[60, 100]} tick={{ fontFamily: "monospace", fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="conf" stroke="#06b6d4" strokeWidth={1.5} dot={{ r: 2, fill: "#06b6d4" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Pie + Protocol bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border/60 rounded p-4">
          <div className="font-mono text-[10px] text-muted-foreground/50 tracking-widest mb-3">
            // DECISION_DISTRIBUTION
          </div>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-32 font-mono text-xs text-muted-foreground/40">
              NO_DATA
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={130}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS] ?? COLORS.other} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[entry.name as keyof typeof COLORS] ?? COLORS.other }} />
                    <span className="font-mono text-[10px] text-muted-foreground">{entry.name}</span>
                    <span className="font-mono text-[10px] text-foreground ml-auto">{entry.value}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-card border border-border/60 rounded p-4">
          <div className="font-mono text-[10px] text-muted-foreground/50 tracking-widest mb-3">
            // PROTOCOL_USAGE
          </div>
          {protocolData.length === 0 ? (
            <div className="flex items-center justify-center h-32 font-mono text-xs text-muted-foreground/40">
              NO_DATA
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={protocolData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontFamily: "monospace", fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontFamily: "monospace", fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#00cc6a" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Agent metrics */}
      <div className="bg-card border border-border/60 rounded p-4">
        <div className="font-mono text-[10px] text-muted-foreground/50 tracking-widest mb-3">// AGENT_METRICS</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "EXECUTED", value: decisions.filter((d) => d.status === "executed").length, color: "#00cc6a" },
            { label: "SIMULATED", value: decisions.filter((d) => d.status === "simulated").length, color: "#06b6d4" },
            { label: "PENDING", value: decisions.filter((d) => d.status === "pending").length, color: "#f59e0b" },
            { label: "ON_CHAIN", value: decisions.filter((d) => d.txHash).length, color: "#8b5cf6" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="font-mono text-[10px] text-muted-foreground">{label}</div>
              <div className="font-mono text-xl font-bold" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="font-mono text-[10px] text-muted-foreground/40">
        // AUTO_REFRESH_30s // MANTLE_SEPOLIA // TALOS-Alpha-001
      </div>
    </div>
  );
}
