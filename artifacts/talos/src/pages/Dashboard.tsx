import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetAgentStatus,
  useGetVaultStats,
  useGetDecisionsSummary,
  useTriggerAgentThink,
  useUpdateAgentStatus,
  getGetAgentStatusQueryKey,
  getGetVaultStatsQueryKey,
  getGetDecisionsSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Play, Pause, Zap, Cpu, ChevronUp, ChevronDown,
  TrendingUp, Shield, Activity, GitBranch, Timer,
  CheckCircle, Circle, ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HFPoint { t: string; hf: number; }

// ─── Auto-cycle hook ──────────────────────────────────────────────────────────

function useAutoCycle(isRunning: boolean, onCycle: () => void, intervalMs = 120_000) {
  const [countdown, setCountdown] = useState(intervalMs / 1000);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (!isRunning) { setCountdown(intervalMs / 1000); return; }
    startRef.current = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, Math.ceil((intervalMs - elapsed) / 1000));
      setCountdown(remaining);
      if (remaining === 0) {
        onCycle();
        startRef.current = Date.now();
        setCountdown(intervalMs / 1000);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [isRunning, onCycle, intervalMs]);

  return countdown;
}

// ─── Agent State Machine Viz ──────────────────────────────────────────────────

type AgentNode = "OBSERVE" | "ANALYZE" | "DECIDE" | "EXECUTE" | "REFLECT";
const NODES: AgentNode[] = ["OBSERVE", "ANALYZE", "DECIDE", "EXECUTE", "REFLECT"];
const NODE_COLORS: Record<AgentNode, string> = {
  OBSERVE: "#06b6d4",
  ANALYZE: "#f59e0b",
  DECIDE: "#00cc6a",
  EXECUTE: "#8b5cf6",
  REFLECT: "#ec4899",
};

