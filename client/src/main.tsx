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
        if (error?.message === UNAUTHED_ERR_MSG) return false;
        return failureCount < 3;
      },
      gcTime: 30 * 60 * 1000, // Manter em cache por 30 min
      staleTime: 5 * 60 * 1000, // Considerar dados "frescos" por 5 min (evita loading ao trocar abas)
    },
    mutations: {
      retry: false, // mutações não repetem automaticamente
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;
  console.warn("Usuário não autorizado pelo servidor.");
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error?.message);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error?.message);
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
          const user = auth.currentUser;
          if (user) {
            // Forçar renovação do token (true) para evitar expiração
            const token = await Promise.race([
              user.getIdToken(true),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Token timeout")), 8000)
              ),
            ]);
            localStorage.setItem("firebase-token", token);
            document.cookie = `app_session_id=${token}; path=/; max-age=2592000; SameSite=Lax`;
            return { Authorization: `Bearer ${token}` };
          }

          const fbToken = localStorage.getItem("firebase-token");
          if (fbToken) {
            return { Authorization: `Bearer ${fbToken}` };
          }
        } catch (err) {
          console.error("[Auth] Erro ao obter token:", err);
          localStorage.removeItem("firebase-token");
        }
        return {};
      },
      fetch(input, init) {
        // TIMEOUT GLOBAL: requests não podem travar mais de 30s
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
          signal: controller.signal,
        }).finally(() => clearTimeout(timeout));
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
