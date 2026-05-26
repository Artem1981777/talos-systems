import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <div className="font-mono text-6xl font-bold text-primary/20">404</div>
        <div className="font-mono text-sm text-muted-foreground">ERROR: Route not found</div>
        <div className="font-mono text-xs text-muted-foreground/60">// The requested path does not exist in this system</div>
        <Link href="/">
          <a className="inline-block mt-2 px-4 py-2 font-mono text-xs border border-primary/40 text-primary hover:bg-primary/10 rounded transition-colors">
            RETURN_TO_DASHBOARD
          </a>
        </Link>
      </div>
    </div>
  );
}
