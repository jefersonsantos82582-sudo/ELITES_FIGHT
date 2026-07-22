import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { auth as firebaseAuth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  type User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider
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
  // Armazena o destino do redirect para usar após o retorno do Google
  const pendingRedirectPath = useRef<string | null>(null);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !fbLoading,
  });

  // ===== PROCESSAR REDIRECT RESULT =====
  useEffect(() => {
    if (redirectResultProcessed.current) return;

    async function processRedirectResult() {
      try {
        const result = await getRedirectResult(firebaseAuth);
        if (result && result.user) {
          console.log("[Auth] Login via redirect bem-sucedido");
          // Forçar refresh do token para garantir que está válido
          const token = await result.user.getIdToken(true);
          localStorage.setItem("firebase-token", token);
          redirectResultProcessed.current = true;

          // Aguardar a invalidação do cache e redirecionar
          await utils.auth.me.invalidate();

          // Recuperar o destino salvo antes do redirect ou usar /dashboard
          const savedPath = sessionStorage.getItem("auth-redirect-path") || "/dashboard";
          sessionStorage.removeItem("auth-redirect-path");
          setLocation(savedPath);
        }
      } catch (error: any) {
        console.error("[Auth] Erro ao processar redirect result:", error?.code, error?.message);
      } finally {
        redirectResultProcessed.current = true;
      }
    }

    processRedirectResult();
  }, []); // Sem dependências para rodar apenas uma vez na montagem

  // ===== LISTENER PRINCIPAL DE AUTENTICAÇÃO =====
  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!mounted) return;
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
        console.error("[Auth] Falha ao atualizar sessão:", error);
      } finally {
        if (mounted) setFbLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [utils]);

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
    if (loginPromiseRef.current) return loginPromiseRef.current;

    const loginPromise = (async () => {
      try {
        await setPersistence(firebaseAuth, browserLocalPersistence);

        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        provider.setCustomParameters({ prompt: 'select_account' });

        // Tentar popup primeiro (mais rápido em desktop)
        try {
          const result = await signInWithPopup(firebaseAuth, provider);
          const token = await result.user.getIdToken(true);
          localStorage.setItem("firebase-token", token);
          await utils.auth.me.invalidate();
          setLocation(customRedirect);
        } catch (popupError: any) {
          // Se popup falhar (bloqueado pelo navegador mobile/sandbox), usar redirect
          console.warn("[Auth] Popup falhou, usando redirect:", popupError?.code);
          // Salvar o destino para recuperar após o redirect do Google
          sessionStorage.setItem("auth-redirect-path", customRedirect);
          await signInWithRedirect(firebaseAuth, provider);
        }
      } catch (error: any) {
        console.error("[Auth] Falha no login:", error);
        setSessionError(error instanceof Error ? error : new Error("Falha ao entrar com Google."));
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
      await signOut(firebaseAuth);
      localStorage.removeItem("firebase-token");
      utils.auth.me.setData(undefined, null);
      utils.dashboard.overview.reset();
      await utils.auth.me.invalidate();
      setLocation("/");
    } catch (error) {
      console.error("[Auth] Erro no logout:", error);
    }
  }, [utils, setLocation]);

  const loading = fbLoading || (fbUser !== null && meQuery.isLoading);
  const user = meQuery.data ?? null;

  return useMemo(() => ({
    user,
    loading,
    error: sessionError,
    isAuthenticated: Boolean(user),
    login,
    logout,
  }), [user, loading, sessionError, login, logout]);
}
