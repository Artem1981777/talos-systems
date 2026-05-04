import { Link, useLocation } from "wouter";
import { LayoutDashboard, ScrollText, Fingerprint, BarChart2, Activity } from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/decisions", label: "Agent Log", icon: ScrollText },
  { href: "/identity", label: "ERC-8004 ID", icon: Fingerprint },
  { href: "/protocols", label: "Protocols", icon: BarChart2 },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border/50 px-4 py-2 flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-primary font-mono text-sm font-bold tracking-widest">TALOS</span>
            <span className="text-muted-foreground font-mono text-xs">v4.0</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-xs text-muted-foreground">MANTLE_SEPOLIA</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3 text-primary" />
          <span className="font-mono text-xs text-muted-foreground">ON-CHAIN_ACTIVE</span>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-52 border-r border-border/50 bg-sidebar shrink-0 flex flex-col">
          <nav className="flex flex-col gap-0.5 p-2 flex-1">
            {nav.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? location === "/" : location.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm font-mono transition-colors ${
                    active
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-border/50">
            <div className="font-mono text-xs text-muted-foreground space-y-0.5">
              <div className="text-primary/60">// ERC-8004</div>
              <div className="truncate">TALOS-Alpha-001</div>
              <div className="text-muted-foreground/50 text-[10px]">0xfe12...f4f7</div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
