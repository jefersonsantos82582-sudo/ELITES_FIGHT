# Auditoria de Assinaturas

## Estado Atual
O projeto atualmente usa a API de `checkout/preferences` do Mercado Pago, que é para pagamentos únicos (uma vez só). Isso significa que o usuário paga uma vez, e o plano dele é atualizado, mas não há cobrança recorrente mensal. O webhook só verifica se o pagamento único foi aprovado e atualiza o plano no banco.

## Problema
Sem cobrança recorrente, o sistema nunca saberá quando o plano deve expirar. Não há lógica de "downgrade" (voltar ao plano básico) após 1 mês.

## Solução Proposta
Para resolver isso, temos duas abordagens principais:
1. **Abordagem 1 (Simplificada - Recomendada):** Manter o pagamento único (checkout de preferência) e adicionar uma data de expiração no banco de dados (`expiresAt`). Criar um processo (cron job) que roda diariamente para verificar usuários expirados e rebaixá-los para o plano "free".
2. **Abordagem 2 (Completa):** Migrar para a API de `preapproval` (Assinaturas recorrentes) do Mercado Pago, que cobra automaticamente todo mês.

A abordagem 1 é muito mais robusta para o cenário atual, pois não exige mudanças drásticas na API do Mercado Pago e o plano gratuito do Render suporta tarefas agendadas (cron) através de eventos.

## Próximos Passos
- Adicionar o campo `planExpiresAt` (timestamp) na tabela `users`.
- Atualizar o webhook de pagamento para, ao receber o pagamento único, definir o plano do usuário e calcular a data de expiração (ex: 30 dias a partir de agora).
- Criar um script de manutenção (cron job) para rodar diariamente, verificar usuários expirados e rebaixá-los para o plano "free".
- Atualizar a verificação de plano para levar em conta a data de expiração (se `planExpiresAt` <= agora, tratar como "free" mesmo que o banco ainda diga "pro").
