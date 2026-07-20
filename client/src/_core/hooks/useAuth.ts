import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo, useState } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { onIdTokenChanged, signInWithPopup, signOut, type User as FirebaseUser } from "firebase/auth";
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

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      setFbUser(user);
      setSessionError(null);

      try {
        if (user) {
          const token = await user.getIdToken(true);
          sessionStorage.setItem("firebase-token", token);
          await utils.auth.me.invalidate();
        } else {
          sessionStorage.removeItem("firebase-token");
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

    if (!meQuery.data) {
      setSessionError(new Error("O login foi concluído, mas a sessão não foi reconhecida pelo servidor. Tente novamente."));
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
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken(true);
      sessionStorage.setItem("firebase-token", token);

      await utils.auth.me.invalidate();
      const session = await utils.auth.me.fetch();

      if (!session) {
        throw new Error("Sua conta foi autenticada no Google, mas o servidor não conseguiu criar a sessão.");
      }

      await utils.dashboard.overview.invalidate();
      setLocation(customRedirect);
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
      sessionStorage.removeItem("firebase-token");
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

  const loading = fbLoading || (!fbLoading && meQuery.isLoading);
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
