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
    refetchOnWindowFocus: true, // Aumentar a chance de pegar o estado atualizado
    enabled: !fbLoading,
  });

  useEffect(() => {
    console.log("[Auth] Monitorando estado do Firebase...");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("[Auth] Firebase state changed:", user?.email || "No user");
      setFbUser(user);
      
      if (user) {
        try {
          const token = await user.getIdToken(true); // Forçar refresh do token
          console.log("[Auth] Token obtido com sucesso");
          sessionStorage.setItem("firebase-token", token);
          // Invalidação forçada para garantir que o backend tente autenticar com o novo token
          await utils.auth.me.invalidate();
        } catch (err) {
          console.error("[Auth] Erro ao obter token:", err);
        }
      } else {
        sessionStorage.removeItem("firebase-token");
        utils.auth.me.setData(undefined, null);
      }
      setFbLoading(false);
    });
    return () => unsubscribe();
  }, [utils]);

  useEffect(() => {
    if (redirectToDashboardOnLogin && meQuery.data && !meQuery.isLoading) {
      console.log("[Auth] Redirecionando para dashboard após login detectado");
      setLocation("/dashboard");
    }
  }, [meQuery.data, meQuery.isLoading, redirectToDashboardOnLogin, setLocation]);

  const login = useCallback(async (customRedirect?: string) => {
    console.log("[Auth] Iniciando login via popup...");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("[Auth] Login Firebase bem-sucedido:", result.user.email);
      
      const token = await result.user.getIdToken(true);
      sessionStorage.setItem("firebase-token", token);
      
      // Forçar atualização do tRPC antes do redirecionamento
      await utils.auth.me.refetch();
      
      if (customRedirect) {
        setLocation(customRedirect);
      } else {
        setLocation("/dashboard");
      }
    } catch (error) {
      console.error("[Auth] Erro ao fazer login com Google:", error);
      throw error;
    }
  }, [setLocation, utils]);

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
    
    console.log("[Auth] Usuário não autenticado, verificando redirecionamento...");
    if (redirectPath) {
      if (window.location.pathname !== redirectPath) {
        setLocation(redirectPath);
      }
    }
    // Removido o login automático para evitar loops na tela de bloqueio
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    fbLoading,
    meQuery.isLoading,
    state.user,
    setLocation
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    login,
    logout,
  };
}
