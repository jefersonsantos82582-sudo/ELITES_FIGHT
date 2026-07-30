import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import * as db from "../db";

export const systemRouter = router({
  /**
   * Tarefa de manutenção que deve ser chamada periodicamente (ex: via cron)
   * Expira planos que passaram da data de validade.
   */
  cron: publicProcedure.mutation(async () => {
    console.log("[System] Executando cron de manutenção...");
    await db.downgradeExpiredPlans();
    return { success: true };
  }),

  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
