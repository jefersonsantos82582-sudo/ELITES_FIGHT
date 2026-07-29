import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import * as db from "../db";

// Master admin password. Can be overridden via the ADMIN_KEY env var.
export const ADMIN_MASTER_KEY = process.env.ADMIN_KEY || "A2M8O9J3@";

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

    // Verificar chave e e-mail de acesso via Header ou Cookie
    const adminKeyFromHeader = ctx.req.headers["x-admin-key"];
    const adminKeyFromCookie = ctx.req.cookies["admin_key"];
    const adminKey = (adminKeyFromHeader || adminKeyFromCookie) as string | undefined;

    const adminEmailFromHeader = ctx.req.headers["x-admin-email"];
    const adminEmailFromCookie = ctx.req.cookies["admin_email"];
    const adminEmailRaw = (adminEmailFromHeader || adminEmailFromCookie) as string | undefined;
    const adminEmail = adminEmailRaw?.toLowerCase().trim();

    // Lista dinâmica de e-mails autorizados (gerenciável pelo próprio painel)
    const AUTHORIZED_ADMINS = await db.getAdminEmails();

    // Validar chave + e-mail autorizado (login via /admin)
    const isValidKey = !!adminKey && adminKey === ADMIN_MASTER_KEY;
    const isKeyEmailAuthorized = !!adminEmail && AUTHORIZED_ADMINS.includes(adminEmail);
    const hasValidKeyAccess = isValidKey && isKeyEmailAuthorized;

    // Verificar se o usuário logado (sessão normal) tem role admin no banco
    const isRoleAdmin = ctx.user && ctx.user.role === "admin";

    // Verificar email autorizado (usuário logado normalmente)
    const isEmailAuthorized = ctx.user && AUTHORIZED_ADMINS.includes((ctx.user.email || "").toLowerCase());

    const hasAccess = isRoleAdmin || isEmailAuthorized || hasValidKeyAccess;

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
          email: adminEmail || "admin@system",
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
