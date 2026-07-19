/**
 * Componente de Checkout com Mercado Pago
 * Integra o botão de pagamento do Mercado Pago
 */

import { useEffect, useRef } from "react";
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
  const checkoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Carregar o script do Mercado Pago
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => {
      if (window.MercadoPago) {
        // Inicializar Mercado Pago com a chave pública
        const publicKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;
        if (publicKey) {
          window.MercadoPago.setPublishableKey(publicKey);

          // Renderizar o checkout
          if (checkoutRef.current && preferenceId) {
            const checkout = new window.MercadoPago.Checkout({
              preference: {
                id: preferenceId,
              },
              render: "wallet",
              label: "Pagar com Mercado Pago",
            });
          }
        }
      }
    };
    script.onerror = () => {
      onError?.(new Error("Falha ao carregar SDK do Mercado Pago"));
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [preferenceId, onError]);

  return (
    <div className="w-full">
      <div ref={checkoutRef} id="wallet_container" />

      {isLoading && (
        <Button disabled className="w-full mt-4">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processando...
        </Button>
      )}
    </div>
  );
}

// Declarar tipos globais para o Mercado Pago
declare global {
  interface Window {
    MercadoPago: any;
  }
}
