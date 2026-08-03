import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const VISITOR_KEY = "ef_visitor_id";

/**
 * Gera (ou recupera) um identificador estável do visitante.
 * Fica guardado no localStorage, então a mesma pessoa não é contada
 * várias vezes ao navegar ou voltar depois no site.
 */
function getVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;

    const generated =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

    localStorage.setItem(VISITOR_KEY, generated);
    return generated;
  } catch {
    // Navegador com storage bloqueado: usa um id efêmero só para esta sessão.
    return `anon_${Math.random().toString(36).slice(2, 12)}`;
  }
}

/**
 * Registra no backend cada página que o visitante abre.
 * "Entrou, contou": o servidor deduplica a mesma página do mesmo visitante
 * dentro de 30 minutos, então F5 não infla a métrica.
 */
export function usePageTracking() {
  const [location] = useLocation();
  const trackMutation = trpc.analytics.track.useMutation();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (lastTracked.current === location) return;
    lastTracked.current = location;

    try {
      trackMutation.mutate({
        page: location.slice(0, 255) || "/",
        sessionId: getVisitorId(),
        referer: typeof document !== "undefined" && document.referrer
          ? document.referrer.slice(0, 500)
          : undefined,
      });
    } catch (err) {
      // Analytics nunca pode quebrar a navegação.
      console.error("[analytics] falha ao registrar acesso:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);
}
