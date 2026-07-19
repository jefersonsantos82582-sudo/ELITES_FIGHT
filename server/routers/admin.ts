/**
 * Rotas TRPC para Administração
 * Gerencia: Usuários, Pagamentos, Planos, Modelos
 */

import { adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const adminRouter = router({
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

    // Calcular receita mensal (simulado)
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
   * Listar todos os pagamentos
   */
  listPayments: adminProcedure.query(async () => {
    // Aqui você pode buscar pagamentos do banco de dados
    // Por enquanto, retornando um array vazio
    return [];
  }),

  /**
   * Listar todos os usuários
   */
  listAllUsers: adminProcedure.query(async () => {
    return db.getAllUsers();
  }),

  /**
   * Listar todos os modelos
   */
  listAllTemplates: adminProcedure.query(async () => {
    return db.getAllTemplates();
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
        description: input.description || undefined,
        plan: input.plan,
        columns: input.columns,
        headerColor: input.headerColor || "#D4AF37",
        accentColor: input.accentColor || "#1A1A1A",
        isActive: true,
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
        description: z.string().optional(),
        plan: z.enum(["free", "pro", "elite"]).optional(),
        headerColor: z.string().optional(),
        accentColor: z.string().optional(),
        isActive: z.boolean().optional(),
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
   * Atualizar plano
   */
  updatePlan: adminProcedure
    .input(
      z.object({
        id: z.number(),
        priceMonthly: z.string().optional(),
        priceYearly: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updatePlan(id, data);
    }),

  /**
   * Atualizar plano de usuário
   */
  updateUserPlan: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        plan: z.enum(["free", "pro", "elite"]),
      })
    )
    .mutation(async ({ input }) => {
      return db.updateUserPlan(input.userId, input.plan);
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
