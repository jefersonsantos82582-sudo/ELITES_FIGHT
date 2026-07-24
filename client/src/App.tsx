import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Templates from "./pages/Templates";
import Generator from "./pages/Generator";
import AIGenerator from "./pages/AIGenerator";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutFailure from "./pages/CheckoutFailure";
import Loading from "./pages/Loading";
import { useEffect, useState } from "react";
import { checkEnvironmentVariables, EnvCheckResult } from "./lib/env-check";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/modelos" component={Templates} />
      <Route path="/dashboard/gerador" component={Generator} />
      <Route path="/dashboard/ia" component={AIGenerator} />
      <Route path="/dashboard/config" component={Settings} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/checkout/failure" component={CheckoutFailure} />
      <Route path="/loading" component={Loading} />
      <Route path="/admin" component={Admin} />
      <Route path="/painel" component={Admin} />
      <Route path="/dashboard/admin" component={Admin} />
      <Route path="/dashboard/painel" component={Admin} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [envCheck, setEnvCheck] = useState<EnvCheckResult | null>(null);

  useEffect(() => {
    const result = checkEnvironmentVariables();
    setEnvCheck(result);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
          {/* Mostrar alerta de variáveis de ambiente em desenvolvimento */}
          {process.env.NODE_ENV === "development" && envCheck && envCheck.errors.length > 0 && (
            <div className="fixed bottom-4 right-4 max-w-sm bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive text-sm z-50 animate-in fade-in">
              <p className="font-bold mb-2">⚠️ Configuração Incompleta</p>
              <ul className="space-y-1 text-xs">
                {envCheck.errors.map((err, i) => (
                  <li key={i} className="break-words">{err}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-3">
                Configure as variáveis de ambiente no Render Dashboard
              </p>
            </div>
          )}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
