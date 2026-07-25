import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { RefreshCw, Home } from "lucide-react";

export default function Loading() {
  const { isAuthenticated, fbUser, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    // Se Firebase detectou usuário, ir direto pro dashboard
    if (fbUser && !authLoading) {
      console.log("[Loading] Firebase detectado! Indo para Dashboard...");
      setLocation("/dashboard");
      return;
    }

    // Se servidor confirmou autenticado
    if (isAuthenticated && !authLoading) {
      console.log("[Loading] Autenticado pelo servidor! Indo para dashboard...");
      setLocation("/dashboard");
      return;
    }
  }, [isAuthenticated, fbUser, authLoading, setLocation]);

  // Timeout de segurança: 10 segundos (reduzido de 20s)
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("[Loading] Timeout de 10s atingido");
      setTimeoutReached(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  // Após timeout, se ainda não autenticado, dar opção de tentar de novo
  useEffect(() => {
    if (timeoutReached && !fbUser && !authLoading) {
      console.log("[Loading] Timeout sem usuário. Mostrando opção de login.");
    }
  }, [timeoutReached, fbUser, authLoading]);

  if (timeoutReached && !fbUser && !authLoading && !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <p className="text-lg font-semibold text-foreground mb-2">
            Problema ao conectar
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Não foi possível verificar sua sessão. Tente novamente ou volte para a página inicial.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.reload()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
            <Button onClick={() => setLocation("/")} variant="default">
              <Home className="w-4 h-4 mr-2" />
              Ir para início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="relative mx-auto mb-6">
          <div className="w-16 h-16 border-2 border-primary/20 rounded-full animate-spin mx-auto" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 border-2 border-t-primary rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-60 animate-pulse" />
        </div>
        <p className="text-lg font-semibold text-foreground mb-2">
          Preparando seu ambiente
        </p>
        <p className="text-sm text-muted-foreground">
          Carregando suas informações...
        </p>
      </div>
    </div>
  );
}
