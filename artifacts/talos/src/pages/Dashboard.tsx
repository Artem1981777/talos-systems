import { useState } from "react";
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
import { Play, Pause, Zap, AlertTriangle, TrendingUp, Shield, Cpu, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function HealthGauge({ value }: { value: number }) {
  const pct = Math.min(100, (value / 3) * 100);
  const color = value >= 1.5 ? "#00cc6a" : value >= 1.1 ? "#f59e0b" : "#ef4444";
  const label = value >= 1.5 ? "SAFE" : value >= 1.1 ? "CAUTION" : "CRITICAL";
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="font-mono text-xs text-muted-foreground">HEALTH_FACTOR</span>
        <span className="font-mono text-lg font-bold" style={{ color }}>{value.toFixed(3)}</span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between">
        <span className="font-mono text-[10px] text-muted-foreground/50">0</span>
        <span className="font-mono text-[10px]" style={{ color }}>{label}</span>
        <span className="font-mono text-[10px] text-muted-foreground/50">3+</span>
      </div>
    </div>
  );
}

function StatBox({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/60 rounded p-3 space-y-1"
    >
      <div className="font-mono text-[10px] text-muted-foreground tracking-wider">{label}</div>
      <div className={`font-mono text-xl font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
      {sub && <div className="font-mono text-[10px] text-muted-foreground/60">{sub}</div>}
    </motion.div>
  );
}

export default function Dashboard() {
  const qc = useQueryClient();
  const [thought, setThought] = useState<{ reasoning: string; action: string; confidence: number } | null>(null);
  const [showThought, setShowThought] = useState(false);

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

  const toggleAgent = () => {
    if (!agent) return;
    updateStatus({ data: { isRunning: !agent.isRunning } });
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-lg font-bold text-foreground tracking-wider">SYSTEM_DASHBOARD</h1>
          <p className="font-mono text-xs text-muted-foreground mt-0.5">
            {vault?.network ?? "MANTLE_SEPOLIA"} // BLOCK #{vault?.blockNumber?.toLocaleString() ?? "..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAgent}
            disabled={agentLoading}
            className={`flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs border transition-all ${
              agent?.isRunning
                ? "border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                : "border-primary/40 text-primary hover:bg-primary/10"
            }`}
          >
            {agent?.isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {agent?.isRunning ? "PAUSE_AGENT" : "START_AGENT"}
          </button>
          <button
            onClick={() => triggerThink()}
            disabled={thinking}
            className="flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs border border-accent/40 text-accent hover:bg-accent/10 transition-all disabled:opacity-50"
          >
            <Zap className="w-3 h-3" />
            {thinking ? "THINKING..." : "RUN_CYCLE"}
          </button>
        </div>
      </div>

      {/* Agent Think Panel */}
      <AnimatePresence>
        {showThought && thought && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-primary/5 border border-primary/20 rounded p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-primary animate-pulse" />
                <span className="font-mono text-xs text-primary font-bold">AGENT_CHAIN_OF_THOUGHT</span>
                <Badge variant="outline" className="font-mono text-[10px] border-primary/30 text-primary">
                  {(thought.confidence * 100).toFixed(0)}% CONFIDENCE
                </Badge>
              </div>
              <button onClick={() => setShowThought(false)} className="text-muted-foreground hover:text-foreground">
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
            <pre className="font-mono text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed border-l-2 border-primary/30 pl-3">
              {thought.reasoning}
            </pre>
            <div className="font-mono text-xs text-accent font-bold">&gt; ACTION: {thought.action}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vault stats */}
      <div>
        <div className="font-mono text-[10px] text-muted-foreground/60 tracking-widest mb-2">// VAULT_METRICS</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox
            label="TOTAL_ASSETS"
            value={vaultLoading ? "---" : `${parseFloat(vault?.totalAssets ?? "0").toFixed(4)}`}
            sub="mETH"
            accent
          />
          <StatBox
            label="ETH_PRICE"
            value={vaultLoading ? "---" : `$${parseFloat(vault?.ethPrice ?? "0").toLocaleString()}`}
            sub="via Pyth Oracle"
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

      {/* Health factor + Agent status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border/60 rounded p-4">
          {vaultLoading ? (
            <div className="font-mono text-xs text-muted-foreground animate-pulse">FETCHING_CHAIN_DATA...</div>
          ) : (
            <HealthGauge value={vault?.healthFactor ?? 0} />
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-border/30">
            <div>
              <div className="font-mono text-[10px] text-muted-foreground">DEBT_USD</div>
              <div className="font-mono text-sm font-bold text-destructive">${vault?.debtUsd?.toLocaleString() ?? "0"}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] text-muted-foreground">mETH_PRICE</div>
              <div className="font-mono text-sm font-bold">${parseFloat(vault?.mEthPrice ?? "0").toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded p-4 space-y-3">
          <div className="font-mono text-[10px] text-muted-foreground/60 tracking-widest">// AGENT_STATUS</div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm">MODE</span>
            <Badge
              variant="outline"
              className={`font-mono text-xs ${
                agent?.mode === "autonomous"
                  ? "border-primary/40 text-primary"
                  : agent?.mode === "simulation"
                  ? "border-accent/40 text-accent"
                  : "border-muted-foreground/40 text-muted-foreground"
              }`}
            >
              {agent?.mode?.toUpperCase() ?? "---"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm">REPUTATION</span>
            <span className="font-mono text-sm font-bold text-primary">{agent?.reputationScore ?? 0} pts</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm">DECISIONS</span>
            <span className="font-mono text-sm font-bold">{agent?.totalDecisions ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm">TOTAL_ROI</span>
            <span className={`font-mono text-sm font-bold ${(agent?.totalRoiPercent ?? 0) >= 0 ? "text-primary" : "text-destructive"}`}>
              {agent?.totalRoiPercent?.toFixed(2) ?? "0.00"}%
            </span>
          </div>
          {agent?.lastCycleAt && (
            <div className="pt-2 border-t border-border/30">
              <div className="font-mono text-[10px] text-muted-foreground/60">
                LAST_CYCLE: {new Date(agent.lastCycleAt).toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary stats */}
      {summary && (
        <div>
          <div className="font-mono text-[10px] text-muted-foreground/60 tracking-widest mb-2">// DECISION_SUMMARY</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox label="TOTAL_DECISIONS" value={String(summary.totalDecisions)} />
            <StatBox label="EXECUTED" value={String(summary.executedDecisions)} accent />
            <StatBox label="AVG_CONFIDENCE" value={`${(summary.avgConfidence * 100).toFixed(0)}%`} />
            <StatBox label="TOP_PROTOCOL" value={summary.topProtocol} sub="most used" />
          </div>
        </div>
      )}

      {/* Last updated */}
      {vault?.lastUpdated && (
        <div className="font-mono text-[10px] text-muted-foreground/40">
          LAST_SYNC: {new Date(vault.lastUpdated).toISOString()} // AUTO-REFRESH ACTIVE
        </div>
      )}
    </div>
  );
}
