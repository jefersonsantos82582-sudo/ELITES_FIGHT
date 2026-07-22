import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function Loading() {
  const { isAuthenticated, fbUser, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    // Prioridade 1: Se o servidor confirmou (isAuthenticated), vai para o dashboard
    if (isAuthenticated && !authLoading) {
      console.log("[Loading] Autenticado pelo servidor! Indo para dashboard...");
      setLocation("/dashboard");
      return;
    }

    // Prioridade 2: Se o Firebase logou (fbUser) mas o servidor ainda não (isAuthenticated),
    // vamos esperar mais um pouco, pois a sincronização está ocorrendo.
    if (fbUser && !isAuthenticated && !authLoading) {
       console.log("[Loading] Firebase OK, aguardando servidor...");
       // Não fazemos nada, deixamos o loading continuar até o timeout ou isAuthenticated virar true
    }
  }, [isAuthenticated, fbUser, authLoading, setLocation]);

  // Timeout de segurança: 20 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeoutReached(true);
    }, 20000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Só volta para a home se o timeout estourou E realmente não temos nem usuário do Firebase
    if (timeoutReached && !fbUser && !authLoading) {
      console.log("[Loading] Timeout sem usuário. Voltando para home.");
      setLocation("/");
    }
  }, [timeoutReached, fbUser, authLoading, setLocation]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="relative mx-auto mb-6">
          {/* Outer spinning ring */}
          <div className="w-16 h-16 border-2 border-primary/20 rounded-full animate-spin mx-auto" />
          {/* Inner spinning ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 border-2 border-t-primary rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
          {/* Center glow */}
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
