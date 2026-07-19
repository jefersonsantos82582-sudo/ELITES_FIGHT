-- ==================== ATUALIZAR PREÇOS DOS PLANOS ====================
-- Alterando os preços conforme solicitado:
-- FREE: 0 reais
-- PRO: 14,99 reais
-- ELITE: 24,99 reais

UPDATE `plans` SET `priceMonthly` = '0' WHERE `code` = 'free';
UPDATE `plans` SET `priceMonthly` = '14.99' WHERE `code` = 'pro';
UPDATE `plans` SET `priceMonthly` = '24.99' WHERE `code` = 'elite';

-- Verificar os preços atualizados
SELECT `code`, `name`, `priceMonthly`, `priceYearly` FROM `plans`;
