import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [attempts, setAttempts] = useState(0);

  // Máximo 5 tentativas (antes era 10), com 1.5s entre cada (antes 2s)
  const MAX_ATTEMPTS = 5;

  useEffect(() => {
    let mounted = true;

    const refreshData = async () => {
      if (!mounted) return;
      setIsRefreshing(true);

      try {
        console.log(`[CheckoutSuccess] Tentativa ${attempts + 1}/${MAX_ATTEMPTS}`);

        await utils.auth.me.invalidate();
        const meData = await utils.auth.me.fetch();

        if (meData?.plan && meData.plan !== "free") {
          // Plano atualizado!
          await utils.dashboard.overview.invalidate();
          await utils.plans.list.invalidate();
          if (mounted) setIsRefreshing(false);
          console.log("[CheckoutSuccess] Plano atualizado!");
          return;
        }

        // Se atingiu max tentativas, liberar mesmo sem confirmação do webhook
        if (attempts >= MAX_ATTEMPTS - 1) {
          console.log("[CheckoutSuccess] Atingiu limite de tentativas. Liberando acesso.");
          await utils.dashboard.overview.invalidate();
          await utils.plans.list.invalidate();
          if (mounted) setIsRefreshing(false);
          return;
        }

        setAttempts(prev => prev + 1);
        if (mounted) {
          setTimeout(refreshData, 1500);
        }
      } catch (err) {
        console.error("[CheckoutSuccess] Erro ao atualizar:", err);
        if (mounted) setIsRefreshing(false);
      }
    };

    const initialTimer = setTimeout(refreshData, 1500);

    return () => {
      mounted = false;
      clearTimeout(initialTimer);
    };
  }, [utils, attempts]);

  return (
    <div className="min-h-screen bg-background bg-grid-pattern flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="container max-w-md">
          <Card className="p-8 text-center bg-card border-border/30">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Pagamento Confirmado!</h1>
            <p className="text-muted-foreground mb-4">
              Seu plano foi atualizado com sucesso. Você já pode aproveitar todos os recursos premium.
            </p>

            {isRefreshing && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
                <Loader2 className="w-4 h-4 animate-spin" />
                Atualizando seu plano... ({attempts + 1}/{MAX_ATTEMPTS})
              </div>
            )}

            <Button
              className="w-full bg-gold-gradient text-black font-semibold"
              onClick={() => setLocation("/dashboard")}
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Ir para o Dashboard (em breve)
                </>
              ) : (
                <>
                  Ir para o Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            {!isRefreshing && (
              <p className="text-xs text-muted-foreground mt-3">
                Se seu plano ainda não apareceu atualizado, atualize a página em alguns segundos.
              </p>
            )}
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
