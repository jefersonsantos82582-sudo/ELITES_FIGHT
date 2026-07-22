import { SIDEBAR_WIDTH_KEY, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH, SIDEBAR_DEFAULT_WIDTH } from "@/lib/utils";
import { useEffect, useState, type CSSProperties } from "react";
import { useLocation } from "wouter";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardLayoutContent } from "./DashboardLayoutContent";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, LogIn } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    const parsed = saved ? Number.parseInt(saved, 10) : SIDEBAR_DEFAULT_WIDTH;
    return Number.isFinite(parsed)
      ? Math.min(Math.max(parsed, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH)
      : SIDEBAR_DEFAULT_WIDTH;
  });

  const { user, loading, login, error } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  // Garantir redirecionamento se o usuário estiver logado mas a página não mudar
  useEffect(() => {
    if (user) {
      const path = window.location.pathname;
      // Se estiver na raiz ou em páginas que exigem login mas mostram o card de "Entre para continuar"
      if (path === "/" || path === "/login") {
        setLocation("/dashboard");
      }
    }
  }, [user, setLocation]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login("/dashboard");
    } catch {
      // O erro já é apresentado pela camada de autenticação.
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Mostrar skeleton enquanto o Firebase/tRPC ainda está carregando
  // Isso cobre tanto o carregamento normal quanto o retorno de redirect do Google
  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <section className="flex w-full max-w-md flex-col items-center gap-8 rounded-2xl border border-border/30 bg-card/40 p-8 text-center shadow-xl animate-in fade-in zoom-in duration-500">
          <div className="flex flex-col items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <AlertCircle className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Entre para continuar</h1>
              <p className="text-sm leading-6 text-muted-foreground">
                O acesso ao dashboard requer autenticação. Entre com sua conta Google para criar e gerenciar suas planilhas.
              </p>
            </div>
          </div>

          {error && (
            <div className="w-full rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-left">
              <p className="text-sm font-medium text-destructive">Não foi possível validar a sessão</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{error.message}</p>
            </div>
          )}

          <Button
            onClick={() => void handleLogin()}
            disabled={isLoggingIn}
            size="lg"
            className="h-12 w-full bg-gold-gradient font-bold text-black shadow-lg transition-all hover:shadow-xl"
          >
            {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            {isLoggingIn ? "Validando acesso..." : error ? "Tentar novamente" : "Entrar com Google"}
          </Button>
        </section>
      </main>
    );
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}
