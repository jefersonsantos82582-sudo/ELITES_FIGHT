import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function Loading() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    // Se o usuário já está autenticado e o loading terminou, redireciona para o dashboard
    if (isAuthenticated && !authLoading) {
      console.log("[Loading] Autenticado! Redirecionando para dashboard...");
      const timer = setTimeout(() => {
        setLocation("/dashboard");
      }, 800); // Aumentado levemente para garantir sincronia
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, authLoading, setLocation]);

  // Timeout de segurança: se após 8 segundos o usuário ainda não está autenticado,
  // redireciona para a home (provavelmente o login falhou)
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeoutReached(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (timeoutReached && !authLoading) {
      setLocation("/");
    }
  }, [timeoutReached, authLoading, setLocation]);

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
