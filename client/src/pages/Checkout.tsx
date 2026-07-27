/**
 * Página de Checkout com Mercado Pago - COM TIMEOUT DE SEGURANÇA
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft, Check, AlertCircle, CreditCard } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MercadoPagoCheckout from "@/components/MercadoPagoCheckout";
import DashboardLayout from "@/components/DashboardLayout";

export default function Checkout() {
  const { user, fbUser, isSyncing, loading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // TIMEOUT GLOBAL: se não criar preferência em 15s, mostrar erro
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const requestedPlan = searchParams.get("plan");
  const planCode = requestedPlan === "pro" || requestedPlan === "elite" ? requestedPlan : null;

  const { data: planInfo } = trpc.payment.getPlanInfo.useQuery(
    { planCode: planCode || "pro" },
    { 
      enabled: Boolean(planCode), 
      staleTime: 10 * 60 * 1000, // 10 minutos de cache para planos
      refetchOnMount: false 
    }
  );

  const createPreferenceMutation = trpc.payment.createUpgradePreference.useMutation();

  const planFeatures = Array.isArray(planInfo?.features)
    ? planInfo.features.filter((feature): feature is string => typeof feature === "string")
    : [];

  const createPreference = useCallback(async () => {
    if (!planCode || !user) return;

    setIsLoading(true);
    setError(null);

    // Limpar timeout anterior
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // TIMEOUT: 15 segundos para criar preferência
    timeoutRef.current = setTimeout(() => {
      setError("Tempo esgotado ao conectar com o servidor de pagamento. Tente novamente.");
      setIsLoading(false);
    }, 15000);

    try {
      console.log(`[Checkout] Criando preferência para plano: ${planCode}, tentativa ${retryCount + 1}`);

      const result = await createPreferenceMutation.mutateAsync({
        planCode,
        successUrl: `${window.location.origin}/checkout/success`,
        failureUrl: `${window.location.origin}/checkout/failure`,
      });

      // Limpar timeout pois deu certo
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      console.log("[Checkout] Preferência criada:", result.preferenceId);
      setPreferenceId(result.preferenceId);
      setIsLoading(false);
    } catch (err: any) {
      // Limpar timeout pois deu erro
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const errorMsg = err?.message || "Erro desconhecido";
      console.error(`[Checkout] Erro na tentativa ${retryCount + 1}:`, errorMsg);

      const isAuthError = errorMsg.includes("login") || errorMsg.includes("10001") ||
        errorMsg.includes("auth") || errorMsg.includes("session") ||
        errorMsg.includes("unauthorized") || errorMsg.includes("token") ||
        errorMsg.includes("FORBIDDEN");

      if (isAuthError && retryCount < 2) {
        console.log(`[Checkout] Erro de auth, retentando em 2s...`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          trpc.auth.me.invalidate();
          trpc.auth.me.refetch();
        }, 2000);
      } else {
        setError(errorMsg);
        setIsLoading(false);
      }
    }
  }, [planCode, user?.id, retryCount, createPreferenceMutation]);

  useEffect(() => {
    if (!planCode) {
      setLocation("/");
      return;
    }

    // Só iniciamos a criação da preferência quando:
    // 1. Não estamos mais em fase de carregamento inicial (authLoading)
    // 2. Não estamos sincronizando com o banco de dados (isSyncing)
    // 3. Temos o objeto 'user' do banco de dados pronto
    if (authLoading || isSyncing || !user) {
      return;
    }

    // Usuário autenticado e sincronizado, criar preferência (apenas na primeira vez)
    if (!preferenceId && !isLoading && !error) {
      createPreference();
    }
  }, [planCode, user?.id, setLocation, authLoading, isSyncing, preferenceId, isLoading, error, createPreference]);

  // Cleanup timeout ao desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  if (!planCode) return null;

  // Se não tem user nem fbUser, DashboardLayout vai mostrar tela de login
  if (!user && !fbUser) {
    return (
      <DashboardLayout>
        <div className="py-8 md:py-12">
          <div className="container max-w-2xl text-center">
            <p className="text-muted-foreground mb-4">Faça login para continuar com o pagamento.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="py-8 md:py-12">
        <div className="container max-w-2xl">
          <Button
            variant="ghost"
            onClick={() => setLocation("/dashboard")}
            className="mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao dashboard
          </Button>

          <Card className="p-8 bg-card border-border/30 shadow-xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Upgrade de Plano</h1>
              <p className="text-muted-foreground">
                {planInfo?.name} - R$ {planInfo?.price}/mês
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-8 text-destructive">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Erro</p>
                    <p className="text-sm mb-3">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setError(null);
                        setPreferenceId(null);
                        setRetryCount(0);
                        trpc.auth.me.invalidate();
                        setTimeout(() => createPreference(), 500);
                      }}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {retryCount > 0 ? `Retentando... (${retryCount}/2)` : "Preparando seu pagamento seguro..."}
                </p>
              </div>
            ) : preferenceId ? (
              <div>
                <div className="mb-8">
                  <h2 className="font-semibold mb-4">Benefícios do plano:</h2>
                  <ul className="space-y-2">
                    {planFeatures.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-border/30 pt-8">
                  <h2 className="font-semibold mb-4">Escolha seu método de pagamento:</h2>
                  <MercadoPagoCheckout
                    preferenceId={preferenceId}
                    onSuccess={() => {
                      console.log("[Checkout] Pagamento concluído, redirecionando...");
                      setLocation("/checkout/success");
                    }}
                    onError={(err) => {
                      console.error("[Checkout] Erro no checkout:", err);
                      setError(err.message);
                      setPreferenceId(null);
                    }}
                  />
                </div>
              </div>
            ) : !error ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Conectando ao servidor de pagamento...</p>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
