/**
 * Página de Checkout com Mercado Pago
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft, Check, LogIn } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MercadoPagoCheckout from "@/components/MercadoPagoCheckout";
import DashboardLayout from "@/components/DashboardLayout";

export default function Checkout() {
  const { user, fbUser, isSyncing, loading: authLoading, login } = useAuth();
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);

  // Extrair planCode da URL
  const searchParams = new URLSearchParams(window.location.search);
  const requestedPlan = searchParams.get("plan");
  const planCode = requestedPlan === "pro" || requestedPlan === "elite" ? requestedPlan : null;

  // Query para obter informações do plano
  const { data: planInfo } = trpc.payment.getPlanInfo.useQuery(
    { planCode: planCode || "pro" },
    { enabled: Boolean(planCode) }
  );

  // Mutation para criar preferência de pagamento
  const { mutateAsync: createPreference } = trpc.payment.createUpgradePreference.useMutation();
  const planFeatures = Array.isArray(planInfo?.features)
    ? planInfo.features.filter((feature): feature is string => typeof feature === "string")
    : [];

  useEffect(() => {
    // Se não há planCode válido, voltar para a home
    if (!planCode) {
      setLocation("/");
      return;
    }

    // Tunnel de emergência: se já temos fbUser (Firebase) mas o 'user' (DB) ainda está carregando,
    // vamos permitir a tentativa de criar preferência para ser super rápido.
    if (!fbUser && !user && !authLoading) return;
    if (authLoading && !fbUser) return;

    let active = true;
    const loadPreference = async (retryCount = 0) => {
      if (retryCount === 0) {
        setIsLoading(true);
        setError(null);
      }
      
      try {
        const result = await createPreference({
          planCode,
          successUrl: `${window.location.origin}/checkout/success`,
          failureUrl: `${window.location.origin}/checkout/failure`,
        });
        if (active) {
          setPreferenceId(result.preferenceId);
          setIsLoading(false);
        }
      } catch (err) {
        console.error(`[Checkout] Tentativa ${retryCount + 1} falhou:`, err);
        
        // Se falhou por autenticação ou sincronização, tentar novamente até 3 vezes
        if (active && retryCount < 3) {
          setTimeout(() => loadPreference(retryCount + 1), 1500);
        } else if (active) {
          setError(err instanceof Error ? err.message : "Erro ao criar preferência de pagamento");
          setIsLoading(false);
        }
      }
    };

    void loadPreference();
    return () => { active = false; };
  }, [authLoading, user?.id, planCode, setLocation, createPreference]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      // Após o login, redirecionar para a tela de loading -> dashboard
      await login("/loading");
    } catch (err) {
      console.error("[Checkout] Erro no login:", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Mostrar carregamento apenas se estiver realmente sem NENHUMA info de usuário
  // Se já temos fbUser, vamos tentar renderizar a página para acelerar
  if (authLoading && !fbUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!planCode) {
    return null;
  }

  // O DashboardLayout já lida com o estado de deslogado.
  // Se chegamos aqui sem nada, apenas mostramos um loading neutro até o layout assumir.
  if (!user && !fbUser && authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
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
              <h1 className="text-3xl font-bold mb-2">Upgrade de Plano</h1>
              <p className="text-muted-foreground">
                {planInfo?.name} - R$ {planInfo?.price}/mês
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-8 text-destructive">
                <p className="font-semibold mb-1">Erro</p>
                <p className="text-sm">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setError(null);
                    setPreferenceId(null);
                    // Re-trigger o useEffect
                    setIsLoading(true);
                    createPreference({
                      planCode: planCode!,
                      successUrl: `${window.location.origin}/checkout/success`,
                      failureUrl: `${window.location.origin}/checkout/failure`,
                    })
                      .then(result => setPreferenceId(result.preferenceId))
                      .catch(err => setError(err instanceof Error ? err.message : "Erro ao criar preferência"))
                      .finally(() => setIsLoading(false));
                  }}
                >
                  Tentar novamente
                </Button>
              </div>
            )}

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground animate-pulse">
                  Criando seu túnel de pagamento seguro...
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
                      setLocation("/checkout/success");
                    }}
                    onError={(err) => {
                      setError(err.message);
                    }}
                  />
                </div>
              </div>
            ) : !error ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Carregando opções de pagamento...</p>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
