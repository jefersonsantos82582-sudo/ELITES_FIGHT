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
  const [brickError, setBrickError] = useState<string | null>(null);

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
      const err = new Error("Falha ao carregar SDK do Mercado Pago");
      setBrickError(err.message);
      onError?.(err);
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
      setBrickError(null);

      try {
        const publicKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;
        if (!publicKey) {
          const err = new Error(
            "Chave pública do Mercado Pago não configurada. " +
            "Configure a variável VITE_MERCADO_PAGO_PUBLIC_KEY no servidor."
          );
          console.error("[MercadoPago] Public key ausente:", err.message);
          setBrickError(err.message);
          onError?.(err);
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
                setBrickError(null);
              },
              onSubmit: () => {
                console.log("Pagamento iniciado");
              },
              onError: (error: any) => {
                console.error("Erro no Brick:", error);
                const msg = error?.message || "Erro ao carregar checkout";
                setBrickError(msg);
                onError?.(new Error(msg));
              },
              onSuccess: () => {
                console.log("Pagamento concluído com sucesso");
                onSuccess?.();
              },
              onPending: () => {
                console.log("Pagamento pendente");
              },
            },
          };

          await bricksBuilder.create("wallet", "wallet_container", settings);
        };

        renderWalletBrick(bricksBuilder);
      } catch (err) {
        console.error("Erro ao inicializar Mercado Pago:", err);
        const msg = err instanceof Error ? err.message : "Erro ao inicializar checkout";
        setBrickError(msg);
        onError?.(err instanceof Error ? err : new Error(msg));
      }
    }
  }, [sdkLoaded, preferenceId, onError, onSuccess]);

  return (
    <div className="w-full">
      <div id="wallet_container" ref={containerRef} className="min-h-[100px] flex items-center justify-center">
        {brickError ? (
          <div className="text-center py-6">
            <p className="text-sm text-destructive mb-3">{brickError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setBrickError(null);
                if (containerRef.current) {
                  containerRef.current.innerHTML = "";
                }
              }}
            >
              Tentar novamente
            </Button>
          </div>
        ) : (!sdkLoaded || isLoading) ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Preparando checkout...</p>
          </div>
        ) : null}
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
