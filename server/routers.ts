import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { storagePut } from "./storage";
import { generateSpreadsheet, type ColumnDef } from "./services/sheetGenerator";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ==================== Categories ====================
  categories: router({
    list: publicProcedure.query(async () => {
      return db.getAllCategories();
    }),
  }),

  // ==================== Templates ====================
  templates: router({
    list: publicProcedure.input(
      z.object({ categoryId: z.number().optional(), plan: z.enum(["free", "pro", "elite"]).optional() }).optional()
    ).query(async ({ input }) => {
      let templates = await db.getAllTemplates();
      if (input?.categoryId) {
        templates = templates.filter(t => t.categoryId === input.categoryId);
      }
      if (input?.plan) {
        templates = templates.filter(t => t.plan === input.plan);
      }
      return templates;
    }),

    featured: publicProcedure.query(async () => {
      return db.getFeaturedTemplates();
    }),

    byId: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const template = await db.getTemplateById(input.id);
      if (!template) throw new Error("Template not found");
      return template;
    }),
  }),

  // ==================== Plans ====================
  plans: router({
    list: publicProcedure.query(async () => {
      return db.getAllPlans();
    }),
  }),

  // ==================== Settings ====================
  settings: router({
    get: publicProcedure.input(z.object({ key: z.string() })).query(async ({ input }) => {
      return db.getSetting(input.key);
    }),
    getAll: publicProcedure.query(async () => {
      return db.getAllSettings();
    }),
  }),

  // ==================== Dashboard ====================
  dashboard: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      const user = ctx.user;
      const plan = await db.getPlanByCode(user.plan as "free" | "pro" | "elite");
      const recentSheets = await db.getGeneratedSheetsByUser(user.id);
      const templates = await db.getAllTemplates();
      const availableTemplates = templates.filter(t => {
        if (user.plan === "elite") return true;
        if (user.plan === "pro") return t.plan === "free" || t.plan === "pro";
        return t.plan === "free";
      });

      return {
        userName: user.name || user.email || "Usuário",
        plan: user.plan,
        planName: plan?.name || user.plan.toUpperCase(),
        templatesUnlocked: availableTemplates.length,
        totalTemplates: templates.length,
        themesUnlocked: plan?.maxThemes || 5,
        aiUsesLeft: user.aiUsesLeft || 0,
        maxAiUses: plan?.maxAiUses || 0,
        sheetsGenerated: user.sheetsGenerated || 0,
        unlimitedSheets: plan?.unlimitedSheets || false,
        recentSheets: recentSheets.slice(0, 10),
        totalSheets: recentSheets.length,
      };
    }),

    history: protectedProcedure.query(async ({ ctx }) => {
      return db.getGeneratedSheetsByUser(ctx.user.id);
    }),
  }),

  // ==================== Generator ====================
  generator: router({
    generate: protectedProcedure.input(z.object({
      templateId: z.number(),
      customName: z.string().min(1).max(200),
      headerColor: z.string().optional(),
      accentColor: z.string().optional(),
      extraInfo: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const user = ctx.user;

      // Check suspension
      if (user.suspended) {
        throw new Error("Conta suspensa. Entre em contato com o suporte.");
      }

      const template = await db.getTemplateById(input.templateId);
      if (!template || !template.isActive) {
        throw new Error("Modelo não encontrado ou indisponível.");
      }

      // Check plan access
      const userPlan = user.plan as "free" | "pro" | "elite";
      const templatePlan = template.plan as "free" | "pro" | "elite";
      const planOrder = { free: 0, pro: 1, elite: 2 };
      if (planOrder[userPlan] < planOrder[templatePlan]) {
        throw new Error("Seu plano não permite acesso a este modelo. Faça upgrade!");
      }

      // Check monthly limit for free plan
      const plan = await db.getPlanByCode(userPlan);
      if (plan && !plan.unlimitedSheets && user.sheetsGenerated >= 1) {
        throw new Error("Você atingiu o limite de planilhas do plano FREE. Faça upgrade para gerar mais!");
      }

      // Generate the spreadsheet
      const buffer = await generateSpreadsheet({
        templateName: template.name,
        customName: input.customName,
        columns: template.columns as ColumnDef[],
        sampleRows: template.sampleRows as unknown[][] | undefined,
        headerColor: input.headerColor || template.headerColor || "#D4AF37",
        accentColor: input.accentColor || template.accentColor || "#1A1A1A",
        hasWatermark: plan?.hasWatermark ?? true,
        extraInfo: input.extraInfo,
      });

      // Upload to S3
      const fileName = `sheets/${ctx.user.id}/${Date.now()}_${input.customName.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`;
      const { key, url } = await storagePut(fileName, buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

      // Record in database
      const record = await db.createGeneratedSheet({
        userId: ctx.user.id,
        templateId: template.id,
        templateName: template.name,
        customName: input.customName,
        fileUrl: url,
        fileKey: key,
      });

      // Increment user's sheet count
      await db.incrementSheetsGenerated(ctx.user.id);

      return {
        id: record?.id,
        fileUrl: url,
        fileName: `${input.customName}.xlsx`,
      };
    }),
  }),

  // ==================== Admin ====================
  admin: router({
    // --- Dashboard ---
    stats: adminProcedure.query(async () => {
      return db.getStats();
    }),

    // --- Users ---
    listUsers: adminProcedure.query(async () => {
      return db.getAllUsers();
    }),

    updateUserPlan: adminProcedure.input(z.object({
      userId: z.number(),
      plan: z.enum(["free", "pro", "elite"]),
    })).mutation(async ({ input }) => {
      await db.updateUserPlan(input.userId, input.plan);
      return { success: true };
    }),

    suspendUser: adminProcedure.input(z.object({
      userId: z.number(),
      suspended: z.boolean(),
    })).mutation(async ({ input }) => {
      await db.updateUserSuspended(input.userId, input.suspended);
      return { success: true };
    }),

    updateUserRole: adminProcedure.input(z.object({
      userId: z.number(),
      role: z.enum(["user", "admin"]),
    })).mutation(async ({ input }) => {
      await db.updateUserRole(input.userId, input.role);
      return { success: true };
    }),

    deleteUser: adminProcedure.input(z.object({ userId: z.number() })).mutation(async ({ input }) => {
      await db.deleteUser(input.userId);
      return { success: true };
    }),

    // --- Categories ---
    createCategory: adminProcedure.input(z.object({
      name: z.string().min(1).max(120),
      slug: z.string().min(1).max(140),
      description: z.string().optional(),
      icon: z.string().optional(),
      displayOrder: z.number().default(0),
    })).mutation(async ({ input }) => {
      return db.createCategory(input);
    }),

    updateCategory: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().min(1).max(120).optional(),
      slug: z.string().min(1).max(140).optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      displayOrder: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateCategory(id, data);
    }),

    deleteCategory: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteCategory(input.id);
      return { success: true };
    }),

    // --- Templates ---
    listAllTemplates: adminProcedure.query(async () => {
      return db.getAllTemplatesAdmin();
    }),

    createTemplate: adminProcedure.input(z.object({
      categoryId: z.number(),
      name: z.string().min(1).max(200),
      slug: z.string().min(1).max(220),
      description: z.string().optional(),
      plan: z.enum(["free", "pro", "elite"]).default("free"),
      columns: z.unknown(),
      sampleRows: z.unknown().optional(),
      headerColor: z.string().optional(),
      accentColor: z.string().optional(),
      isFeatured: z.boolean().default(false),
      isActive: z.boolean().default(true),
      displayOrder: z.number().default(0),
    })).mutation(async ({ input }) => {
      return db.createTemplate(input as any);
    }),

    updateTemplate: adminProcedure.input(z.object({
      id: z.number(),
      categoryId: z.number().optional(),
      name: z.string().min(1).max(200).optional(),
      slug: z.string().min(1).max(220).optional(),
      description: z.string().optional(),
      plan: z.enum(["free", "pro", "elite"]).optional(),
      columns: z.unknown().optional(),
      sampleRows: z.unknown().optional(),
      headerColor: z.string().optional(),
      accentColor: z.string().optional(),
      isFeatured: z.boolean().optional(),
      isActive: z.boolean().optional(),
      displayOrder: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateTemplate(id, data);
    }),

    deleteTemplate: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteTemplate(input.id);
      return { success: true };
    }),

    // --- Plans ---
    updatePlan: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      priceMonthly: z.string().optional(),
      priceYearly: z.string().optional(),
      description: z.string().optional(),
      features: z.unknown().optional(),
      maxTemplates: z.number().optional(),
      maxThemes: z.number().optional(),
      maxAiUses: z.number().optional(),
      unlimitedSheets: z.boolean().optional(),
      hasWatermark: z.boolean().optional(),
      customLogo: z.boolean().optional(),
      isActive: z.boolean().optional(),
      displayOrder: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updatePlan(id, data);
      return { success: true };
    }),

    // --- Settings ---
    upsertSetting: adminProcedure.input(z.object({
      key: z.string(),
      value: z.unknown(),
    })).mutation(async ({ input }) => {
      await db.upsertSetting(input.key, input.value);
      return { success: true };
    }),

    // --- Coupons ---
    listCoupons: adminProcedure.query(async () => {
      return db.getAllCoupons();
    }),

    createCoupon: adminProcedure.input(z.object({
      code: z.string().min(1).max(40),
      discountPercent: z.number().min(0).max(100),
      maxUses: z.number().default(0),
      expiresAt: z.string().optional(),
    })).mutation(async ({ input }) => {
      return db.createCoupon({
        code: input.code,
        discountPercent: input.discountPercent,
        maxUses: input.maxUses,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      });
    }),

    deleteCoupon: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteCoupon(input.id);
      return { success: true };
    }),

    // --- Announcements ---
    listAnnouncements: adminProcedure.query(async () => {
      return db.getAllAnnouncements();
    }),

    createAnnouncement: adminProcedure.input(z.object({
      title: z.string().min(1).max(200),
      message: z.string().min(1),
    })).mutation(async ({ ctx, input }) => {
      return db.createAnnouncement({
        title: input.title,
        message: input.message,
        createdBy: ctx.user.id,
      });
    }),
  }),
});

export type AppRouter = typeof appRouter;
