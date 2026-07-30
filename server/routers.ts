import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { storagePut } from "./storage";
import { generateSpreadsheet, stripDescriptionColumn, type ColumnDef } from "./services/sheetGenerator";
import { generateSheetWithAI } from "./services/aiSheetGenerator";
import * as db from "./db";
import { paymentRouter } from "./routers/payment";
import { adminRouter } from "./routers/admin";

export const appRouter = router({
  system: systemRouter,
  payment: paymentRouter,
  admin: adminRouter,

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
      z.object({ categoryId: z.number().optional(), plan: z.string().optional() }).optional()
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
      const plan = await db.getPlanByCode(user.plan as string);
      const recentSheets = await db.getGeneratedSheetsByUser(user.id);
      const templates = await db.getAllTemplates();
      const allPlans = await db.getAllPlans();
      const userPlanDisplayOrder = plan?.displayOrder ?? 0;
      const availableTemplates = templates
        .filter((template) => {
          const tplPlan = allPlans.find(p => p.code === (template.plan as string));
          return userPlanDisplayOrder >= (tplPlan?.displayOrder ?? 0);
        })
        .slice(0, plan?.maxTemplates ?? 0);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const sheetsGeneratedThisMonth = await db.countGeneratedSheetsSince(user.id, startOfMonth);

      return {
        userId: user.id,
        userName: user.name || user.email || "Usuário",
        userEmail: user.email || "-",
        userPhotoUrl: user.photoUrl || null,
        plan: user.plan,
        planName: plan?.name || user.plan.toUpperCase(),
        planDescription: plan?.description || "",
        planExpiresAt: user.planExpiresAt || null,
        planFeatures: (plan?.features as string[]) || [],
        templatesUnlocked: availableTemplates.length,
        totalTemplates: templates.length,
        themesUnlocked: plan?.maxThemes ?? 0,
        aiUsesLeft: user.aiUsesLeft ?? 0,
        maxAiUses: plan?.maxAiUses ?? 0,
        customLogo: plan?.customLogo ?? false,
        hasWatermark: plan?.hasWatermark ?? true,
        sheetsGenerated: recentSheets.length,
        sheetsGeneratedThisMonth,
        maxSheetsPerMonth: plan?.maxSheetsPerMonth ?? 1,
        unlimitedSheets: plan?.unlimitedSheets ?? false,
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
    generateWithAI: protectedProcedure.input(z.object({
      modelType: z.enum(["bebidas", "produtos", "clientes"]),
      description: z.string().min(1).max(500),
      customName: z.string().min(1).max(200),
      headerColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor de cabecalho invalida").optional(),
      accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor de destaque invalida").optional(),
    })).mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (user.suspended) {
        throw new Error("Conta suspensa. Entre em contato com o suporte.");
      }
      const userPlan = user.plan as string;
      const plan = await db.getPlanByCode(userPlan);
      if (!plan) {
        throw new Error("Nao foi possivel localizar as permissoes do seu plano.");
      }
      if (plan.maxAiUses === 0) {
        throw new Error("Seu plano nao inclui acesso a geracoes com IA. Faca upgrade para um plano superior!");
      }
      if (plan.maxAiUses > 0 && user.aiUsesLeft <= 0) {
        throw new Error("Voce atingiu o limite de geracoes com IA do seu plano. Faca upgrade ou aguarde o proximo mes!");
      }
      const aiResult = await generateSheetWithAI({
        modelType: input.modelType,
        description: input.description,
        customName: input.customName,
      });
      const buffer = await generateSpreadsheet({
        templateName: `${input.modelType.charAt(0).toUpperCase() + input.modelType.slice(1)} (IA)`,
        customName: input.customName,
        columns: aiResult.columns as ColumnDef[],
        sampleRows: aiResult.sampleRows,
        headerColor: input.headerColor || "#D4AF37",
        accentColor: input.accentColor || "#1A1A1A",
        hasWatermark: plan?.hasWatermark ?? true,
      });
      const fileName = `sheets/${ctx.user.id}/${Date.now()}_${input.customName.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`;
      const { key, url } = await storagePut(fileName, buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      const record = await db.createGeneratedSheet({
        userId: ctx.user.id,
        templateId: 0,
        templateName: `${input.modelType} (IA)`,
        customName: input.customName,
        fileUrl: url,
        fileKey: key,
      });
      if (plan.maxAiUses > 0) {
        await db.updateUserAIUses(ctx.user.id, user.aiUsesLeft - 1);
      }
      await db.incrementSheetsGenerated(ctx.user.id);
      return {
        id: record?.id,
        fileUrl: url,
        fileName: `${input.customName}.xlsx`,
      };
    }),

    generate: protectedProcedure.input(z.object({
      templateId: z.number(),
      customName: z.string().min(1).max(200),
      headerColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor de cabeçalho inválida").optional(),
      accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor de destaque inválida").optional(),
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

      // Check plan access and the configured catalog allowance.
      const userPlan = user.plan as string;
      const templatePlan = template.plan as string;
      const userPlanInfo = await db.getPlanByCode(userPlan);
      const templatePlanInfo = await db.getPlanByCode(templatePlan);
      if ((userPlanInfo?.displayOrder ?? 0) < (templatePlanInfo?.displayOrder ?? 0)) {
        throw new Error("Seu plano não permite acesso a este modelo. Faça upgrade!");
      }

      const plan = await db.getPlanByCode(userPlan);
      if (!plan) {
        throw new Error("Não foi possível localizar as permissões do seu plano.");
      }

      const allTemplates = await db.getAllTemplates();
      const allPlans = await db.getAllPlans();
      const planMap = new Map(allPlans.map(p => [p.code, p]));
      
      const allowedTemplates = allTemplates
        .filter((item) => {
          const itemPlanInfo = planMap.get(item.plan as string);
          return (userPlanInfo?.displayOrder ?? 0) >= (itemPlanInfo?.displayOrder ?? 0);
        })
        .slice(0, plan.maxTemplates);
      if (!allowedTemplates.some((item) => item.id === template.id)) {
        throw new Error("Este modelo não está incluído no limite atual do seu plano. Faça upgrade para liberá-lo.");
      }

      // Free-plan allowance resets at the start of each calendar month.
      if (!plan.unlimitedSheets) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const generatedThisMonth = await db.countGeneratedSheetsSince(user.id, startOfMonth);
        const monthlyLimit = plan.maxSheetsPerMonth ?? 1;
        if (generatedThisMonth >= monthlyLimit) {
          throw new Error("Você atingiu o limite mensal de planilhas do seu plano. Faça upgrade para gerar mais!");
        }
      }

      // Geração normal (não-IA): remove qualquer coluna de "Descrição" do
      // modelo, já que esse fluxo usa estrutura fixa e não deve trazer campo
      // de descrição livre — diferente do gerador com IA.
      const { columns: normalColumns, sampleRows: normalSampleRows } = stripDescriptionColumn(
        template.columns as ColumnDef[],
        template.sampleRows as unknown[][] | undefined
      );

      // Generate the spreadsheet
      const buffer = await generateSpreadsheet({
        templateName: template.name,
        customName: input.customName,
        columns: normalColumns,
        sampleRows: normalSampleRows,
        headerColor: input.headerColor || template.headerColor || "#D4AF37",
        accentColor: input.accentColor || template.accentColor || "#1A1A1A",
        hasWatermark: plan?.hasWatermark ?? true,
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


});

export type AppRouter = typeof appRouter;
