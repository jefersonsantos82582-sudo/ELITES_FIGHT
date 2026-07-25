/**
 * Componente de Checkout com Mercado Pago - CORRIGIDO
 * Lifecycle correto, cleanup adequado, retry com remount
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";

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
  const bricksBuilderRef = useRef<any>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [brickError, setBrickError] = useState<string | null>(null);
  const [brickMounted, setBrickMounted] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  // Carregar SDK do Mercado Pago (uma vez)
  useEffect(() => {
    if (window.MercadoPago) {
      console.log("[MercadoPago] SDK já estava carregado");
      setSdkLoaded(true);
      return;
    }

    console.log("[MercadoPago] Iniciando carregamento do SDK...");

    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;

    script.onload = () => {
      console.log("[MercadoPago] SDK carregado com sucesso");
      setSdkLoaded(true);
    };

    script.onerror = () => {
      const err = "Falha ao carregar SDK do Mercado Pago. Verifique sua conexão.";
      console.error("[MercadoPago] Erro ao carregar:", err);
      setBrickError(err);
      onError?.(new Error(err));
    };

    document.body.appendChild(script);
  }, [onError]);

  // Limpar brick anterior antes de renderizar novo
  const cleanupBrick = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }
    bricksBuilderRef.current = null;
    setBrickMounted(false);
  }, []);

  // Renderizar o Brick quando SDK e preferenceId estiverem prontos
  useEffect(() => {
    if (!sdkLoaded || !preferenceId || !containerRef.current || isLoading) {
      return;
    }

    // Limpar brick anterior
    cleanupBrick();

    console.log("[MercadoPago] Renderizando Brick com preferenceId:", preferenceId);

    try {
      const publicKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;

      if (!publicKey) {
        const err = "Chave pública do Mercado Pago não configurada (VITE_MERCADO_PAGO_PUBLIC_KEY)";
        console.error("[MercadoPago]", err);
        setBrickError(err);
        onError?.(new Error(err));
        return;
      }

      console.log("[MercadoPago] Inicializando Mercado Pago...");

      const mp = new window.MercadoPago(publicKey, {
        locale: "pt-BR",
      });

      const bricksBuilder = mp.bricks();
      bricksBuilderRef.current = bricksBuilder;

      const settings = {
        initialization: {
          preferenceId: preferenceId,
          redirectMode: "self" as const,
          preferences: {
            backUrl: window.location.origin,
          },
        },
        customization: {
          texts: {
            valueProp: "smart_option",
          },
        },
        callbacks: {
          onReady: () => {
            console.log("[MercadoPago] Wallet Brick pronto");
            setBrickError(null);
            setBrickMounted(true);
          },
          onSubmit: () => {
            console.log("[MercadoPago] Pagamento iniciado");
          },
          onError: (error: any) => {
            console.error("[MercadoPago] Erro no Brick:", error);
            const msg = error?.message || error?.cause?.message || "Erro ao carregar checkout";
            setBrickError(msg);
            onError?.(new Error(msg));
          },
          onSuccess: (data: any) => {
            console.log("[MercadoPago] Pagamento concluído:", data);
            onSuccess?.();
          },
        },
      };

      bricksBuilder
        .create("wallet", "wallet_container", settings)
        .then(() => {
          console.log("[MercadoPago] Brick renderizado com sucesso");
        })
        .catch((err: any) => {
          console.error("[MercadoPago] Erro ao criar Brick:", err);
          const msg = err?.message || "Erro ao renderizar checkout";
          setBrickError(msg);
          onError?.(new Error(msg));
        });
    } catch (err) {
      console.error("[MercadoPago] Exceção ao inicializar:", err);
      const msg = err instanceof Error ? err.message : "Erro desconhecido ao inicializar checkout";
      setBrickError(msg);
      onError?.(err instanceof Error ? err : new Error(msg));
    }

    return () => {
      cleanupBrick();
    };
  }, [sdkLoaded, preferenceId, renderKey, isLoading]);

  const handleRetry = () => {
    console.log("[MercadoPago] Retry após erro...");
    setBrickError(null);
    setBrickMounted(false);
    setRenderKey(prev => prev + 1);
  };

  return (
    <div className="w-full space-y-4">
      <div id="wallet_container" ref={containerRef} className="min-h-[120px] flex items-center justify-center">
        {brickError ? (
          <div className="text-center py-6 w-full">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
            <p className="text-sm text-destructive mb-3">{brickError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
            >
              Tentar novamente
            </Button>
          </div>
        ) : !sdkLoaded || isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando opções de pagamento...</p>
          </div>
        ) : !brickMounted ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Preparando checkout...</p>
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
