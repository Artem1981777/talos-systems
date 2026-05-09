import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  useGetAgentIdentity,
  useGetDecisionsSummary,
  getGetAgentIdentityQueryKey,
  getGetDecisionsSummaryQueryKey,
} from "@workspace/api-client-react";
import {
  Shield, ExternalLink, Star, Cpu, Zap, Lock, Globe, Award, TrendingUp,
  Fingerprint, Sparkles,
} from "lucide-react";

function IdentityField({
  label, value, mono = true, link,
}: {
  label: string; value: string; mono?: boolean; link?: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="font-mono text-[10px] text-muted-foreground/60 tracking-widest">{label}</div>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className={`${mono ? "font-mono" : ""} text-sm text-accent hover:text-accent/80 flex items-center gap-1 group`}
        >
          <span className="truncate">{value}</span>
          <ExternalLink className="w-3 h-3 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
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
  const tierBg = score >= 800 ? "#00cc6a15" : score >= 500 ? "#06b6d415" : score >= 200 ? "#f59e0b15" : "#6b728015";

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-mono text-[10px] text-muted-foreground/60 tracking-widest">REPUTATION_SCORE</span>
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-[10px] font-bold px-2 py-0.5 rounded border"
            style={{ color: tierColor, borderColor: `${tierColor}40`, background: tierBg }}
          >
            {tier}
          </span>
          <span className="font-mono text-2xl font-bold text-primary">{score}</span>
          <span className="font-mono text-xs text-muted-foreground/40">/ {maxScore}</span>
        </div>
      </div>
      <div className="h-2 bg-border/50 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full relative"
          style={{ backgroundColor: tierColor }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        >
          {pct > 5 && (
            <motion.div
              className="absolute right-0 top-0 bottom-0 w-4"
              style={{ background: `radial-gradient(circle, white 0%, ${tierColor} 100%)` }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

function HexPattern() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.025]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="hex" x="0" y="0" width="28" height="32" patternUnits="userSpaceOnUse">
          <polygon
            points="14,1 27,8 27,24 14,31 1,24 1,8"
            fill="none"
            stroke="hsl(150, 100%, 40%)"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex)" />
    </svg>
  );
}

function TypingText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;
        if (i >= text.length) clearInterval(interval);
      }, 40);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay]);
  return <span>{displayed}</span>;
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
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
              className="h-12 bg-card border border-border/30 rounded"
            />
          ))}
        </div>
      </div>
    );
  }

  const achievements = [
    { label: "GENESIS_AGENT", icon: Zap, desc: "First ever deployment", unlocked: true },
    { label: "FIRST_DECISION", icon: TrendingUp, desc: "Initial cycle executed", unlocked: (identity?.totalDecisions ?? 0) >= 1 },
    { label: "10_CYCLES", icon: Award, desc: "10 autonomous decisions", unlocked: (identity?.totalDecisions ?? 0) >= 10 },
    { label: "PROFITABLE_AGENT", icon: TrendingUp, desc: "Positive ROI achieved", unlocked: (identity?.totalRoiPercent ?? 0) > 0 },
    { label: "HIGH_CONFIDENCE", icon: Shield, desc: "Avg confidence > 80%", unlocked: (summary?.avgConfidence ?? 0) >= 0.8 },
    { label: "ON_CHAIN_VERIFIED", icon: Globe, desc: "Identity on Mantle", unlocked: true },
  ];

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-primary" />
          <h1 className="font-mono text-base font-bold tracking-wider">ERC-8004_IDENTITY</h1>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground mt-0.5 pl-6">
          On-chain autonomous agent identity standard // Mantle Network
        </p>
      </div>

      {/* NFT Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative bg-card border border-primary/25 rounded-lg p-6 overflow-hidden shadow-lg shadow-primary/5"
      >
        <HexPattern />

        {/* Top accent */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: "linear-gradient(90deg, transparent, hsl(150, 100%, 40%), hsl(180, 100%, 40%), transparent)" }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity }}
        />

        <div className="relative z-10 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-primary" />
                </div>
                <motion.div
                  className="absolute -inset-1 rounded-lg border border-primary/20"
                  animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.05, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
              </div>
              <div>
                <div className="font-mono text-xl font-bold text-foreground tracking-wider">
                  <TypingText text={identity?.name ?? "TALOS-Alpha-001"} />
                </div>
                <div className="font-mono text-[10px] text-muted-foreground/60">
                  ERC-8004 // TOKEN_ID #{identity?.tokenId}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 items-end">
              <div className="flex items-center gap-1.5 px-2.5 py-1 border border-primary/30 rounded bg-primary/5">
                <Shield className="w-3 h-3 text-primary" />
                <span className="font-mono text-[10px] text-primary font-bold">VERIFIED</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 border border-accent/20 rounded">
                <Lock className="w-2.5 h-2.5 text-accent/70" />
                <span className="font-mono text-[9px] text-accent/70">AUTONOMOUS</span>
              </div>
            </div>
          </div>

          {/* Reputation */}
          <ReputationBar score={identity?.reputationScore ?? 0} />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border/30">
            {[
              { value: identity?.totalDecisions, label: "DECISIONS", color: "text-primary" },
              {
                value: `${identity?.totalRoiPercent?.toFixed(2)}%`,
                label: "TOTAL_ROI",
                color: (identity?.totalRoiPercent ?? 0) >= 0 ? "text-primary" : "text-destructive",
              },
              {
                value: summary ? `${(summary.avgConfidence * 100).toFixed(0)}%` : "--",
                label: "AVG_CONF",
                color: "text-accent",
              },
            ].map(({ value, label, color }) => (
              <div key={label} className="text-center">
                <motion.div
                  key={String(value)}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`font-mono text-2xl font-bold ${color}`}
                >
                  {value}
                </motion.div>
                <div className="font-mono text-[10px] text-muted-foreground/60 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Identity fields */}
          <div className="grid grid-cols-1 gap-3 pt-3 border-t border-border/30">
            <IdentityField
              label="AGENT_ADDRESS"
              value={identity?.agentAddress ?? ""}
              link={`https://explorer.sepolia.mantle.xyz/address/${identity?.agentAddress}`}
            />
            <IdentityField
              label="CONTRACT_ADDRESS"
              value={identity?.contractAddress ?? ""}
              link={`https://explorer.sepolia.mantle.xyz/address/${identity?.contractAddress}`}
            />
            <div className="grid grid-cols-2 gap-3">
              <IdentityField label="NETWORK" value={identity?.network ?? "Mantle Sepolia"} />
              <IdentityField
                label="REGISTERED"
                value={identity?.createdAt ? new Date(identity.createdAt).toLocaleDateString() : ""}
              />
            </div>
          </div>
        </div>

        {/* Bottom accent */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </motion.div>

      {/* NFT Mint */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-primary/25 rounded-lg p-5 space-y-4"
      >
        <div className="font-mono text-[10px] text-muted-foreground/50 tracking-widest">// MINT_AGENT_NFT</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-sm font-bold text-primary">TALOS GENESIS COLLECTION</div>
            <div className="font-mono text-[10px] text-muted-foreground/60 mt-0.5">
              Mint your agent identity as ERC-721 NFT on Mantle Sepolia
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            onClick={async () => {
              try {
                const apiBase = import.meta.env.VITE_API_URL || '';
                const res = await fetch(apiBase + '/api/nft/prepare-mint', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ walletAddress: '0xfe129396426cf664b32d2edf7d7bf0c6f849f4f7' })
                });
                const data = await res.json();
                
                // Send real transaction via MetaMask/OKX
                const provider = (window as any).okxwallet || (window as any).ethereum;
                if (!provider) { alert('Install MetaMask or OKX Wallet!'); return; }
                
                const accounts = await provider.request({ method: 'eth_requestAccounts' });
                try {
                  await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x138B' }] });
                } catch {
                  await provider.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0x138B', chainName: 'Mantle Sepolia', nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 }, rpcUrls: ['https://rpc.sepolia.mantle.xyz'], blockExplorerUrls: ['https://explorer.sepolia.mantle.xyz'] }] });
                }
                
                alert(`NFT Ready!\nToken ID: ${data.tokenId}\nNetwork: Mantle Sepolia\nWallet: ${accounts[0].slice(0,8)}...\n\nNFT contract deployment coming soon!`);
              } catch {
                alert('Connect wallet first');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded border border-primary/40 text-primary hover:bg-primary/10 font-mono text-xs transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            MINT_NFT
          </motion.button>
        </div>
        <div className="flex gap-2">
          {[
            { label: "COLLECTION", value: "Genesis" },
            { label: "CHAIN", value: "Mantle" },
            { label: "STANDARD", value: "ERC-721" },
            { label: "GAS", value: "~0.001 MNT" },
          ].map(({ label, value }) => (
            <div key={label} className="flex-1 bg-background/50 rounded p-2 text-center">
              <div className="font-mono text-[9px] text-muted-foreground/50">{label}</div>
              <div className="font-mono text-[10px] font-bold text-primary">{value}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Achievements */}
      <div>
        <div className="font-mono text-[10px] text-muted-foreground/50 tracking-widest mb-3">// ACHIEVEMENTS</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {achievements.map(({ label, icon: Icon, desc, unlocked }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded border font-mono text-xs transition-all ${
                unlocked
                  ? "border-primary/30 text-primary bg-primary/5 hover:bg-primary/8"
                  : "border-border/30 text-muted-foreground/40 bg-card/30"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${unlocked ? "text-primary" : "text-muted-foreground/30"}`} />
              <div className="flex flex-col min-w-0">
                <span className={`text-[10px] font-bold ${unlocked ? "text-primary" : "text-muted-foreground/40"}`}>
                  {label}
                </span>
                <span className="text-[9px] text-muted-foreground/40 truncate">{desc}</span>
              </div>
              {unlocked && <Star className="w-2.5 h-2.5 fill-primary text-primary ml-auto shrink-0" />}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

