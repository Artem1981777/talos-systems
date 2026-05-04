import { motion } from "framer-motion";
import {
  useGetAgentIdentity,
  useGetDecisionsSummary,
  getGetAgentIdentityQueryKey,
  getGetDecisionsSummaryQueryKey,
} from "@workspace/api-client-react";
import { Shield, ExternalLink, Star, Cpu, Clock } from "lucide-react";

function IdentityField({ label, value, mono = true, link }: { label: string; value: string; mono?: boolean; link?: string }) {
  return (
    <div className="space-y-0.5">
      <div className="font-mono text-[10px] text-muted-foreground tracking-widest">{label}</div>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className={`${mono ? "font-mono" : ""} text-sm text-accent hover:text-accent/80 flex items-center gap-1`}
        >
          <span className="truncate">{value}</span>
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      ) : (
        <div className={`${mono ? "font-mono" : ""} text-sm text-foreground font-medium truncate`}>{value}</div>
      )}
    </div>
  );
}

function ReputationBar({ score }: { score: number }) {
  const maxScore = 1000;
  const pct = Math.min(100, (score / maxScore) * 100);
  const tier = score >= 800 ? "ELITE" : score >= 500 ? "ADVANCED" : score >= 200 ? "ACTIVE" : "NOVICE";
  const tierColor = score >= 800 ? "#00cc6a" : score >= 500 ? "#06b6d4" : score >= 200 ? "#f59e0b" : "#6b7280";

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="font-mono text-[10px] text-muted-foreground">REPUTATION_SCORE</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold" style={{ color: tierColor }}>{tier}</span>
          <span className="font-mono text-2xl font-bold text-primary">{score}</span>
          <span className="font-mono text-xs text-muted-foreground">/ {maxScore}</span>
        </div>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: tierColor }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default function Identity() {
  const { data: identity, isLoading } = useGetAgentIdentity({
    query: { queryKey: getGetAgentIdentityQueryKey() },
  });
  const { data: summary } = useGetDecisionsSummary({
    query: { queryKey: getGetDecisionsSummaryQueryKey() },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-2xl space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-card border border-border/30 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="font-mono text-lg font-bold tracking-wider">ERC-8004_IDENTITY</h1>
        <p className="font-mono text-xs text-muted-foreground mt-0.5">
          On-chain agent identity standard // Mantle Network
        </p>
      </div>

      {/* NFT Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative bg-card border border-primary/20 rounded-lg p-6 overflow-hidden"
      >
        {/* Background grid effect */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />

        <div className="relative space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-mono text-lg font-bold text-foreground">{identity?.name}</div>
                <div className="font-mono text-[10px] text-muted-foreground">ERC-8004 // TOKEN_ID #{identity?.tokenId}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 border border-primary/20 rounded">
              <Shield className="w-3 h-3 text-primary" />
              <span className="font-mono text-[10px] text-primary">VERIFIED</span>
            </div>
          </div>

          {/* Reputation */}
          <ReputationBar score={identity?.reputationScore ?? 0} />

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border/30">
            <div className="text-center">
              <div className="font-mono text-2xl font-bold text-primary">{identity?.totalDecisions}</div>
              <div className="font-mono text-[10px] text-muted-foreground">DECISIONS</div>
            </div>
            <div className="text-center">
              <div className={`font-mono text-2xl font-bold ${(identity?.totalRoiPercent ?? 0) >= 0 ? "text-primary" : "text-destructive"}`}>
                {identity?.totalRoiPercent?.toFixed(1)}%
              </div>
              <div className="font-mono text-[10px] text-muted-foreground">TOTAL_ROI</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-2xl font-bold text-accent">
                {summary ? `${(summary.avgConfidence * 100).toFixed(0)}%` : "--"}
              </div>
              <div className="font-mono text-[10px] text-muted-foreground">AVG_CONF</div>
            </div>
          </div>

          {/* Identity fields */}
          <div className="grid grid-cols-1 gap-3 pt-2 border-t border-border/30">
            <IdentityField label="AGENT_ADDRESS" value={identity?.agentAddress ?? ""} link={`https://explorer.sepolia.mantle.xyz/address/${identity?.agentAddress}`} />
            <IdentityField label="CONTRACT_ADDRESS" value={identity?.contractAddress ?? ""} link={`https://explorer.sepolia.mantle.xyz/address/${identity?.contractAddress}`} />
            <IdentityField label="NETWORK" value={identity?.network ?? ""} />
            <IdentityField label="REGISTERED" value={identity?.createdAt ? new Date(identity.createdAt).toUTCString() : ""} />
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </motion.div>

      {/* Achievements */}
      <div>
        <div className="font-mono text-[10px] text-muted-foreground/60 tracking-widest mb-3">// ACHIEVEMENTS</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "FIRST_DECISION", unlocked: (identity?.totalDecisions ?? 0) >= 1 },
            { label: "10_DECISIONS", unlocked: (identity?.totalDecisions ?? 0) >= 10 },
            { label: "PROFITABLE_AGENT", unlocked: (identity?.totalRoiPercent ?? 0) > 0 },
            { label: "HIGH_CONFIDENCE", unlocked: (summary?.avgConfidence ?? 0) >= 0.8 },
          ].map(({ label, unlocked }) => (
            <div
              key={label}
              className={`flex items-center gap-2 px-3 py-2 rounded border font-mono text-xs ${
                unlocked
                  ? "border-primary/30 text-primary bg-primary/5"
                  : "border-border/30 text-muted-foreground/40"
              }`}
            >
              <Star className={`w-3 h-3 ${unlocked ? "fill-primary" : ""}`} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
