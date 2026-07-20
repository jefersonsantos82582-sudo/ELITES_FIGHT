/**
 * Componente de Checkout com Mercado Pago
 * Integra o botão de pagamento do Mercado Pago
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface MercadoPagoCheckoutProps {
  preferenceId: string;
  isLoading?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export default function MercadoPagoCheckout({
  preferenceId,
  isLoading = false,
  onSuccess,
  onError,
}: MercadoPagoCheckoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  useEffect(() => {
    // Evitar carregar o script múltiplas vezes
    if (window.MercadoPago) {
      setSdkLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => {
      setSdkLoaded(true);
    };
    script.onerror = () => {
      onError?.(new Error("Falha ao carregar SDK do Mercado Pago"));
    };
    document.body.appendChild(script);

    return () => {
      // Não removemos o script para evitar recarregamentos desnecessários
    };
  }, [onError]);

  useEffect(() => {
    if (sdkLoaded && preferenceId && containerRef.current) {
      // Limpar container antes de renderizar
      containerRef.current.innerHTML = "";
      
      try {
        const publicKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;
        if (!publicKey) {
          console.error("VITE_MERCADO_PAGO_PUBLIC_KEY não configurada");
          return;
        }

        const mp = new window.MercadoPago(publicKey, {
          locale: "pt-BR",
        });

        const bricksBuilder = mp.bricks();

        const renderWalletBrick = async (bricksBuilder: any) => {
          const settings = {
            initialization: {
              preferenceId: preferenceId,
              redirectMode: "modal", // Abre em modal para melhor UX
            },
            callbacks: {
              onReady: () => {
                console.log("Wallet Brick pronto");
              },
              onSubmit: () => {
                console.log("Pagamento iniciado");
              },
              onError: (error: any) => {
                console.error("Erro no Brick:", error);
                onError?.(new Error(error.message || "Erro ao carregar checkout"));
              },
            },
          };
          
          await bricksBuilder.create("wallet", "wallet_container", settings);
        };

        renderWalletBrick(bricksBuilder);
      } catch (err) {
        console.error("Erro ao inicializar Mercado Pago:", err);
        onError?.(err instanceof Error ? err : new Error("Erro ao inicializar checkout"));
      }
    }
  }, [sdkLoaded, preferenceId, onError]);

  return (
    <div className="w-full">
      <div id="wallet_container" ref={containerRef} className="min-h-[100px] flex items-center justify-center">
        {(!sdkLoaded || isLoading) && (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Preparando checkout...</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Declarar tipos globais para o Mercado Pago
declare global {
  interface Window {
    MercadoPago: any;
  }
}
