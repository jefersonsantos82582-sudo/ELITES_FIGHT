import { SIDEBAR_WIDTH_KEY } from "@/lib/utils";
import {
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
} from "@/lib/utils";
import { useState, useEffect, type CSSProperties } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardLayoutContent } from "./DashboardLayoutContent";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved) : SIDEBAR_DEFAULT_WIDTH;
  });

  const { user, loading, login, error } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full animate-in fade-in zoom-in duration-500">
          <div className="flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-center">
                Entre para continuar
              </h1>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                O acesso ao dashboard requer autenticação. Faça login com sua conta Google para gerenciar suas planilhas.
              </p>
          </div>
          
          <Button
            onClick={() => login("/dashboard")}
            size="lg"
            className="w-full bg-gold-gradient text-black font-bold shadow-lg hover:shadow-xl transition-all h-12"
          >
            Entrar com Google
          </Button>

          {error && (
            <p className="text-xs text-destructive text-center mt-2">
              Erro ao verificar sessão: {error.message}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}
