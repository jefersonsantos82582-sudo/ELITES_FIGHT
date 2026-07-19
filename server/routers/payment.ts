/**
 * Rotas TRPC para gerenciamento de pagamentos com Mercado Pago
 */

import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import MercadoPagoService from "../services/mercadoPago";
import * as db from "../db";

// Inicializar serviço Mercado Pago
const mercadoPagoAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const mercadoPagoService = mercadoPagoAccessToken
  ? new MercadoPagoService({ accessToken: mercadoPagoAccessToken })
  : null;

export const paymentRouter = router({
  /**
   * Criar preferência de pagamento para upgrade de plano
   */
  createUpgradePreference: protectedProcedure
    .input(
      z.object({
        planCode: z.enum(["pro", "elite"]),
        successUrl: z.string().url(),
        failureUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!mercadoPagoService) {
        throw new Error("Mercado Pago não está configurado");
      }

      const user = ctx.user;
      const plan = await db.getPlanByCode(input.planCode);

      if (!plan) {
        throw new Error("Plano não encontrado");
      }

      const planPrice = parseFloat(plan.priceMonthly || "0");

      if (planPrice <= 0) {
        throw new Error("Plano inválido ou sem preço");
      }

      try {
        const preference = await mercadoPagoService.createPlanUpgradePreference(
          user.id,
          user.email || "usuario@example.com",
          input.planCode,
          planPrice,
          plan.name,
          input.successUrl,
          input.failureUrl
        );

        return {
          preferenceId: preference.id,
          initPoint: preference.init_point || preference.sandbox_init_point,
          sandboxInitPoint: preference.sandbox_init_point,
        };
      } catch (error) {
        console.error("Erro ao criar preferência de pagamento:", error);
        throw new Error("Falha ao criar preferência de pagamento");
      }
    }),

  /**
   * Webhook para receber notificações de pagamento
   */
  webhook: publicProcedure
    .input(z.any())
    .mutation(async ({ input }) => {
      if (!mercadoPagoService) {
        return { success: false, message: "Mercado Pago não está configurado" };
      }

      try {
        const processed = await mercadoPagoService.processWebhookNotification(input);

        if (processed) {
          // Aqui você pode processar o pagamento e atualizar o plano do usuário
          // Exemplo:
          // const userId = extrairUserIdDaNotificacao(input);
          // const planCode = extrairPlanCodeDaNotificacao(input);
          // await db.updateUserPlan(userId, planCode);
        }

        return { success: true };
      } catch (error) {
        console.error("Erro ao processar webhook de pagamento:", error);
        return { success: false, message: "Erro ao processar webhook" };
      }
    }),

  /**
   * Obter informações do plano
   */
  getPlanInfo: publicProcedure
    .input(z.object({ planCode: z.enum(["free", "pro", "elite"]) }))
    .query(async ({ input }) => {
      const plan = await db.getPlanByCode(input.planCode);
      if (!plan) {
        throw new Error("Plano não encontrado");
      }

      return {
        code: plan.code,
        name: plan.name,
        price: plan.priceMonthly,
        description: plan.description,
        features: plan.features,
      };
    }),

  /**
   * Listar todos os planos com preços
   */
  listPlans: publicProcedure.query(async () => {
    const plans = await db.getAllPlans();
    return plans.map((plan) => ({
      code: plan.code,
      name: plan.name,
      price: plan.priceMonthly,
      description: plan.description,
      features: plan.features,
    }));
  }),
});
