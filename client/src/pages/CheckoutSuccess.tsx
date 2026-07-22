import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, ArrowRight, Loader2 } from "lucide-react";
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

  useEffect(() => {
    // Invalidar todos os caches relevantes para refletir o novo plano
    // O webhook do Mercado Pago pode levar alguns segundos para processar.
    // Realizamos múltiplas tentativas para garantir que o usuário veja o plano atualizado.
    let mounted = true;
    let attempts = 0;
    const maxAttempts = 5;

    const refreshData = async () => {
      if (!mounted) return;
      setIsRefreshing(true);
      
      try {
        console.log(`[CheckoutSuccess] Tentativa de atualização ${attempts + 1}/${maxAttempts}`);
        
        // Invalidar caches
        await utils.auth.me.invalidate();
        const meResult = await utils.auth.me.refetch();
        
        // Se o plano mudou de 'free' para algo premium, ou se já atingimos o limite de tentativas
        if ((meResult.data?.plan && meResult.data.plan !== "free") || attempts >= maxAttempts - 1) {
          await utils.dashboard.overview.invalidate();
          await utils.plans.list.invalidate();
          if (mounted) setIsRefreshing(false);
          console.log("[CheckoutSuccess] Plano atualizado com sucesso!");
        } else {
          // Tentar novamente em 3 segundos
          attempts++;
          setTimeout(refreshData, 3000);
        }
      } catch (err) {
        console.error("[CheckoutSuccess] Erro ao atualizar dados:", err);
        if (mounted) setIsRefreshing(false);
      }
    };

    // Primeira tentativa após um pequeno delay para o webhook processar
    const initialTimer = setTimeout(refreshData, 2000);
    
    return () => {
      mounted = false;
      clearTimeout(initialTimer);
    };
  }, [utils]);

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
                Atualizando seu plano...
              </div>
            )}

            <Button 
              className="w-full bg-gold-gradient text-black font-semibold"
              onClick={() => setLocation("/dashboard")}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Aguarde...
                </>
              ) : (
                <>
                  Ir para o Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
