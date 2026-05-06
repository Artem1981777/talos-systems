import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Wallet, LogOut } from "lucide-react";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

function truncate(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function WalletConnect() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("METAMASK_NOT_FOUND");
      setTimeout(() => setError(null), 3000);
      return;
    }
    try {
      setConnecting(true);
      setError(null);
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      if (accounts.length > 0) setAddress(accounts[0]);
    } catch {
      setError("REJECTED");
      setTimeout(() => setError(null), 3000);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => setAddress(null), []);

  if (address) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.95 }}
        onClick={disconnect}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-primary/40 font-mono text-[10px] text-primary hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition-all group"
        title="Click to disconnect"
      >
        <motion.div
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full bg-primary group-hover:bg-destructive transition-colors"
        />
        <span>{truncate(address)}</span>
        <LogOut className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </motion.button>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={connect}
      disabled={connecting}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-[10px] transition-all disabled:opacity-50 ${
        error
          ? "border-destructive/40 text-destructive"
          : "border-accent/30 text-accent hover:bg-accent/10 hover:border-accent/50"
      }`}
    >
      <Wallet className="w-3 h-3" />
      {error ? error : connecting ? "CONNECTING..." : "CONNECT_WALLET"}
    </motion.button>
  );
}
