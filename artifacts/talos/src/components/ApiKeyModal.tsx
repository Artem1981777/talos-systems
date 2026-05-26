import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, X, Cpu, Zap, Shield, ChevronDown } from "lucide-react";

export type AiMode = "shared" | "mykey" | "demo";

const MODE_LABELS: Record<AiMode, string> = {
  shared: "SHARED_POOL",
  mykey: "MY_KEY",
  demo: "DEMO_MODE",
};

const MODE_COLORS: Record<AiMode, string> = {
  shared: "text-primary border-primary/40",
  mykey: "text-violet-400 border-violet-400/40",
  demo: "text-amber-400 border-amber-400/40",
};

function useAiConfig() {
  const [mode, setMode] = useState<AiMode>(() => {
    return (localStorage.getItem("talos_ai_mode") as AiMode) ?? "shared";
  });
  const [key, setKey] = useState<string>(() => {
    return localStorage.getItem("talos_anthropic_key") ?? "";
  });

  const save = (newMode: AiMode, newKey: string) => {
    localStorage.setItem("talos_ai_mode", newMode);
    localStorage.setItem("talos_anthropic_key", newKey);
    setMode(newMode);
    setKey(newKey);
  };

  return { mode, key, save };
}

export function useAiHeaders(): Record<string, string> {
  const mode = (localStorage.getItem("talos_ai_mode") as AiMode) ?? "shared";
  const key = localStorage.getItem("talos_anthropic_key") ?? "";
  if (mode === "mykey" && key) {
    return { "X-Anthropic-Key": key };
  }
  if (mode === "demo") {
    return { "X-Demo-Mode": "true" };
  }
  return {};
}

export default function ApiKeyModal() {
  const { mode, key, save } = useAiConfig();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AiMode>(mode);
  const [keyInput, setKeyInput] = useState(key);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const firstVisit = !localStorage.getItem("talos_ai_mode");
    if (firstVisit) {
      save("shared", "");
      setOpen(true);
    }
  }, []);

  const handleSave = () => {
    save(selected, keyInput);
    setOpen(false);
  };

  return (
    <>
      {/* Header button */}
      <div className="relative">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowDropdown(!showDropdown)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-[10px] transition-all ${MODE_COLORS[mode]} bg-transparent hover:bg-white/5`}
        >
          <Key className="w-3 h-3" />
          <span>{MODE_LABELS[mode]}</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </motion.button>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-1 w-44 bg-card border border-border/60 rounded shadow-xl z-50 overflow-hidden"
            >
              {(["shared", "mykey", "demo"] as AiMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setShowDropdown(false); setSelected(m); setOpen(true); }}
                  className={`w-full px-3 py-2 text-left font-mono text-[10px] hover:bg-sidebar-accent transition-colors flex items-center gap-2 ${
                    mode === m ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${mode === m ? "bg-primary" : "bg-border"}`} />
                  {MODE_LABELS[m]}
                </button>
              ))}
              <div className="border-t border-border/30 px-3 py-2">
                <button
                  onClick={() => { setShowDropdown(false); setOpen(true); }}
                  className="font-mono text-[10px] text-accent hover:text-accent/80 transition-colors"
                >
                  CONFIGURE →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200]"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-full max-w-md"
            >
              <div className="bg-card border border-primary/25 rounded-lg shadow-2xl shadow-primary/10 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-primary" />
                    <span className="font-mono text-sm font-bold text-primary">AI_CONFIG</span>
                  </div>
                  <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div className="font-mono text-[10px] text-muted-foreground/60 tracking-widest">
                    // SELECT INFERENCE MODE
                  </div>

                  {/* Mode cards */}
                  <div className="space-y-2">
                    {/* SHARED POOL */}
                    <button
                      onClick={() => setSelected("shared")}
                      className={`w-full p-3 rounded border text-left transition-all ${
                        selected === "shared"
                          ? "border-primary/50 bg-primary/8"
                          : "border-border/40 hover:border-border/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className={`w-3.5 h-3.5 ${selected === "shared" ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`font-mono text-xs font-bold ${selected === "shared" ? "text-primary" : "text-foreground"}`}>
                          SHARED_POOL
                        </span>
                        <span className="ml-auto font-mono text-[10px] text-muted-foreground border border-border/40 px-1.5 rounded">
                          FREE
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground pl-5">
                        Shared backend key — 5 req/day per IP
                      </div>
                    </button>

                    {/* MY KEY */}
                    <button
                      onClick={() => setSelected("mykey")}
                      className={`w-full p-3 rounded border text-left transition-all ${
                        selected === "mykey"
                          ? "border-violet-500/50 bg-violet-500/8"
                          : "border-border/40 hover:border-border/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Key className={`w-3.5 h-3.5 ${selected === "mykey" ? "text-violet-400" : "text-muted-foreground"}`} />
                        <span className={`font-mono text-xs font-bold ${selected === "mykey" ? "text-violet-400" : "text-foreground"}`}>
                          MY_KEY
                        </span>
                        <span className="ml-auto font-mono text-[10px] text-violet-400/70 border border-violet-400/20 px-1.5 rounded">
                          UNLIMITED
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground pl-5">
                        Your own Anthropic key — full access
                      </div>
                    </button>

                    {/* DEMO MODE */}
                    <button
                      onClick={() => setSelected("demo")}
                      className={`w-full p-3 rounded border text-left transition-all ${
                        selected === "demo"
                          ? "border-amber-500/50 bg-amber-500/8"
                          : "border-border/40 hover:border-border/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className={`w-3.5 h-3.5 ${selected === "demo" ? "text-amber-400" : "text-muted-foreground"}`} />
                        <span className={`font-mono text-xs font-bold ${selected === "demo" ? "text-amber-400" : "text-foreground"}`}>
                          DEMO_MODE
                        </span>
                        <span className="ml-auto font-mono text-[10px] text-amber-400/70 border border-amber-400/20 px-1.5 rounded">
                          NO AI
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground pl-5">
                        Deterministic fallback — no API calls
                      </div>
                    </button>
                  </div>

                  {/* Key input for MY_KEY */}
                  <AnimatePresence>
                    {selected === "mykey" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-1.5">
                          <label className="font-mono text-[10px] text-muted-foreground tracking-widest">
                            ANTHROPIC_API_KEY
                          </label>
                          <input
                            type="password"
                            value={keyInput}
                            onChange={(e) => setKeyInput(e.target.value)}
                            placeholder="sk-ant-..."
                            className="w-full bg-background border border-border/60 rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-violet-500/50 text-foreground placeholder:text-muted-foreground/40"
                          />
                          <div className="font-mono text-[10px] text-muted-foreground/50">
                            Stored locally in browser — never sent to our servers
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSave}
                    className={`w-full py-2.5 rounded font-mono text-xs font-bold transition-all ${
                      selected === "mykey"
                        ? "bg-violet-500/20 border border-violet-500/40 text-violet-400 hover:bg-violet-500/30"
                        : selected === "demo"
                        ? "bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30"
                        : "bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25"
                    }`}
                  >
                    APPLY_CONFIG
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
