import { useEffect, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, LogIn } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Tela de espera da sincronização de perfil COM SAÍDA.
 *
 * Antes o gerador (normal e IA) mostrava um spinner infinito quando o
 * Firebase tinha sessão mas o usuário do banco não chegava — a página ficava
 * "só carregando" para sempre. Agora a espera é limitada: passados alguns
 * segundos o usuário recebe uma explicação e botões de ação (tentar de novo
 * ou entrar novamente).
 */
export default function SessionSyncGate({
  redirectPath,
  timeoutMs = 6000,
}: {
  redirectPath: string;
  timeoutMs?: number;
}) {
  const utils = trpc.useUtils();
  const { login, syncFailed } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [timeoutMs]);

  // Enquanto espera, tenta reobter a sessão automaticamente (1x por segundo
  // nos primeiros segundos), o que resolve o caso de token recém-renovado.
  useEffect(() => {
    if (timedOut || syncFailed) return;
    const interval = setInterval(() => {
      void utils.auth.me.refetch().catch(() => {});
    }, 1500);
    return () => clearInterval(interval);
  }, [timedOut, syncFailed, utils]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await utils.auth.me.invalidate();
      await utils.auth.me.refetch();
    } catch {
      // ignorado: o próprio estado da tela orienta o usuário
    } finally {
      setRetrying(false);
      setTimedOut(false);
      setTimeout(() => setTimedOut(true), timeoutMs);
    }
  };

  // syncFailed vem do useAuth: auth.me falhou de vez, não faz sentido esperar.
  if (!timedOut && !syncFailed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Sincronizando seu perfil...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="p-8 text-center max-w-sm border-primary/20 bg-card/60 space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <div className="space-y-2">
          <h2 className="font-bold text-xl">Não conseguimos validar sua sessão</h2>
          <p className="text-sm text-muted-foreground">
            Sua conta está conectada, mas o servidor não confirmou o perfil.
            Tente novamente — se persistir, entre de novo com o Google.
          </p>
        </div>
        <div className="space-y-2">
          <Button onClick={() => void handleRetry()} disabled={retrying} className="w-full">
            {retrying ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Tentar novamente
          </Button>
          <Button variant="outline" onClick={() => void login(redirectPath)} className="w-full">
            <LogIn className="w-4 h-4 mr-2" />
            Entrar novamente
          </Button>
        </div>
      </Card>
    </div>
  );
}
