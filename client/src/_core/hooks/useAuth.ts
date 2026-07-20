import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo, useState } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
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
    redirectToDashboardOnLogin = false 
  } = options ?? {};
  
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [fbLoading, setFbLoading] = useState(true);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !fbLoading,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
      setFbLoading(false);
      if (user) {
        user.getIdToken().then((token) => {
          sessionStorage.setItem("firebase-token", token);
          utils.auth.me.invalidate();
        });
      } else {
        sessionStorage.removeItem("firebase-token");
        utils.auth.me.setData(undefined, null);
      }
    });
    return () => unsubscribe();
  }, [utils]);

  // Redirecionar para dashboard se o usuário acabar de logar e estivermos na home ou se solicitado
  useEffect(() => {
    if (redirectToDashboardOnLogin && meQuery.data && !meQuery.isLoading) {
      setLocation("/dashboard");
    }
  }, [meQuery.data, meQuery.isLoading, redirectToDashboardOnLogin, setLocation]);

  const login = useCallback(async (customRedirect?: string) => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        // Forçar redirecionamento após sucesso do popup
        if (customRedirect) {
          setLocation(customRedirect);
        } else {
          setLocation("/dashboard");
        }
      }
    } catch (error) {
      console.error("Erro ao fazer login com Google:", error);
      throw error;
    }
  }, [setLocation]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      sessionStorage.removeItem("firebase-token");
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
      setLocation("/");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      throw error;
    }
  }, [utils, setLocation]);

  const state = useMemo(() => {
    return {
      user: meQuery.data ?? null,
      loading: fbLoading || meQuery.isLoading,
      error: meQuery.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [meQuery.data, meQuery.error, meQuery.isLoading, fbLoading]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (fbLoading || meQuery.isLoading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    
    if (redirectPath) {
      if (window.location.pathname !== redirectPath) {
        setLocation(redirectPath);
      }
    } else {
      login();
    }
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    fbLoading,
    meQuery.isLoading,
    state.user,
    login,
    setLocation
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    login,
    logout,
  };
}
