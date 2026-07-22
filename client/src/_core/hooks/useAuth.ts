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

  // fbLoading começa true e só vira false depois que:
  // 1. getRedirectResult() terminar (pode haver redirect do Google pendente)
  // 2. onAuthStateChanged disparar pela primeira vez
  const [fbLoading, setFbLoading] = useState(true);
  const [sessionError, setSessionError] = useState<Error | null>(null);
  const loginPromiseRef = useRef<Promise<void> | null>(null);
  const authInitialized = useRef(false);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    // Só habilita a query depois que o Firebase terminou de inicializar
    enabled: !fbLoading,
  });

  // ===== INICIALIZAÇÃO: processar redirect result + listener de auth =====
  // Este efeito roda UMA vez na montagem e garante a ordem correta:
  // 1. Primeiro tenta processar o resultado de um redirect do Google
  // 2. Depois registra o listener onAuthStateChanged
  useEffect(() => {
    if (authInitialized.current) return;
    authInitialized.current = true;

    let mounted = true;

    async function initialize() {
      try {
        // Passo 1: Verificar se há resultado de redirect do Google pendente
        // Isso acontece quando o usuário volta do fluxo de autenticação mobile
        const result = await getRedirectResult(firebaseAuth);

        if (result && result.user && mounted) {
          console.log("[Auth] Retorno de redirect do Google detectado");
          const token = await result.user.getIdToken(true);
          localStorage.setItem("firebase-token", token);
          // Definir cookie para persistência robusta no servidor
          document.cookie = `firebase-token=${token}; path=/; max-age=3600; SameSite=Lax`;

          // Recuperar destino salvo antes do redirect
          const savedPath = sessionStorage.getItem("auth-redirect-path") || "/dashboard";
          sessionStorage.removeItem("auth-redirect-path");

          // Invalidar cache e redirecionar
          await utils.auth.me.invalidate();

          if (mounted) {
            setFbUser(result.user);
            setFbLoading(false);
            setLocation(savedPath);
            return; // onAuthStateChanged vai disparar logo em seguida, mas já tratamos
          }
        }
      } catch (error: any) {
        // Erros de redirect são comuns (ex: usuário cancelou) — não bloquear o fluxo
        console.warn("[Auth] getRedirectResult:", error?.code || error?.message);
      }

      if (!mounted) return;

      // Passo 2: Registrar listener principal de autenticação
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (!mounted) return;
        setFbUser(user);

        try {
          if (user) {
            const token = await user.getIdToken(true);
            localStorage.setItem("firebase-token", token);
            document.cookie = `firebase-token=${token}; path=/; max-age=3600; SameSite=Lax`;
            await utils.auth.me.invalidate();
          } else {
            localStorage.removeItem("firebase-token");
            document.cookie = "firebase-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            utils.auth.me.setData(undefined, null);
            utils.dashboard.overview.reset();
          }
        } catch (error) {
          console.error("[Auth] Falha ao atualizar sessão:", error);
        } finally {
          if (mounted) setFbLoading(false);
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
      unsubscribeFn?.();
    };
  }, []); // Sem dependências — roda apenas uma vez

  // ===== REDIRECIONAR PARA DASHBOARD APÓS LOGIN =====
  useEffect(() => {
    if (redirectToDashboardOnLogin && meQuery.data && !meQuery.isLoading) {
      setLocation("/dashboard");
    }
  }, [meQuery.data, meQuery.isLoading, redirectToDashboardOnLogin, setLocation]);

  // ===== REDIRECIONAR PARA LOGIN SE NÃO AUTENTICADO =====
  useEffect(() => {
    if (
      !redirectOnUnauthenticated ||
      fbLoading ||
      meQuery.isLoading ||
      (meQuery.data !== null && meQuery.data !== undefined)
    ) return;
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
        provider.addScope("profile");
        provider.addScope("email");
        provider.setCustomParameters({ prompt: "select_account" });

        // Tentar popup (funciona em desktop e alguns browsers mobile)
        try {
          const result = await signInWithPopup(firebaseAuth, provider);
          const token = await result.user.getIdToken(true);
          localStorage.setItem("firebase-token", token);
          document.cookie = `firebase-token=${token}; path=/; max-age=3600; SameSite=Lax`;
          await utils.auth.me.invalidate();
          setLocation(customRedirect);
        } catch (popupError: any) {
          // Popup bloqueado (muito comum em mobile) → usar redirect
          // Salvar o destino para recuperar após o retorno do Google
          console.warn("[Auth] Popup bloqueado, usando redirect:", popupError?.code);
          sessionStorage.setItem("auth-redirect-path", customRedirect);
          await signInWithRedirect(firebaseAuth, provider);
          // A execução para aqui — a página vai recarregar após o redirect
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
      document.cookie = "firebase-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      utils.auth.me.setData(undefined, null);
      utils.dashboard.overview.reset();
      await utils.auth.me.invalidate();
      setLocation("/");
    } catch (error) {
      console.error("[Auth] Erro no logout:", error);
    }
  }, [utils, setLocation]);

  // loading é true enquanto o Firebase não inicializou OU enquanto o tRPC está buscando o usuário
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
