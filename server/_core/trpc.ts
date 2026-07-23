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
    
    // Validar chave de forma segura usando variável de ambiente
    const VALID_ADMIN_KEY = process.env.ADMIN_KEY || "admin_key_not_configured";
    const isValidKey = adminKey && adminKey === VALID_ADMIN_KEY && adminKey.length > 8;
    
    // Lista de e-mails autorizados (pode ser expandida via DB depois)
    const AUTHORIZED_ADMINS = ["jefersonsantos82582@gmail.com"];

    const isEmailAuthorized = ctx.user && AUTHORIZED_ADMINS.includes(ctx.user.email);
    const hasAccess = isEmailAuthorized || isValidKey;

    if (!hasAccess) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        // Se entrou via chave mas não tem usuário logado, injetamos um mock de admin
        user: ctx.user || { id: 0, role: "admin", name: "Admin (Chave)", email: "admin@system", openId: "admin-key-access" },
      },
    });
  }),
);
