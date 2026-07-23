/**
 * Componente de Checkout com Mercado Pago
 * Integra o botão de pagamento do Mercado Pago
 */

import { useEffect, useRef, useState } from "react";
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
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Carregar SDK do Mercado Pago
  useEffect(() => {
    // Se já está carregado, não faz nada
    if (window.MercadoPago) {
      console.log("[MercadoPago] SDK já estava carregado");
      setSdkLoaded(true);
      return;
    }

    console.log("[MercadoPago] Iniciando carregamento do SDK...");
    setDebugInfo("Carregando SDK do Mercado Pago...");

    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    
    script.onload = () => {
      console.log("[MercadoPago] SDK carregado com sucesso");
      setDebugInfo("SDK carregado ✓");
      setSdkLoaded(true);
    };
    
    script.onerror = () => {
      const err = "Falha ao carregar SDK do Mercado Pago. Verifique sua conexão.";
      console.error("[MercadoPago] Erro ao carregar:", err);
      setDebugInfo(`Erro: ${err}`);
      setBrickError(err);
      onError?.(new Error(err));
    };
    
    document.body.appendChild(script);

    return () => {
      // Não removemos o script para evitar recarregamentos desnecessários
    };
  }, [onError]);

  // Renderizar o Brick quando SDK estiver pronto e preferenceId estiver disponível
  useEffect(() => {
    if (!sdkLoaded) {
      console.log("[MercadoPago] SDK não está pronto ainda");
      return;
    }

    if (!preferenceId) {
      console.log("[MercadoPago] preferenceId não está disponível");
      setDebugInfo("Aguardando preferenceId...");
      return;
    }

    if (!containerRef.current) {
      console.log("[MercadoPago] Container não encontrado");
      return;
    }

    console.log("[MercadoPago] Iniciando renderização do Brick com preferenceId:", preferenceId);
    setDebugInfo("Inicializando checkout...");
    setBrickError(null);

    // Limpar container antes de renderizar
    containerRef.current.innerHTML = "";

    try {
      const publicKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;
      
      if (!publicKey) {
        const err = "Chave pública do Mercado Pago não configurada (VITE_MERCADO_PAGO_PUBLIC_KEY)";
        console.error("[MercadoPago]", err);
        setDebugInfo(`Erro: ${err}`);
        setBrickError(err);
        onError?.(new Error(err));
        return;
      }

      console.log("[MercadoPago] Chave pública encontrada, inicializando...");
      setDebugInfo("Inicializando Mercado Pago...");

      // Inicializar Mercado Pago
      const mp = new window.MercadoPago(publicKey, {
        locale: "pt-BR",
      });

      console.log("[MercadoPago] Instância criada, criando bricksBuilder...");
      const bricksBuilder = mp.bricks();
      bricksBuilderRef.current = bricksBuilder;

      // Configurar e renderizar o Wallet Brick
      const settings = {
        initialization: {
          preferenceId: preferenceId,
          redirectMode: "modal",
        },
        callbacks: {
          onReady: () => {
            console.log("[MercadoPago] Wallet Brick pronto para usar");
            setDebugInfo("Checkout pronto ✓");
            setBrickError(null);
          },
          onSubmit: () => {
            console.log("[MercadoPago] Pagamento iniciado");
            setDebugInfo("Processando pagamento...");
          },
          onError: (error: any) => {
            console.error("[MercadoPago] Erro no Brick:", error);
            const msg = error?.message || error?.cause?.message || "Erro ao carregar checkout";
            setDebugInfo(`Erro no Brick: ${msg}`);
            setBrickError(msg);
            onError?.(new Error(msg));
          },
          onSuccess: (data: any) => {
            console.log("[MercadoPago] Pagamento concluído com sucesso:", data);
            setDebugInfo("Pagamento concluído ✓");
            onSuccess?.();
          },
          onPending: () => {
            console.log("[MercadoPago] Pagamento pendente");
            setDebugInfo("Pagamento pendente...");
          },
        },
      };

      console.log("[MercadoPago] Renderizando Brick com settings:", settings);
      setDebugInfo("Renderizando formas de pagamento...");

      bricksBuilder.create("wallet", "wallet_container", settings).then(() => {
        console.log("[MercadoPago] Brick renderizado com sucesso");
        setDebugInfo("Formas de pagamento carregadas ✓");
      }).catch((err: any) => {
        console.error("[MercadoPago] Erro ao criar Brick:", err);
        const msg = err?.message || "Erro ao renderizar checkout";
        setDebugInfo(`Erro ao renderizar: ${msg}`);
        setBrickError(msg);
        onError?.(new Error(msg));
      });

    } catch (err) {
      console.error("[MercadoPago] Exceção ao inicializar:", err);
      const msg = err instanceof Error ? err.message : "Erro desconhecido ao inicializar checkout";
      setDebugInfo(`Exceção: ${msg}`);
      setBrickError(msg);
      onError?.(err instanceof Error ? err : new Error(msg));
    }
  }, [sdkLoaded, preferenceId, onError, onSuccess]);

  return (
    <div className="w-full space-y-4">
      {/* Debug Info - Remover em produção */}
      {process.env.NODE_ENV === "development" && debugInfo && (
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border border-border/30">
          Debug: {debugInfo}
        </div>
      )}

      <div id="wallet_container" ref={containerRef} className="min-h-[100px] flex items-center justify-center">
        {brickError ? (
          <div className="text-center py-6 w-full">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
            <p className="text-sm text-destructive mb-3">{brickError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log("[MercadoPago] Tentando novamente...");
                setBrickError(null);
                setDebugInfo("Tentando novamente...");
                if (containerRef.current) {
                  containerRef.current.innerHTML = "";
                }
                // Forçar re-renderização
                if (bricksBuilderRef.current && preferenceId) {
                  const settings = {
                    initialization: {
                      preferenceId: preferenceId,
                      redirectMode: "modal",
                    },
                    callbacks: {
                      onReady: () => {
                        console.log("[MercadoPago] Brick pronto após retry");
                        setDebugInfo("Checkout pronto ✓");
                        setBrickError(null);
                      },
                      onError: (error: any) => {
                        console.error("[MercadoPago] Erro após retry:", error);
                        setBrickError(error?.message || "Erro ao carregar checkout");
                      },
                    },
                  };
                  bricksBuilderRef.current.create("wallet", "wallet_container", settings);
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
