import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
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
  const loginPromiseRef = useRef<Promise<void> | null>(null);
  const redirectResultProcessed = useRef(false);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !fbLoading,
  });

  // Listener principal de autenticação - onAuthStateChanged
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFbUser(user);

      try {
        if (user) {
          const token = await user.getIdToken(true);
          localStorage.setItem("firebase-token", token);
          // Invalidar o cache para forçar re-fetch do me
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

  // Processar redirect result do Firebase (quando vem de signInWithRedirect)
  useEffect(() => {
    if (redirectResultProcessed.current) return;
    redirectResultProcessed.current = true;

    async function processRedirectResult() {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          console.log("[Auth] Redirect result: login bem-sucedido via redirect");
          const token = await result.user.getIdToken(true);
          localStorage.setItem("firebase-token", token);
          await utils.auth.me.invalidate();
          // Redirecionar para o dashboard após redirect login
          setLocation("/dashboard");
        }
      } catch (error) {
        console.error("[Auth] Erro ao processar redirect result:", error);
      }
    }

    processRedirectResult();
  }, [setLocation, utils]);

  // Sync: quando temos user do Firebase mas o servidor ainda não reconhece
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

  // Redirecionar para dashboard após login bem-sucedido
  useEffect(() => {
    if (redirectToDashboardOnLogin && meQuery.data && !meQuery.isLoading) {
      setLocation("/dashboard");
    }
  }, [meQuery.data, meQuery.isLoading, redirectToDashboardOnLogin, setLocation]);

  // Redirecionar para login se não autenticado e rota protegida
  useEffect(() => {
    if (!redirectOnUnauthenticated || fbLoading || meQuery.isLoading || (meQuery.data !== null && meQuery.data !== undefined)) return;

    if (redirectPath && window.location.pathname !== redirectPath) {
      setLocation(redirectPath);
    }
  }, [redirectOnUnauthenticated, redirectPath, fbLoading, meQuery.isLoading, setLocation, meQuery.data]);

  const login = useCallback(async (customRedirect = "/dashboard") => {
    setSessionError(null);

    // Evitar múltiplos cliques simultâneos
    if (loginPromiseRef.current) {
      return loginPromiseRef.current;
    }

    const loginPromise = (async () => {
      try {
        // Garantir persistência antes do login
        await setPersistence(auth, browserLocalPersistence);

        // Estratégia: tentar signInWithPopup primeiro
        // Se falhar (popup blocked ou cross-origin issues), fallback para signInWithRedirect
        try {
          const result = await signInWithPopup(auth, googleProvider);
          const token = await result.user.getIdToken(true);
          localStorage.setItem("firebase-token", token);

          // Invalidar cache e forçar re-fetch
          await utils.auth.me.invalidate();
          await utils.auth.me.fetch();

          // Aguardar até que o servidor reconheça o usuário
          const maxAttempts = 10;
          let attempts = 0;
          while (attempts < maxAttempts) {
            const session = await utils.auth.me.fetch();
            if (session) break;
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // Redirecionar para o dashboard após confirmação de sessão
          setLocation(customRedirect);
        } catch (popupError: any) {
          // Se o popup foi bloqueado ou falhou por cross-origin, usar redirect
          console.warn("[Auth] signInWithPopup falhou, tentando signInWithRedirect:", popupError);
          setSessionError(null);
          await signInWithRedirect(auth, googleProvider);
          // A página será redirecionada e o redirectResult será processado no useEffect acima
        }
      } catch (error: any) {
        console.error("[Auth] Falha no login:", error);
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
          setSessionError(null);
        } else if (error.code === 'auth/popup-blocked') {
          setSessionError(new Error("O popup foi bloqueado pelo navegador. Por favor, permita popups e tente novamente."));
        } else {
          setSessionError(error instanceof Error ? error : new Error("Não foi possível entrar com Google."));
        }
        throw error;
      } finally {
        loginPromiseRef.current = null;
      }
    })();

    loginPromiseRef.current = loginPromise;
    return loginPromise;
  }, [setLocation, utils]);

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