function AgentStateMachine({ thinking, lastCycleAt }: { thinking: boolean; lastCycleAt: string | null }) {
  const [activeNode, setActiveNode] = useState<AgentNode | null>(null);
  const [visitedNodes, setVisitedNodes] = useState<Set<AgentNode>>(new Set());

  useEffect(() => {
    if (!thinking) { setActiveNode(null); return; }
    let i = 0;
    setVisitedNodes(new Set());
    const advance = () => {
      if (i >= NODES.length) { setActiveNode(null); return; }
      const node = NODES[i];
      setActiveNode(node);
      setVisitedNodes((prev) => new Set([...prev, node]));
      i++;
      if (i < NODES.length) setTimeout(advance, 600);
    };
    advance();
  }, [thinking]);

  return (
    <div className="bg-card border border-border/60 rounded p-4">
      <div className="font-mono text-[10px] text-muted-foreground/60 tracking-widest mb-4">
        // AGENT_WORKFLOW // LangGraph State Machine
      </div>
      <div className="flex items-center gap-1">
        {NODES.map((node, i) => {
          const color = NODE_COLORS[node];
          const isActive = activeNode === node;
          const visited = visitedNodes.has(node);
          return (
            <div key={node} className="flex items-center gap-1 flex-1">
              <motion.div
                className="flex-1 flex flex-col items-center gap-1"
                animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 0.4, repeat: isActive ? Infinity : 0 }}
              >
                <div
                  className="w-full py-1.5 rounded border font-mono text-[9px] text-center relative overflow-hidden"
                  style={{
                    borderColor: visited || isActive ? color : "hsl(var(--border))",
                    color: visited || isActive ? color : "hsl(var(--muted-foreground))",
                    backgroundColor: isActive ? `${color}15` : visited ? `${color}08` : "transparent",
                  }}
                >
                  {isActive && (
                    <motion.div
                      className="absolute inset-0"
                      style={{ background: `linear-gradient(90deg, transparent, ${color}20, transparent)` }}
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                  )}
                  <span className="relative z-10">{node}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {visited ? (
                    <CheckCircle className="w-2.5 h-2.5" style={{ color }} />
                  ) : (
                    <Circle className="w-2.5 h-2.5 text-border" />
                  )}
                </div>
              </motion.div>
              {i < NODES.length - 1 && (
                <ArrowRight
                  className="w-3 h-3 shrink-0 mb-3"
                  style={{ color: visited ? NODE_COLORS[NODES[i + 1]] : "hsl(var(--border))" }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 font-mono text-[9px] text-muted-foreground/40">
        {thinking
          ? `PROCESSING... → ${activeNode ?? "COMPLETE"}`
          : lastCycleAt
          ? `LAST_CYCLE: ${new Date(lastCycleAt).toLocaleTimeString()}`
          : "AWAITING_ACTIVATION"}
      </div>
    </div>
  );
}

// ─── Health Gauge ─────────────────────────────────────────────────────────────

function HealthGauge({ value }: { value: number }) {
  const pct = Math.min(100, (value / 3) * 100);
  const color = value >= 1.5 ? "#00cc6a" : value >= 1.1 ? "#f59e0b" : "#ef4444";
  const label = value >= 1.5 ? "SAFE" : value >= 1.1 ? "CAUTION" : "CRITICAL";

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="font-mono text-xs text-muted-foreground">HEALTH_FACTOR</span>
        <motion.span
          key={value}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-mono text-2xl font-bold"
          style={{ color }}
        >
          {value.toFixed(4)}
        </motion.span>
      </div>
      <div className="h-2 bg-border/50 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full relative"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <motion.div
            className="absolute right-0 top-0 bottom-0 w-3 rounded-full opacity-80"
            style={{ background: `radial-gradient(circle, white, ${color})` }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
      </div>
      <div className="flex justify-between">
        <span className="font-mono text-[10px] text-muted-foreground/40">CRITICAL (0.0)</span>
        <motion.span
          className="font-mono text-[10px] font-bold px-2 py-0.5 rounded border"
          style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}
          animate={{ opacity: value < 1.2 ? [1, 0.5, 1] : 1 }}
          transition={{ duration: 0.8, repeat: value < 1.2 ? Infinity : 0 }}
        >
          {label}
        </motion.span>
        <span className="font-mono text-[10px] text-muted-foreground/40">OPTIMAL (3.0)</span>
      </div>
    </div>
  );
}

// ─── Stat Box ─────────────────────────────────────────────────────────────────

function StatBox({
  label, value, sub, accent, pulse,
}: {
  label: string; value: string; sub?: string; accent?: boolean; pulse?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/50 rounded p-3 space-y-1 relative overflow-hidden group hover:border-primary/30 transition-colors"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="font-mono text-[10px] text-muted-foreground tracking-wider">{label}</div>
      <motion.div
        key={value}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`font-mono text-xl font-bold ${accent ? "text-primary" : "text-foreground"}`}
      >
        {pulse && accent ? (
          <motion.span animate={{ opacity: [1, 0.6, 1] }} transition={{ duration: 2, repeat: Infinity }}>
            {value}
          </motion.span>
        ) : (
          value
        )}
      </motion.div>
      {sub && <div className="font-mono text-[10px] text-muted-foreground/50">{sub}</div>}
    </motion.div>
  );
}

// ─── HF History Chart ─────────────────────────────────────────────────────────

const HF_TOOLTIP = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const v = payload[0].value as number;
  const color = v >= 1.5 ? "#00cc6a" : v >= 1.1 ? "#f59e0b" : "#ef4444";
  return (
    <div className="bg-card border border-border/60 rounded px-2 py-1.5 font-mono text-xs">
      <div className="text-muted-foreground">{payload[0].payload.t}</div>
      <div style={{ color }} className="font-bold">HF: {v.toFixed(4)}</div>
    </div>
  );
};

// ─── Auto Cycle Timer ─────────────────────────────────────────────────────────

function AutoCycleTimer({ countdown, isRunning, total = 120 }: { countdown: number; isRunning: boolean; total?: number }) {
  const pct = isRunning ? ((total - countdown) / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-8 h-8">
        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="13" fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
          <motion.circle
            cx="16" cy="16" r="13"
            fill="none"
            stroke={isRunning ? "#00cc6a" : "hsl(var(--muted-foreground))"}
            strokeWidth="2"
            strokeDasharray={`${2 * Math.PI * 13}`}
            strokeDashoffset={`${2 * Math.PI * 13 * (1 - pct / 100)}`}
            strokeLinecap="round"
            transition={{ duration: 1 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Timer className={`w-3 h-3 ${isRunning ? "text-primary" : "text-muted-foreground"}`} />
        </div>
      </div>
      <div>
        <div className="font-mono text-[10px] text-muted-foreground">NEXT_CYCLE</div>
        <div className={`font-mono text-sm font-bold ${isRunning ? "text-primary" : "text-muted-foreground"}`}>
          {isRunning ? `${countdown}s` : "PAUSED"}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const qc = useQueryClient();
  const [thought, setThought] = useState<{ reasoning: string; action: string; confidence: number } | null>(null);
  const [showThought, setShowThought] = useState(false);
  const [hfHistory, setHfHistory] = useState<HFPoint[]>([]);

  const { data: agent, isLoading: agentLoading } = useGetAgentStatus({
    query: { refetchInterval: 10000, queryKey: getGetAgentStatusQueryKey() },
  });
  const { data: vault, isLoading: vaultLoading } = useGetVaultStats({
    query: { refetchInterval: 15000, queryKey: getGetVaultStatsQueryKey() },
  });
  const { data: summary } = useGetDecisionsSummary({
    query: { refetchInterval: 30000, queryKey: getGetDecisionsSummaryQueryKey() },
  });

  const { mutate: triggerThink, isPending: thinking } = useTriggerAgentThink({
    mutation: {
      onSuccess: (data) => {
        setThought(data);
        setShowThought(true);
        qc.invalidateQueries({ queryKey: getGetAgentStatusQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDecisionsSummaryQueryKey() });
      },
    },
  });

  const { mutate: updateStatus } = useUpdateAgentStatus({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetAgentStatusQueryKey() }),
    },
  });

  // Track HF history
  useEffect(() => {
    if (!vault?.healthFactor) return;
    const point: HFPoint = {
      t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      hf: vault.healthFactor,
    };
    setHfHistory((prev) => [...prev.slice(-29), point]);
  }, [vault?.healthFactor]);

  const countdown = useAutoCycle(
    agent?.isRunning ?? false,
    () => triggerThink(),
    120_000,
  );

  const toggleAgent = () => {
    if (!agent) return;
    updateStatus({ data: { isRunning: !agent.isRunning, mode: agent.isRunning ? "paused" : "autonomous" } });
  };

  return (
    <div className="p-5 space-y-5 max-w-6xl">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h1 className="font-mono text-base font-bold tracking-wider">SYSTEM_DASHBOARD</h1>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground mt-0.5 pl-6">
            {vault?.network ?? "MANTLE_SEPOLIA"} // BLOCK #{vault?.blockNumber?.toLocaleString() ?? "..."}
            <span className={`ml-2 ${vault?.rpcOk ? "text-primary" : "text-amber-400"}`}>
              // RPC: {vault?.rpcOk ? "LIVE" : "FALLBACK"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AutoCycleTimer countdown={countdown} isRunning={agent?.isRunning ?? false} />
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleAgent}
              disabled={agentLoading}
              className={`flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs border transition-all ${
                agent?.isRunning
                  ? "border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                  : "border-primary/40 text-primary hover:bg-primary/10"
              }`}
            >
              {agent?.isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {agent?.isRunning ? "PAUSE" : "ACTIVATE"}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => triggerThink()}
              disabled={thinking}
              className="flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs border border-accent/40 text-accent hover:bg-accent/10 transition-all disabled:opacity-50"
            >
              <Zap className={`w-3 h-3 ${thinking ? "animate-pulse" : ""}`} />
              {thinking ? "THINKING..." : "RUN_CYCLE"}
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Agent State Machine ── */}
      <AgentStateMachine thinking={thinking} lastCycleAt={agent?.lastCycleAt ?? null} />

      {/* ── Agent Think Panel ── */}
      <AnimatePresence>
        {showThought && thought && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-primary/5 border border-primary/25 rounded overflow-hidden"
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <Cpu className="w-3.5 h-3.5 text-primary" />
                  </motion.div>
                  <span className="font-mono text-xs text-primary font-bold">GPT-5 CHAIN_OF_THOUGHT</span>
                  <Badge variant="outline" className="font-mono text-[10px] border-primary/30 text-primary">
                    {(thought.confidence * 100).toFixed(0)}% CONFIDENCE
                  </Badge>
                  <Badge variant="outline" className="font-mono text-[10px] border-accent/30 text-accent">
                    LIVE_AI
                  </Badge>
                </div>
                <button onClick={() => setShowThought(false)} className="text-muted-foreground hover:text-foreground">
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
              <pre className="font-mono text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed border-l-2 border-primary/30 pl-3 max-h-60 overflow-auto">
                {thought.reasoning}
              </pre>
              <div className="flex items-center gap-2">
                <ArrowRight className="w-3.5 h-3.5 text-accent shrink-0" />
                <div className="font-mono text-xs text-accent font-bold">{thought.action}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Vault Metrics ── */}
      <div>
        <div className="font-mono text-[10px] text-muted-foreground/50 tracking-widest mb-2">// VAULT_METRICS</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox
            label="TOTAL_ASSETS"
            value={vaultLoading ? "---" : `${parseFloat(vault?.totalAssets ?? "0").toFixed(4)}`}
            sub="mETH on-chain"
            accent pulse
          />
          <StatBox
            label="ETH_PRICE"
            value={vaultLoading ? "---" : `$${parseFloat(vault?.ethPrice ?? "0").toLocaleString()}`}
            sub="live feed"
          />
          <StatBox
            label="COLLATERAL_USD"
            value={vaultLoading ? "---" : `$${vault?.collateralUsd?.toLocaleString() ?? "0"}`}
            sub="80% LTV applied"
          />
          <StatBox
            label="VAULT_APY"
            value={vaultLoading ? "---" : `${vault?.apy ?? 0}%`}
            sub="current yield"
            accent
          />
        </div>
      </div>

      {/* ── Health Gauge + HF History ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border/60 rounded p-4 space-y-4">
          {vaultLoading ? (
            <div className="font-mono text-xs text-muted-foreground animate-pulse">FETCHING_CHAIN_DATA...</div>
          ) : (
            <HealthGauge value={vault?.healthFactor ?? 0} />
          )}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/30">
            <div>
              <div className="font-mono text-[10px] text-muted-foreground">DEBT_USD</div>
              <div className="font-mono text-base font-bold text-destructive">
                ${vault?.debtUsd?.toLocaleString() ?? "0"}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] text-muted-foreground">mETH_PRICE</div>
              <div className="font-mono text-base font-bold">
                ${parseFloat(vault?.mEthPrice ?? "0").toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* HF History Chart */}
        <div className="bg-card border border-border/60 rounded p-4">
          <div className="font-mono text-[10px] text-muted-foreground/50 tracking-widest mb-3">
            // HEALTH_FACTOR_HISTORY
          </div>
          {hfHistory.length < 2 ? (
            <div className="flex items-center justify-center h-28 font-mono text-xs text-muted-foreground/40">
              ACCUMULATING_DATA...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={110}>
              <LineChart data={hfHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="t" hide />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontFamily: "monospace", fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<HF_TOOLTIP />} />
                <ReferenceLine y={1.5} stroke="#00cc6a" strokeDasharray="3 3" strokeOpacity={0.4} />
                <ReferenceLine y={1.1} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.4} />
                <ReferenceLine y={1.0} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
                <Line
                  type="monotone"
                  dataKey="hf"
                  stroke="#00cc6a"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, fill: "#00cc6a" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center gap-3 mt-1">
            {[{ color: "#00cc6a", label: "SAFE (1.5)" }, { color: "#f59e0b", label: "CAUTION (1.1)" }, { color: "#ef4444", label: "LIQUIDATION (1.0)" }].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className="w-2 h-px" style={{ backgroundColor: color }} />
                <span className="font-mono text-[9px] text-muted-foreground/50">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Agent Status ── */}
      <div className="bg-card border border-border/60 rounded p-4">
        <div className="font-mono text-[10px] text-muted-foreground/50 tracking-widest mb-3">// AGENT_STATUS</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="font-mono text-[10px] text-muted-foreground">MODE</div>
            <Badge
              variant="outline"
              className={`mt-1 font-mono text-xs ${
                agent?.mode === "autonomous"
                  ? "border-primary/40 text-primary bg-primary/5"
                  : agent?.mode === "simulation"
                  ? "border-accent/40 text-accent"
                  : "border-muted-foreground/40 text-muted-foreground"
              }`}
            >
              {agent?.mode?.toUpperCase() ?? "---"}
            </Badge>
          </div>
          <div>
            <div className="font-mono text-[10px] text-muted-foreground">REPUTATION</div>
            <div className="font-mono text-lg font-bold text-primary mt-0.5">{agent?.reputationScore ?? 0} pts</div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-muted-foreground">DECISIONS</div>
            <div className="font-mono text-lg font-bold mt-0.5">{agent?.totalDecisions ?? 0}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-muted-foreground">TOTAL_ROI</div>
            <div
              className={`font-mono text-lg font-bold mt-0.5 ${
                (agent?.totalRoiPercent ?? 0) >= 0 ? "text-primary" : "text-destructive"
              }`}
            >
              {agent?.totalRoiPercent?.toFixed(2) ?? "0.00"}%
            </div>
          </div>
        </div>
      </div>

      {/* ── Decision Summary ── */}
      {summary && (
        <div>
          <div className="font-mono text-[10px] text-muted-foreground/50 tracking-widest mb-2">
            // DECISION_SUMMARY
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox label="TOTAL_DECISIONS" value={String(summary.totalDecisions)} />
            <StatBox label="EXECUTED" value={String(summary.executedDecisions)} accent />
            <StatBox label="AVG_CONFIDENCE" value={`${(summary.avgConfidence * 100).toFixed(0)}%`} />
            <StatBox label="TOP_PROTOCOL" value={summary.topProtocol} sub="most used" />
          </div>
        </div>
      )}

      {vault?.lastUpdated && (
        <div className="font-mono text-[10px] text-muted-foreground/30">
          LAST_SYNC: {new Date(vault.lastUpdated).toISOString()} // AUTO-REFRESH_ACTIVE // GPT-5_REASONING_ENABLED
        </div>
      )}
    </div>
  );
}
