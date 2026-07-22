import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";
import { auth } from "@/lib/firebase";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Não repetir se for erro de autenticação
        if (error?.message === UNAUTHED_ERR_MSG) return false;
        return failureCount < 3;
      },
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;
  
  // REMOVIDO: Limpeza agressiva do token.
  // Deixamos o useAuth gerenciar o estado do usuário com base no Firebase e na resposta real do servidor.
  console.warn("Usuário não autorizado pelo servidor.");
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; 
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL; 
  return `http://localhost:${process.env.PORT ?? 3000}`; 
};

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      async headers() {
        try {
          // 1. Tentar pegar o token diretamente do Firebase (mais seguro)
          const user = auth.currentUser;
          if (user) {
            const token = await user.getIdToken();
            return { Authorization: `Bearer ${token}` };
          }
          
          // 2. Fallback para o token no localStorage (persistência entre reloads)
          const fbToken = localStorage.getItem("firebase-token");
          if (fbToken) {
            return { Authorization: `Bearer ${fbToken}` };
          }
        } catch (err) {
          console.error("Erro ao obter token do Firebase para o header:", err);
        }
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
