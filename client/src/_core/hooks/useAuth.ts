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
  const [isSyncing, setIsSyncing] = useState(false);
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
          document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=3600; SameSite=Lax`;

          // Recuperar destino salvo antes do redirect
          const savedPath = sessionStorage.getItem("auth-redirect-path") || "/dashboard";
          sessionStorage.removeItem("auth-redirect-path");

          // Invalidar cache e redirecionar para loading
          await utils.auth.me.invalidate();

          if (mounted) {
            setFbUser(result.user);
            setFbLoading(false);
            setLocation("/loading");
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
            setIsSyncing(true);
            // Pegar o token imediatamente e forçar atualização
            const token = await user.getIdToken(true);
            
            // Garantir persistência imediata antes de qualquer chamada de API
            localStorage.setItem("firebase-token", token);
            // Tunnel de emergência: definir o cookie imediatamente com o token
            document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=3600; SameSite=Lax`;
            
            console.log("[Auth] Token sincronizado, disparando refetch...");

            // Invalidar e refetch imediato para garantir que o servidor veja o usuário
            await utils.auth.me.invalidate();
            await utils.auth.me.refetch();
          } else {
            localStorage.removeItem("firebase-token");
            document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            utils.auth.me.setData(undefined, null);
            utils.dashboard.overview.reset();
          }
        } catch (error) {
          console.error("[Auth] Falha ao atualizar sessão:", error);
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
      unsubscribeFn?.();
    };
  }, []); // Sem dependências — roda apenas uma vez

  // ===== REDIRECIONAR PARA DASHBOARD APÓS LOGIN =====
  useEffect(() => {
    if (redirectToDashboardOnLogin && meQuery.data && !meQuery.isLoading) {
      // Redireciona para a tela de loading que depois vai para o dashboard
      const timer = setTimeout(() => {
        setLocation("/loading");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [meQuery.data, meQuery.isLoading, redirectToDashboardOnLogin, setLocation]);

  // ===== REDIRECIONAR PARA LOGIN SE NÃO AUTENTICADO =====
  useEffect(() => {
    // Só redireciona se:
    // 1. A opção estiver ativa
    // 2. O Firebase já terminou de carregar (fbLoading === false)
    // 3. A query do usuário já terminou (isLoading === false)
    // 4. NÃO existe usuário (meQuery.data === null)
    if (
      !redirectOnUnauthenticated ||
      fbLoading ||
      meQuery.isLoading ||
      meQuery.data !== null
    ) return;

    // Se chegamos aqui, o usuário definitivamente não está logado
    if (redirectPath && window.location.pathname !== redirectPath) {
      console.log("[Auth] Redirecionando para login: não autenticado");
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
          
          // SALVAMENTO CRÍTICO: Garantir que o token esteja no navegador ANTES do redirecionamento
          localStorage.setItem("firebase-token", token);
          document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=3600; SameSite=Lax`;
          
          // Sincronizar com o servidor antes de ir para o loading
          await utils.auth.me.invalidate();
          await utils.auth.me.refetch();
          
          setLocation("/loading");
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
      document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      utils.auth.me.setData(undefined, null);
      utils.dashboard.overview.reset();
      await utils.auth.me.invalidate();
      setLocation("/");
    } catch (error) {
      console.error("[Auth] Erro no logout:", error);
    }
  }, [utils, setLocation]);

  // loading é true enquanto o Firebase inicializa ou o servidor está sincronizando
  const loading = fbLoading || isSyncing || (fbUser !== null && meQuery.isInitialLoading);
  const user = meQuery.data ?? null;

  return useMemo(() => ({
    user,
    fbUser,
    isSyncing,
    loading,
    error: sessionError,
    isAuthenticated: Boolean(user),
    login,
    logout,
  }), [user, fbUser, isSyncing, loading, sessionError, login, logout]);
}
