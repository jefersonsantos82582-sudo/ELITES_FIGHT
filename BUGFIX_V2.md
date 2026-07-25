# Correções V2 - ELITES_FIGHT

## Arquivos modificados:
1. `client/src/pages/Admin.tsx` - Reescrito com: lista de usuários, upgrade manual, sorteio, detalhes do usuário, gerenciamento de templates
2. `client/src/pages/Checkout.tsx` - Retry robusto, melhor tratamento de erros, fluxo de pagamento limpo
3. `client/src/components/MercadoPagoCheckout.tsx` - Lifecycle correto, cleanup, retry com remount, redirectMode "self"
4. `client/src/pages/Generator.tsx` - Melhor tratamento de erros, retry automático em auth failure
5. `server/routers/admin.ts` - Adicionada rota getUserById, updateUserPlan com days/dias, updateTemplate com isFeatured
6. `server/routers/payment.ts` - Validação de usuário (não fallback), melhor erro handling
7. `server/_core/trpc.ts` - Admin middleware com role check, melhor validação
8. `server/db.ts` - updateUserPlan aceita null para planExpiresAt
