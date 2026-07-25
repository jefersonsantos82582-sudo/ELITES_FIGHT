import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    console.error("[Auth] Acesso negado: usuário não autenticado");
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    // Verificar chave de acesso via Header ou Cookie
    const adminKeyFromHeader = ctx.req.headers["x-admin-key"];
    const adminKeyFromCookie = ctx.req.cookies["admin_key"];
    const adminKey = adminKeyFromHeader || adminKeyFromCookie;

    // Validar chave usando variável de ambiente
    const VALID_ADMIN_KEY = process.env.ADMIN_KEY;
    const isValidKey = VALID_ADMIN_KEY && adminKey && adminKey === VALID_ADMIN_KEY;

    // Lista de e-mails autorizados
    const AUTHORIZED_ADMINS = ["jefersonsantos82582@gmail.com"];

    // Verificar se o usuário tem role admin no banco
    const isRoleAdmin = ctx.user && ctx.user.role === "admin";

    // Verificar email autorizado
    const isEmailAuthorized = ctx.user && AUTHORIZED_ADMINS.includes(ctx.user.email || "");

    const hasAccess = isRoleAdmin || isEmailAuthorized || isValidKey;

    if (!hasAccess) {
      console.error("[Admin] Acesso negado. Não autorizado.");
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        // Se entrou via chave mas não tem usuário logado, injetamos um mock de admin
        user: ctx.user || {
          id: 999999,
          role: "admin",
          name: "Admin (Chave)",
          email: "admin@system",
          openId: "admin-key-access",
          plan: "free",
          suspended: false,
          sheetsGenerated: 0,
          aiUsesLeft: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        },
      },
    });
  }),
);
