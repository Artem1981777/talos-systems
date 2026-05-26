import { Switch, Route, Router as WouterRouter } from "wouter";
import { setBaseUrl } from "@workspace/api-client-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Decisions from "@/pages/Decisions";
import Identity from "@/pages/Identity";
import Protocols from "@/pages/Protocols";
import Analytics from "@/pages/Analytics";
import Backtesting from "@/pages/Backtesting";
import NotFound from "@/pages/not-found";

const apiUrl = import.meta.env.VITE_API_URL || "";
if (apiUrl) setBaseUrl(apiUrl);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5000 } },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/decisions" component={Decisions} />
        <Route path="/identity" component={Identity} />
        <Route path="/protocols" component={Protocols} />
        <Route path="/analytics" component={Analytics} />
          <Route path="/backtesting" component={Backtesting} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              color: "hsl(var(--foreground))",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px",
            },
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
