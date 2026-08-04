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
import { COOKIE_NAME } from "@shared/const";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
  redirectToDashboardOnLogin?: boolean;
};

// TIMEOUT: Se o Firebase não responder em 8 segundos, forçar avanço
const FIREBASE_TIMEOUT_MS = 8000;

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [sessionError, setSessionError] = useState<Error | null>(null);
  const loginPromiseRef = useRef<Promise<void> | null>(null);
  const authInitialized = useRef(false);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !fbLoading,
    staleTime: 30000, // cache válido por 30s
  });

  // ===== INICIALIZAÇÃO COM TIMEOUT =====
  useEffect(() => {
    if (authInitialized.current) return;
    authInitialized.current = true;

    let mounted = true;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    async function initialize() {
      // TIMEOUT DE SEGURANÇA: Se Firebase não responder em 8s, forçar avanço
      timeoutHandle = setTimeout(() => {
        if (mounted) {
          console.warn("[Auth] Timeout do Firebase — avançando sem sessão Firebase");
          setFbLoading(false);
        }
      }, FIREBASE_TIMEOUT_MS);

      try {
        // Passo 1: Verificar resultado de redirect do Google
        const result = await getRedirectResult(firebaseAuth);

        if (result && result.user && mounted) {
          console.log("[Auth] Retorno de redirect do Google detectado");
          const token = await result.user.getIdToken(true);
          localStorage.setItem("firebase-token", token);
          document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=2592000; SameSite=Lax`;

          const savedPath = sessionStorage.getItem("auth-redirect-path") || "/dashboard";
          sessionStorage.removeItem("auth-redirect-path");

          await utils.auth.me.invalidate();

          if (mounted) {
            setFbUser(result.user);
            setFbLoading(false);
            setLocation("/loading");
            return;
          }
        }
      } catch (error: any) {
        console.warn("[Auth] getRedirectResult:", error?.code || error?.message);
      }

      if (!mounted) return;

      // Passo 2: Registrar listener de auth
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (!mounted) return;
        setFbUser(user);

        // Cancelar timeout pois Firebase respondeu
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }

        try {
          if (user) {
            setIsSyncing(true);
            // Timeout no getIdToken para não travar
            const token = await Promise.race([
              user.getIdToken(),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Timeout getIdToken")), 5000)
              ),
            ]);

            localStorage.setItem("firebase-token", token);
            document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=2592000; SameSite=Lax`;

            await utils.auth.me.refetch();
          } else {
            localStorage.removeItem("firebase-token");
            document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            utils.auth.me.setData(undefined, null);
            utils.dashboard.overview.reset();
          }
        } catch (error) {
          console.error("[Auth] Falha ao atualizar sessão:", error);
          // Mesmo com erro, não bloquear — avançar
        } finally {
          if (mounted) {
            setFbLoading(false);
            setIsSyncing(false);
          }
        }
      });

      return unsubscribe;
    }

    let unsubscribeFn: (() => void) | undefined;

    initialize().then((unsub) => {
      unsubscribeFn = unsub;
    });

    return () => {
      mounted = false;
      if (timeoutHandle) clearTimeout(timeoutHandle);
      unsubscribeFn?.();
    };
  }, []);

  // ===== REDIRECIONAR PARA DASHBOARD APÓS LOGIN =====
  useEffect(() => {
    if (redirectToDashboardOnLogin && meQuery.data && !meQuery.isLoading) {
      const timer = setTimeout(() => {
        if (window.location.pathname === "/" || window.location.pathname === "/login") {
          setLocation("/dashboard");
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [meQuery.data, meQuery.isLoading, redirectToDashboardOnLogin, setLocation]);

  // ===== REDIRECIONAR PARA LOGIN SE NÃO AUTENTICADO =====
  useEffect(() => {
    if (
      !redirectOnUnauthenticated ||
      fbLoading ||
      meQuery.isLoading ||
      meQuery.data !== null ||
      isSyncing
    ) return;

    if (redirectPath && window.location.pathname !== redirectPath) {
      console.log("[Auth] Redirecionando para login: não autenticado");
      setLocation(redirectPath);
    }
  }, [redirectOnUnauthenticated, redirectPath, fbLoading, meQuery.isLoading, setLocation, meQuery.data]);

  // ===== FUNÇÃO DE LOGIN COM TIMEOUT =====
  const login = useCallback(async (customRedirect = "/dashboard") => {
    setSessionError(null);
    if (loginPromiseRef.current) return loginPromiseRef.current;

    const loginPromise = (async () => {
      try {
        await setPersistence(firebaseAuth, browserLocalPersistence);

        const provider = new GoogleAuthProvider();
        provider.addScope("profile");
        provider.addScope("email");
        provider.setCustomParameters({ prompt: "select_account" });

        try {
          const result = await signInWithPopup(firebaseAuth, provider);
          const token = await result.user.getIdToken(true);

          localStorage.setItem("firebase-token", token);
          document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=2592000; SameSite=Lax`;

          await utils.auth.me.invalidate();
          await utils.auth.me.refetch();

          setLocation("/loading");
        } catch (popupError: any) {
          console.warn("[Auth] Popup bloqueado, usando redirect:", popupError?.code);
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

  // ===== LOGOUT =====
  const logout = useCallback(async () => {
    try {
      await signOut(firebaseAuth);
      localStorage.removeItem("firebase-token");
      document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      utils.auth.me.setData(undefined, null);
      utils.dashboard.overview.reset();
      await utils.auth.me.invalidate();
      setLocation("/");
    } catch (error) {
      console.error("[Auth] Erro no logout:", error);
    }
  }, [utils, setLocation]);

  // loading: Firebase carregando OU sincronizando com servidor
  const loading = fbLoading || (isSyncing && meQuery.isLoading);
  const user = meQuery.data ?? null;
  const syncFailed = Boolean(fbUser) && !user && !isSyncing && !meQuery.isLoading && meQuery.isError;

  return useMemo(() => ({
    user,
    fbUser,
    isSyncing,
    syncFailed,
    loading,
    error: sessionError || ((meQuery.error as unknown) as Error | null),
    isAuthenticated: Boolean(user),
    login,
    logout,
    refetchUser: () => meQuery.refetch(),
  }), [user, fbUser, isSyncing, syncFailed, loading, sessionError, meQuery.error, meQuery.isError, login, logout]);
}
