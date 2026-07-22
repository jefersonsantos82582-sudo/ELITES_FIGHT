import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo, useState } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { 
  onIdTokenChanged, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  type User as FirebaseUser 
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

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !fbLoading,
  });

  // Tratar resultado de redirecionamento (comum em produção no Render)
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("[Auth] Login via redirect bem-sucedido");
          const token = await result.user.getIdToken(true);
          localStorage.setItem("firebase-token", token);
          await utils.auth.me.invalidate();
        }
      } catch (error: any) {
        console.error("[Auth] Erro no getRedirectResult:", error);
        if (error.code === 'auth/internal-error' || error.code === 'auth/network-request-failed') {
           setSessionError(new Error("Erro de conexão com Firebase. Verifique se o domínio está autorizado."));
        } else {
           setSessionError(error instanceof Error ? error : new Error("Falha ao processar login via redirecionamento."));
        }
      }
    };
    checkRedirect();
  }, [utils]);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
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

  useEffect(() => {
    if (!fbUser || meQuery.isLoading || meQuery.isFetching) return;

    if (meQuery.error) {
      setSessionError(meQuery.error instanceof Error ? meQuery.error : new Error("Não foi possível validar sua sessão."));
      return;
    }

    if (!meQuery.data && !meQuery.isLoading) {
      // Se temos user no Firebase mas não no server, pode ser delay ou erro de sync
      console.warn("[Auth] Firebase autenticado, mas servidor ainda não reconheceu o usuário.");
    }
  }, [fbUser, meQuery.data, meQuery.error, meQuery.isFetching, meQuery.isLoading]);

  useEffect(() => {
    if (redirectToDashboardOnLogin && meQuery.data && !meQuery.isLoading) {
      setLocation("/dashboard");
    }
  }, [meQuery.data, meQuery.isLoading, redirectToDashboardOnLogin, setLocation]);

  const login = useCallback(async (customRedirect = "/dashboard") => {
    setSessionError(null);

    try {
      // Tenta popup primeiro, se falhar ou estiver em ambiente restrito, usa redirect
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const token = await result.user.getIdToken(true);
        localStorage.setItem("firebase-token", token);

        await utils.auth.me.invalidate();
        const session = await utils.auth.me.fetch();

        if (!session) {
          throw new Error("Sua conta foi autenticada no Google, mas o servidor não conseguiu criar a sessão.");
        }

        await utils.dashboard.overview.invalidate();
        setLocation(customRedirect);
      } catch (popupError: any) {
        // Se o popup for bloqueado ou cancelado, tenta redirecionamento
        if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/cancelled-popup-request') {
          console.log("[Auth] Popup bloqueado/cancelado, tentando redirecionamento...");
          await signInWithRedirect(auth, googleProvider);
        } else {
          throw popupError;
        }
      }
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error("Não foi possível entrar com Google.");
      console.error("[Auth] Falha no login:", normalizedError);
      setSessionError(normalizedError);
      throw normalizedError;
    }
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

  const loading = fbLoading || (fbUser && meQuery.isLoading);
  const error = sessionError ?? (meQuery.error instanceof Error ? meQuery.error : null);
  const user = meQuery.data ?? null;

  useEffect(() => {
    if (!redirectOnUnauthenticated || fbLoading || meQuery.isLoading || user) return;

    if (redirectPath && window.location.pathname !== redirectPath) {
      setLocation(redirectPath);
    }
  }, [redirectOnUnauthenticated, redirectPath, fbLoading, meQuery.isLoading, setLocation, user]);

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
