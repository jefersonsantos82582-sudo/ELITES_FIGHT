import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  type User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { useLocation } from "wouter";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
  redirectToDashboardOnLogin?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const {
    redirectOnUnauthenticated = false,
    redirectPath,
    redirectToDashboardOnLogin = false,
  } = options ?? {};

  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [fbLoading, setFbLoading] = useState(true);
  const [sessionError, setSessionError] = useState<Error | null>(null);
  const loginInProgressRef = useRef(false);
  // Armazenar a rota de destino antes do redirect para poder voltar depois
  const pendingRedirectRef = useRef<string | null>(null);
  // Flag para processar o redirect result apenas uma vez
  const redirectResultProcessed = useRef(false);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !fbLoading,
  });

  // ===== PROCESSAR REDIRECT RESULT =====
  // Este é o handler que processa o resultado quando o Firebase redireciona de volta
  // DEVE ser executado o mais cedo possível, antes de qualquer outra lógica
  useEffect(() => {
    if (redirectResultProcessed.current) return;
    redirectResultProcessed.current = true;

    async function processRedirectResult() {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          console.log("[Auth] Redirect result: login bem-sucedido via redirect");
          try {
            const token = await result.user.getIdToken(true);
            localStorage.setItem("firebase-token", token);
            await utils.auth.me.invalidate();
            // Usar a rota pendente se existir, senão ir pro dashboard
            const target = pendingRedirectRef.current || "/dashboard";
            pendingRedirectRef.current = null;
            // Pequeno delay para garantir que o backend tenha processado o usuário
            await new Promise(resolve => setTimeout(resolve, 1000));
            setLocation(target);
          } catch (tokenError) {
            console.error("[Auth] Erro ao obter token após redirect:", tokenError);
          }
        }
      } catch (error: any) {
        console.error("[Auth] Erro ao processar redirect result:", error.code, error.message);
        // Se deu erro no redirect, limpar e tentar novamente na próxima
        redirectResultProcessed.current = false;
      }
    }

    processRedirectResult();
  }, [setLocation, utils]);

  // ===== LISTENER PRINCIPAL DE AUTENTICAÇÃO =====
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFbUser(user);

      try {
        if (user) {
          const token = await user.getIdToken(true);
          localStorage.setItem("firebase-token", token);
          await utils.auth.me.invalidate();
        } else {
          localStorage.removeItem("firebase-token");
          utils.auth.me.setData(undefined, null);
          utils.dashboard.overview.reset();
        }
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error("Não foi possível atualizar sua sessão.");
        console.error("[Auth] Falha ao atualizar a sessão Firebase:", normalizedError);
        setSessionError(normalizedError);
      } finally {
        setFbLoading(false);
      }
    });

    return () => unsubscribe();
  }, [utils]);

  // ===== SYNC: Firebase autenticado mas servidor não reconhece =====
  useEffect(() => {
    if (!fbUser || meQuery.isLoading || meQuery.isFetching) return;

    if (meQuery.error) {
      setSessionError(meQuery.error instanceof Error ? meQuery.error : new Error("Não foi possível validar sua sessão."));
      return;
    }

    if (!meQuery.data && !meQuery.isLoading) {
      console.warn("[Auth] Firebase autenticado, mas servidor ainda não reconheceu o usuário.");
    }
  }, [fbUser, meQuery.data, meQuery.error, meQuery.isFetching, meQuery.isLoading]);

  // ===== REDIRECIONAR PARA DASHBOARD APÓS LOGIN =====
  useEffect(() => {
    if (redirectToDashboardOnLogin && meQuery.data && !meQuery.isLoading) {
      setLocation("/dashboard");
    }
  }, [meQuery.data, meQuery.isLoading, redirectToDashboardOnLogin, setLocation]);

  // ===== REDIRECIONAR PARA LOGIN SE NÃO AUTENTICADO =====
  useEffect(() => {
    if (!redirectOnUnauthenticated || fbLoading || meQuery.isLoading || (meQuery.data !== null && meQuery.data !== undefined)) return;

    if (redirectPath && window.location.pathname !== redirectPath) {
      setLocation(redirectPath);
    }
  }, [redirectOnUnauthenticated, redirectPath, fbLoading, meQuery.isLoading, setLocation, meQuery.data]);

  // ===== FUNÇÃO DE LOGIN =====
  const login = useCallback(async (customRedirect = "/dashboard") => {
    setSessionError(null);
    loginInProgressRef.current = true;

    try {
      // Garantir persistência antes do login
      await setPersistence(auth, browserLocalPersistence);

      // Salvar a rota de destino antes do redirect
      pendingRedirectRef.current = customRedirect;

      // Usar signInWithRedirect - redireciona a página inteira para o Google
      // Quando voltar, o getRedirectResult no useEffect acima vai processar
      console.log("[Auth] Iniciando signInWithRedirect para:", customRedirect);
      await signInWithRedirect(auth, googleProvider);
      // Nota: signInWithRedirect NUNCA retorna - ele redireciona a página
      // O controle não chega aqui. Quando volta, o useEffect processa o resultado.
    } catch (error: any) {
      console.error("[Auth] Falha no signInWithRedirect:", error.code, error.message);
      loginInProgressRef.current = false;
      if (error.code === 'auth/popup-blocked') {
        setSessionError(new Error("O popup foi bloqueado pelo navegador. Por favor, permita popups e tente novamente."));
      } else if (error.code === 'auth/unauthorized-domain') {
        setSessionError(new Error("Domínio não autorizado no Firebase. Contate o suporte."));
      } else {
        setSessionError(error instanceof Error ? error : new Error("Não foi possível entrar com Google."));
      }
      throw error;
    }
  }, [setLocation, utils]);

  // ===== FUNÇÃO DE LOGOUT =====
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("firebase-token");
      utils.auth.me.setData(undefined, null);
      utils.dashboard.overview.reset();
      await utils.auth.me.invalidate();
      setLocation("/");
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error("Não foi possível sair da conta.");
      setSessionError(normalizedError);
      throw normalizedError;
    }
  }, [utils, setLocation]);

  const loading = fbLoading || (fbUser !== null && meQuery.isLoading);
  const error = sessionError ?? (meQuery.error instanceof Error ? meQuery.error : null);
  const user = meQuery.data ?? null;

  return useMemo(() => ({
    user,
    loading,
    error,
    isAuthenticated: Boolean(user),
    refresh: () => meQuery.refetch(),
    login,
    logout,
  }), [error, loading, login, logout, meQuery, user]);
}
