/**
 * Página de Checkout com Mercado Pago
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MercadoPagoCheckout from "@/components/MercadoPagoCheckout";

export default function Checkout() {
  const { user, loading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
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
    if (authLoading) return;

    if (!user || !planCode) {
      setLocation("/");
      return;
    }

    let active = true;
    const loadPreference = async () => {
      setIsLoading(true);
      setError(null);
      setPreferenceId(null);

      try {
        const result = await createPreference({
          planCode,
          successUrl: `${window.location.origin}/checkout/success`,
          failureUrl: `${window.location.origin}/checkout/failure`,
        });
        if (active) setPreferenceId(result.preferenceId);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Erro ao criar preferência de pagamento");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadPreference();
    return () => { active = false; };
  }, [authLoading, user?.id, planCode, setLocation, createPreference]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !planCode) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background bg-grid-pattern flex flex-col">
      <Navbar />

      <div className="flex-1 py-12 md:py-20">
        <div className="container max-w-2xl">
          <Button
            variant="ghost"
            onClick={() => setLocation("/#planos")}
            className="mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos planos
          </Button>

          <Card className="p-8 bg-card border-border/30">
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
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Carregando opções de pagamento...</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
