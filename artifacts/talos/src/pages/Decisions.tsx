import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useListDecisions,
  useGetDecisionsSummary,
  getListDecisionsQueryKey,
  getGetDecisionsSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ExternalLink, RefreshCw, Link2, Zap, Download, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS: Record<string, string> = {
  executed: "border-primary/40 text-primary",
  simulated: "border-accent/40 text-accent",
  pending: "border-amber-500/40 text-amber-400",
  failed: "border-destructive/40 text-destructive",
};

const STATUS_DOT: Record<string, string> = {
  executed: "bg-primary",
  simulated: "bg-accent",
  pending: "bg-amber-400",
  failed: "bg-destructive",
};

/** Polling-based "stream" hook — syncs chain every INTERVAL ms and fires onNewDecisions */
function useChainStream(onNewDecisions: (count: number) => void) {
  const [streamStatus, setStreamStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const onNewRef = useRef(onNewDecisions);
  onNewRef.current = onNewDecisions;

  useEffect(() => {
    let destroyed = false;

    async function poll() {
      try {
        const apiBase = import.meta.env.VITE_API_URL || '';
        const res = await fetch(apiBase + "/api/agent/sync", { method: "POST" });
        if (!res.ok) throw new Error("sync failed");
        const data: { synced: number } = await res.json();
        if (!destroyed) {
          setStreamStatus("live");
          if (data.synced > 0) onNewRef.current(data.synced);
        }
      } catch {
        if (!destroyed) setStreamStatus("offline");
      }
    }

    // Initial sync shortly after mount
    const initialTimer = setTimeout(() => {
      if (!destroyed) {
        setStreamStatus("live");
        poll();
      }
    }, 500);

    // Regular poll every 45s
    const interval = setInterval(() => {
      if (!destroyed) poll();
    }, 45_000);

    return () => {
      destroyed = true;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  return streamStatus;
}

function StreamIndicator({ status }: { status: "connecting" | "live" | "offline" }) {
  const label = status === "live" ? "LIVE" : status === "connecting" ? "CONNECTING" : "OFFLINE";
  const color =
    status === "live" ? "text-primary" : status === "connecting" ? "text-amber-400" : "text-destructive";
  const dot =
    status === "live" ? "bg-primary animate-pulse" : status === "connecting" ? "bg-amber-400 animate-ping" : "bg-destructive";

  return (
    <div className={`flex items-center gap-1.5 font-mono text-[10px] ${color}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </div>
  );
}

function NewEventToast({ count, onDismiss }: { count: number; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/30 rounded font-mono text-sm text-primary shadow-lg shadow-primary/10"
    >
      <Zap className="w-3.5 h-3.5 shrink-0" />
      {count} NEW ON-CHAIN EVENT{count > 1 ? "S" : ""} DETECTED
    </motion.div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 85 ? "#00cc6a" : pct >= 70 ? "#06b6d4" : "#f59e0b";
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
      <span className="font-mono text-xs shrink-0" style={{ color }}>{pct}%</span>
    </div>
  );
}

function DecisionRow({ decision, index, isNew }: { decision: any; index: number; isNew?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const isOnChain = !!decision.txHash;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`border rounded overflow-hidden transition-colors ${
        isNew
          ? "border-primary/60 bg-primary/[0.06] shadow-sm shadow-primary/10"
          : isOnChain && decision.status === "executed"
          ? "border-primary/30 bg-primary/[0.03]"
          : "border-border/40 bg-card/50"
      }`}
    >
      <button
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-sidebar-accent/40 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[decision.status] ?? "bg-muted"}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-foreground truncate">{decision.action}</span>
            {isOnChain && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded text-[10px] font-mono text-primary shrink-0">
                <Link2 className="w-2.5 h-2.5" />
                ON-CHAIN
              </span>
            )}
            {isNew && (
              <span className="px-1.5 py-0.5 bg-accent/10 border border-accent/30 rounded text-[10px] font-mono text-accent shrink-0 animate-pulse">
                NEW
              </span>
            )}
          </div>
          <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
            {decision.protocol} // {decision.amount} // {new Date(decision.createdAt).toLocaleString()}
          </div>
        </div>

        <div className="shrink-0 hidden md:flex items-center gap-4">
          <ConfidenceBar value={decision.confidence} />
          <Badge variant="outline" className={`font-mono text-[10px] ${STATUS_COLORS[decision.status] ?? ""}`}>
            {decision.status.toUpperCase()}
          </Badge>
        </div>

        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
              <div className="font-mono text-[10px] text-muted-foreground/60 tracking-widest">// CHAIN_OF_THOUGHT</div>
              <pre className="font-mono text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed border-l-2 border-primary/20 pl-3">
                {decision.chainOfThought}
              </pre>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-border/20">
                <div>
                  <div className="font-mono text-[10px] text-muted-foreground">AMOUNT</div>
                  <div className="font-mono text-sm font-bold">{decision.amount}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-muted-foreground">EXP_ROI</div>
                  <div className="font-mono text-sm font-bold text-accent">
                    {(decision.expectedRoi * 100).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-muted-foreground">ACTUAL_ROI</div>
                  <div className={`font-mono text-sm font-bold ${decision.actualRoi != null ? "text-primary" : "text-muted-foreground"}`}>
                    {decision.actualRoi != null ? `${(decision.actualRoi * 100).toFixed(2)}%` : "PENDING"}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-muted-foreground">CONFIDENCE</div>
                  <ConfidenceBar value={decision.confidence} />
                </div>
              </div>

              {decision.txHash && (
                <div className="pt-2 border-t border-border/20">
                  <div className="font-mono text-[10px] text-muted-foreground mb-1">TX_REF // SODEX</div>
                  <a
                    href={`https://sodex.com/tx/${decision.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-accent hover:text-accent/80 flex items-center gap-1.5 group"
                  >
                    <span className="truncate">{decision.txHash}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                </div>
              )}

              {decision.executedAt && (
                <div className="font-mono text-[10px] text-muted-foreground/50">
                  EXECUTED_AT: {new Date(decision.executedAt).toISOString()}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Decisions() {
  const [page, setPage] = useState(0);
  const [newEventToast, setNewEventToast] = useState<number | null>(null);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const limit = 10;
  const qc = useQueryClient();

  const exportCsv = () => {
    const decisions = data?.decisions ?? [];
    if (decisions.length === 0) return;
    const headers = ["ID", "Action", "Protocol", "Amount", "Status", "Confidence", "Expected ROI", "Created At", "TX Hash"];
    const rows = decisions.map((d) => [
      d.id,
      `"${d.action}"`,
      `"${d.protocol}"`,
      `"${d.amount}"`,
      d.status,
      (d.confidence * 100).toFixed(1) + "%",
      (d.expectedRoi * 100).toFixed(2) + "%",
      new Date(d.createdAt).toISOString(),
      d.txHash ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `talos-decisions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareStats = () => {
    const url = `${window.location.origin}/?agent=TALOS-Alpha-001&decisions=${summary?.totalDecisions ?? 0}&roi=${(summary?.totalRoiPercent ?? 0).toFixed(2)}&conf=${((summary?.avgConfidence ?? 0) * 100).toFixed(0)}`;
    navigator.clipboard.writeText(url).then(() => {
      const toast = document.createElement("div");
      toast.textContent = "Link copied!";
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 2000);
    });
  };

  const { data, isLoading } = useListDecisions(
    { limit, offset: page * limit },
    { query: { refetchInterval: 30000, queryKey: getListDecisionsQueryKey({ limit, offset: page * limit }) } }
  );
  const { data: summary } = useGetDecisionsSummary({
    query: { queryKey: getGetDecisionsSummaryQueryKey() },
  });

  const { mutate: syncChain, isPending: syncing } = useMutation({
    mutationFn: async () => {
      const apiBase = import.meta.env.VITE_API_URL || '';
        const res = await fetch(apiBase + "/api/agent/sync", { method: "POST" });
      return res.json() as Promise<{ synced: number }>;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: getListDecisionsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetDecisionsSummaryQueryKey() });
      if (result.synced > 0) setNewEventToast(result.synced);
    },
  });

  // SSE stream — auto-refetch when new on-chain events arrive
  const streamStatus = useChainStream((count) => {
    qc.invalidateQueries({ queryKey: getListDecisionsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetDecisionsSummaryQueryKey() });
    setNewEventToast(count);
  });

  // Track which IDs are "new" (arrived after mount) for highlight
  const seenIds = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!data?.decisions) return;
    const fresh: number[] = [];
    for (const d of data.decisions) {
      if (!seenIds.current.has(d.id)) {
        if (seenIds.current.size > 0) fresh.push(d.id); // not first load
        seenIds.current.add(d.id);
      }
    }
    if (fresh.length > 0) {
      setNewIds((prev) => new Set([...prev, ...fresh]));
      // Clear highlight after 8s
      setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev);
          fresh.forEach((id) => next.delete(id));
          return next;
        });
      }, 8000);
    }
  }, [data?.decisions]);

  const totalPages = data ? Math.ceil(data.total / limit) : 0;
  const onChainCount = data?.decisions.filter((d) => d.txHash).length ?? 0;

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      {/* Toast */}
      <AnimatePresence>
        {newEventToast !== null && (
          <NewEventToast count={newEventToast} onDismiss={() => setNewEventToast(null)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-lg font-bold tracking-wider">AGENT_LOG</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="font-mono text-xs text-muted-foreground">
              On-chain decision history // {data?.total ?? 0} records
              {onChainCount > 0 && (
                <span className="text-primary"> // {onChainCount} on-chain</span>
              )}
            </p>
            <StreamIndicator status={streamStatus} />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {summary && (
            <>
              <div className="text-right hidden sm:block">
                <div className="font-mono text-[10px] text-muted-foreground">TOTAL_ROI</div>
                <div className={`font-mono text-sm font-bold ${summary.totalRoiPercent >= 0 ? "text-primary" : "text-destructive"}`}>
                  {summary.totalRoiPercent.toFixed(2)}%
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <div className="font-mono text-[10px] text-muted-foreground">AVG_CONF</div>
                <div className="font-mono text-sm font-bold text-accent">
                  {(summary.avgConfidence * 100).toFixed(0)}%
                </div>
              </div>
            </>
          )}
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs border border-accent/30 text-accent hover:bg-accent/10 rounded transition-all"
            title="Export to CSV"
          >
            <Download className="w-3 h-3" />
            CSV
          </button>
          <button
            onClick={shareStats}
            className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs border border-border/50 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded transition-all"
            title="Copy share link"
          >
            <Share2 className="w-3 h-3" />
            SHARE
          </button>
          <button
            onClick={() => syncChain()}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs border border-primary/30 text-primary hover:bg-primary/10 rounded transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "SYNCING..." : "SYNC_CHAIN"}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap font-mono text-[10px] text-muted-foreground">
        {["executed", "simulated", "pending", "failed"].map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
            {s.toUpperCase()}
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <Link2 className="w-3 h-3 text-primary" />
          <span className="text-primary">ON-CHAIN</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-accent" />
          <span className="text-accent">REAL-TIME STREAM</span>
        </div>
      </div>

      {/* Decision list */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-card border border-border/30 rounded animate-pulse" />
          ))
        ) : data?.decisions.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="font-mono text-sm text-muted-foreground">NO_DECISIONS_RECORDED</div>
            <div className="font-mono text-xs text-muted-foreground/60">
              // SYNC_CHAIN — pull on-chain events; or trigger a think cycle from Dashboard
            </div>
          </div>
        ) : (
          data?.decisions.map((d, i) => (
            <DecisionRow key={d.id} decision={d} index={i} isNew={newIds.has(d.id)} />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 font-mono text-xs border border-border/60 rounded hover:bg-sidebar-accent disabled:opacity-30"
          >
            PREV
          </button>
          <span className="font-mono text-xs text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 font-mono text-xs border border-border/60 rounded hover:bg-sidebar-accent disabled:opacity-30"
          >
            NEXT
          </button>
        </div>
      )}

      <div className="font-mono text-[10px] text-muted-foreground/40">
        DATA: SoSoValue OpenAPI // SSE_STREAM + AUTO-REFRESH 30s
      </div>
    </div>
  );
}
