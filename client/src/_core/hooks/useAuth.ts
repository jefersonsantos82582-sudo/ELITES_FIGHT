import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { auth as firebaseAuth, GOOGLE_REDIRECT_URI } from "@/lib/firebase";
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

/**
 * Verificar se o Google Client Secret está configurado no servidor.
 * Se estiver, usamos o fluxo de redirect direto.
 * Caso contrário, usamos o signInWithPopup do Firebase.
 */
async function isServerOAuthConfigured(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/google/check");
    if (res.ok) {
      const data = await res.json();
      return data.configured === true;
    }
  } catch {
    // Se o endpoint não existir, o servidor não tem o secret
  }
  return false;
}

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
  const pendingRedirectRef = useRef<string | null>(null);
  const serverOAuthRef = useRef<boolean | null>(null);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !fbLoading,
  });

  // Verificar se o servidor OAuth está configurado
  useEffect(() => {
    isServerOAuthConfigured().then(configured => {
      serverOAuthRef.current = configured;
    });
  }, []);

  // ===== PROCESSAR REDIRECT RESULT (fallback para signInWithRedirect) =====
  useEffect(() => {
    if (redirectResultProcessed.current) return;
    redirectResultProcessed.current = true;

    async function processRedirectResult() {
      try {
        const result = await getRedirectResult(firebaseAuth);
        if (result && result.user) {
          console.log("[Auth] Redirect result: login bem-sucedido via redirect");
          const token = await result.user.getIdToken(true);
          localStorage.setItem("firebase-token", token);
          await utils.auth.me.invalidate();
          const target = pendingRedirectRef.current || "/dashboard";
          pendingRedirectRef.current = null;
          await new Promise(resolve => setTimeout(resolve, 1500));
          setLocation(target);
        }
      } catch (error: any) {
        console.error("[Auth] Erro ao processar redirect result:", error?.code, error?.message);
        redirectResultProcessed.current = false;
      }
    }

    processRedirectResult();
  }, [setLocation, utils]);

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
        const normalizedError = error instanceof Error ? error : new Error("Não foi possível atualizar sua sessão.");
        console.error("[Auth] Falha ao atualizar a sessão Firebase:", normalizedError);
        setSessionError(normalizedError);
      } finally {
        if (mounted) {
          setFbLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
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

    if (loginPromiseRef.current) {
      return loginPromiseRef.current;
    }

    const loginPromise = (async () => {
      try {
        await setPersistence(firebaseAuth, browserLocalPersistence);

        // Se o servidor OAuth está configurado, usar o fluxo de redirect direto
        if (serverOAuthRef.current === true) {
          console.log("[Auth] Usando fluxo OAuth direto do servidor");
          const redirectUrl = `/api/auth/google?redirect=${encodeURIComponent(customRedirect)}`;
          window.location.href = redirectUrl;
          return; // A página será redirecionada
        }

        // Fallback: tentar signInWithPopup
        try {
          console.log("[Auth] Tentando signInWithPopup...");
          const result = await signInWithPopup(firebaseAuth, new (await import("firebase/auth")).GoogleAuthProvider());
          const token = await result.user.getIdToken(true);
          localStorage.setItem("firebase-token", token);

          await utils.auth.me.invalidate();
          await utils.auth.me.fetch();

          // Aguardar até que o servidor reconheça o usuário
          const maxAttempts = 15;
          let attempts = 0;
          while (attempts < maxAttempts) {
            const session = await utils.auth.me.fetch();
            if (session) {
              console.log("[Auth] Sessão confirmada pelo servidor após", attempts + 1, "tentativas");
              break;
            }
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          setLocation(customRedirect);
        } catch (popupError: any) {
          console.warn("[Auth] signInWithPopup falhou, usando signInWithRedirect:", popupError?.code);
          setSessionError(null);
          pendingRedirectRef.current = customRedirect;
          const { GoogleAuthProvider } = await import("firebase/auth");
          const provider = new GoogleAuthProvider();
          provider.addScope('profile');
          provider.addScope('email');
          provider.setCustomParameters({ prompt: 'select_account' });
          await signInWithRedirect(firebaseAuth, provider);
        }
      } catch (error: any) {
        console.error("[Auth] Falha no login:", error?.code, error?.message);
        if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
          setSessionError(null);
        } else if (error?.code === 'auth/popup-blocked') {
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

  // ===== FUNÇÃO DE LOGOUT =====
  const logout = useCallback(async () => {
    try {
      await signOut(firebaseAuth);
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
