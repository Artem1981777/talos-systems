import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ScrollText, Fingerprint, BarChart2, Activity,
  Cpu, Shield, Zap, Radio, Menu, X, LineChart,
} from "lucide-react";
import ApiKeyModal from "./ApiKeyModal";
import WalletConnect from "./WalletConnect";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, sub: "SYS_OVERVIEW" },
  { href: "/decisions", label: "Agent Log", icon: ScrollText, sub: "DECISION_HISTORY" },
  { href: "/identity", label: "ERC-8004 ID", icon: Fingerprint, sub: "AGENT_IDENTITY" },
  { href: "/protocols", label: "Protocols", icon: BarChart2, sub: "YIELD_INTEL" },
  { href: "/analytics", label: "Analytics", icon: LineChart, sub: "PERFORMANCE" },
];

function MatrixRain() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.04]">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute top-0 font-mono text-[8px] text-primary leading-tight select-none"
          style={{ left: `${12.5 * i}%` }}
          animate={{ y: ["0%", "100%"] }}
          transition={{ duration: 8 + i * 1.5, repeat: Infinity, ease: "linear", delay: i * 0.7 }}
        >
          {Array.from({ length: 20 }).map((_, j) => (
            <div key={j}>{Math.random() > 0.5 ? "1" : "0"}</div>
          ))}
        </motion.div>
      ))}
    </div>
  );
}

function GlitchText({ text }: { text: string }) {
  const [glitch, setGlitch] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() > 0.85) { setGlitch(true); setTimeout(() => setGlitch(false), 80); }
    }, 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className={`font-mono font-bold tracking-widest transition-all ${glitch ? "text-destructive translate-x-0.5" : "text-primary"}`}>
      {text}
    </span>
  );
}

function NavItems({ onNav }: { onNav?: () => void }) {
  const [location] = useLocation();
  return (
    <>
      {nav.map(({ href, label, icon: Icon, sub }) => {
        const active = href === "/" ? location === "/" : location.startsWith(href);
        return (
          <Link key={href} href={href}>
            <motion.div
              whileHover={{ x: 2 }}
              onClick={onNav}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded cursor-pointer transition-all ${
                active
                  ? "bg-primary/10 border border-primary/25 shadow-sm shadow-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent border border-transparent"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-primary" : ""}`} />
              <div className="flex flex-col min-w-0">
                <span className={`font-mono text-xs font-semibold ${active ? "text-primary" : ""}`}>{label}</span>
                <span className="font-mono text-[9px] text-muted-foreground/40 tracking-wider">{sub}</span>
              </div>
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="ml-auto w-1 h-4 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.div>
          </Link>
        );
      })}
    </>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [time, setTime] = useState(new Date());
  const [tick, setTick] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => { setTime(new Date()); setTick((v) => !v); }, 1000);
    return () => clearInterval(t);
  }, []);

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [location]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Scanline overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.03]"
        style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,100,0.15) 2px, rgba(0,255,100,0.15) 4px)" }}
      />
      {/* CRT vignette */}
      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{ background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%)" }}
      />

      {/* Top bar */}
      <header className="border-b border-primary/10 px-4 py-2 flex items-center justify-between bg-card/80 backdrop-blur-sm sticky top-0 z-50 shrink-0 gap-2">
        {/* Left: brand + hamburger */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Cpu className="w-4 h-4 text-primary" />
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/20"
                animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <GlitchText text="TALOS" />
            <span className="text-muted-foreground font-mono text-[10px] border border-primary/20 px-1.5 rounded">v4.0</span>
          </div>
          <div className="h-3 w-px bg-border hidden sm:block" />
          <div className="hidden sm:flex items-center gap-1.5">
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-primary"
              animate={{ opacity: tick ? 1 : 0.3 }}
              transition={{ duration: 0.3 }}
            />
            <span className="font-mono text-[10px] text-muted-foreground">MANTLE_SEPOLIA</span>
          </div>
        </div>

        {/* Right: wallet + api key + clock + status */}
        <div className="flex items-center gap-2">
          <WalletConnect />
          <ApiKeyModal />
          <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] text-muted-foreground/60">
            <Radio className="w-3 h-3 text-primary/60" />
            <span>{time.toUTCString().split(" ").slice(4, 5)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-accent" />
            <span className="font-mono text-[10px] text-accent hidden sm:inline">AUTONOMOUS</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-52 border-r border-primary/10 bg-sidebar shrink-0 flex-col relative overflow-hidden">
          <MatrixRain />
          <nav className="flex flex-col gap-0.5 p-2 flex-1 relative z-10">
            <NavItems />
          </nav>
          <div className="p-3 border-t border-primary/10 relative z-10 space-y-2">
            <div className="flex items-center gap-1.5 px-1">
              <Shield className="w-3 h-3 text-primary/50" />
              <span className="font-mono text-[9px] text-primary/50 tracking-wider">ERC-8004 VERIFIED</span>
            </div>
            <div className="px-1 space-y-0.5">
              <div className="font-mono text-[10px] text-foreground/70">TALOS-Alpha-001</div>
              <div className="font-mono text-[9px] text-muted-foreground/40">0xfe12...f4f7</div>
            </div>
          </div>
        </aside>

        {/* Mobile slide-in sidebar */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-40 md:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                initial={{ x: -240 }}
                animate={{ x: 0 }}
                exit={{ x: -240 }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                className="fixed left-0 top-0 bottom-0 w-56 bg-sidebar border-r border-primary/15 z-50 flex flex-col md:hidden overflow-hidden"
              >
                <MatrixRain />
                {/* Mobile header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-primary/10 relative z-10">
                  <GlitchText text="TALOS" />
                  <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <nav className="flex flex-col gap-0.5 p-2 flex-1 relative z-10">
                  <NavItems onNav={() => setMobileOpen(false)} />
                </nav>
                <div className="p-3 border-t border-primary/10 relative z-10 space-y-1">
                  <div className="flex items-center gap-1.5 px-1">
                    <Shield className="w-3 h-3 text-primary/50" />
                    <span className="font-mono text-[9px] text-primary/50 tracking-wider">ERC-8004 VERIFIED</span>
                  </div>
                  <div className="px-1 font-mono text-[9px] text-muted-foreground/40">0xfe12...f4f7</div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main */}
        <main className="flex-1 overflow-auto relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
