/**
 * Rotas TRPC para Administração
 * Gerencia: Usuários, Pagamentos, Planos, Modelos, Sorteio
 */

import { adminProcedure, ADMIN_MASTER_KEY, router } from "../_core/trpc";
import { publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { getSessionCookieOptions } from "../_core/cookies";

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

export const adminRouter = router({
  /**
   * Login no painel administrativo (email + senha de acesso)
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const email = input.email.toLowerCase().trim();
      const admins = await db.getAdminEmails();

      const isPasswordValid = input.password === ADMIN_MASTER_KEY;
      const isEmailAuthorized = admins.includes(email);

      if (!isPasswordValid || !isEmailAuthorized) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "E-mail ou senha de acesso inválidos.",
        });
      }

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie("admin_key", input.password, { ...cookieOptions, maxAge: ONE_DAY_MS });
      ctx.res.cookie("admin_email", email, { ...cookieOptions, maxAge: ONE_DAY_MS });

      return { success: true } as const;
    }),

  /**
   * Logout do painel administrativo
   */
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie("admin_key", { ...cookieOptions, maxAge: -1 });
    ctx.res.clearCookie("admin_email", { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),

  /**
   * Listar e-mails com acesso ao painel administrativo
   */
  listAdmins: adminProcedure.query(async () => {
    return db.getAdminEmails();
  }),

  /**
   * Adicionar um novo e-mail administrador
   */
  addAdmin: adminProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      return db.addAdminEmail(input.email);
    }),

  /**
   * Remover um e-mail administrador
   */
  removeAdmin: adminProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const requesterEmail = (ctx.user?.email || "").toLowerCase();
      const target = input.email.toLowerCase().trim();
      if (requesterEmail && requesterEmail === target) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Você não pode remover seu próprio acesso de administrador.",
        });
      }
      return db.removeAdminEmail(input.email);
    }),

  /**
   * Obter estatísticas gerais
   */
  stats: adminProcedure.query(async () => {
    const users = await db.getAllUsers();
    const sheets = await db.getAllGeneratedSheets();

    const planCounts = {
      free: users.filter(u => u.plan === "free").length,
      pro: users.filter(u => u.plan === "pro").length,
      elite: users.filter(u => u.plan === "elite").length,
    };

    const monthlyRevenue = planCounts.pro * 14.99 + planCounts.elite * 24.99;

    return {
      totalUsers: users.length,
      totalSheets: sheets.length,
      totalTemplates: (await db.getAllTemplates()).length,
      planCounts,
      monthlyRevenue,
    };
  }),

  /**
   * Listar todos os usuários
   */
  listAllUsers: adminProcedure.query(async () => {
    return db.getAllUsers();
  }),

  /**
   * Obter detalhes de um usuário específico
   */
  getUserById: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return db.getUserById(input.userId);
    }),

  /**
   * Listar todos os modelos
   */
  listAllTemplates: adminProcedure.query(async () => {
    return db.getAllTemplatesAdmin();
  }),

  /**
   * Criar novo modelo
   */
  createTemplate: adminProcedure
    .input(
      z.object({
        categoryId: z.number(),
        name: z.string().min(1).max(200),
        slug: z.string().min(1).max(220),
        description: z.string().optional(),
        plan: z.enum(["free", "pro", "elite"]).default("free"),
        columns: z.any(),
        headerColor: z.string().optional(),
        accentColor: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.createTemplate({
        categoryId: input.categoryId,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        plan: input.plan,
        columns: input.columns,
        sampleRows: [],
        headerColor: input.headerColor || "#D4AF37",
        accentColor: input.accentColor || "#1A1A1A",
        isActive: true,
        displayOrder: 0,
        isFeatured: false,
      });
    }),

  /**
   * Atualizar modelo
   */
  updateTemplate: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        slug: z.string().optional(),
        categoryId: z.number().optional(),
        description: z.string().optional(),
        plan: z.enum(["free", "pro", "elite"]).optional(),
        columns: z.any().optional(),
        headerColor: z.string().optional(),
        accentColor: z.string().optional(),
        isActive: z.boolean().optional(),
        isFeatured: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateTemplate(id, data);
    }),

  /**
   * Deletar modelo
   */
  deleteTemplate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return db.deleteTemplate(input.id);
    }),

  /**
   * Criar nova categoria
   */
  createCategory: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
        icon: z.string().optional(),
        displayOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      return db.createCategory({
        name: input.name,
        slug: input.slug,
        displayOrder: input.displayOrder,
        description: input.description ?? null,
        icon: input.icon ?? null,
      });
    }),

  /**
   * Atualizar categoria
   */
  updateCategory: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        icon: z.string().nullable().optional(),
        displayOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateCategory(id, data);
    }),

  /**
   * Deletar categoria
   */
  deleteCategory: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return db.deleteCategory(input.id);
    }),

  /**
   * Listar todas as categorias (admin)
   */
  listAllCategories: adminProcedure.query(async () => {
    return db.getAllCategories();
  }),

  /**
   * Atualizar plano de preços
   */
  updatePlan: adminProcedure
    .input(
      z.object({
        id: z.number(),
        code: z.enum(["free", "pro", "elite"]),
        priceMonthly: z.string().optional(),
        priceYearly: z.string().optional(),
        description: z.string().optional(),
        maxTemplates: z.number().optional(),
        maxThemes: z.number().optional(),
        maxAiUses: z.number().optional(),
        features: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, code, ...data } = input;
      return db.updatePlan(code, data);
    }),

  /**
   * Atualizar plano de usuário (upgrade/downgrade manual)
   */
  updateUserPlan: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        plan: z.enum(["free", "pro", "elite"]),
        days: z.number().optional().default(30),
      })
    )
    .mutation(async ({ input }) => {
      let expiresAt: Date | undefined;
      if (input.plan !== "free" && input.days > 0) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + input.days);
      }
      return db.updateUserPlan(input.userId, input.plan, expiresAt);
    }),

  /**
   * Suspender/Desuspender usuário
   */
  toggleUserSuspension: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        suspended: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      return db.updateUserSuspended(input.userId, input.suspended);
    }),

  /**
   * Atualizar permissão do usuário
   */
  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["user", "admin"]),
      })
    )
    .mutation(async ({ input }) => {
      return db.updateUserRole(input.userId, input.role);
    }),

  /**
   * Deletar usuário
   */
  deleteUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      return db.deleteUser(input.userId);
    }),

  /**
   * Obter configurações do site
   */
  getSettings: adminProcedure.query(async () => {
    return db.getAllSettings();
  }),

  /**
   * Atualizar configuração
   */
  updateSetting: adminProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.any(),
      })
    )
    .mutation(async ({ input }) => {
      return db.upsertSetting(input.key, input.value);
    }),
});
