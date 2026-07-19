-- ==================== CONFIGURAR USUÁRIO ADMIN ====================
-- Este script configura o usuário admin para o painel de administração
-- Email: jefersonsantos82582@gmail.com

-- Inserir ou atualizar usuário admin
INSERT INTO `users` (
  `openId`,
  `name`,
  `email`,
  `loginMethod`,
  `role`,
  `plan`,
  `suspended`,
  `sheetsGenerated`,
  `aiUsesLeft`,
  `createdAt`,
  `updatedAt`,
  `lastSignedIn`
) VALUES (
  'admin_jefersonsantos82582',
  'Jefferson Santos',
  'jefersonsantos82582@gmail.com',
  'oauth',
  'admin',
  'elite',
  false,
  0,
  999999,
  NOW(),
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `role` = 'admin',
  `plan` = 'elite',
  `updatedAt` = NOW();

-- Verificar se o usuário foi criado
SELECT `id`, `email`, `role`, `plan` FROM `users` WHERE `email` = 'jefersonsantos82582@gmail.com';

-- ==================== ATUALIZAR PREÇOS DOS PLANOS ====================
UPDATE `plans` SET `priceMonthly` = '0' WHERE `code` = 'free';
UPDATE `plans` SET `priceMonthly` = '14.99' WHERE `code` = 'pro';
UPDATE `plans` SET `priceMonthly` = '24.99' WHERE `code` = 'elite';

-- Verificar preços
SELECT `code`, `name`, `priceMonthly` FROM `plans`;

-- ==================== CRIAR TABELA DE PAGAMENTOS (OPCIONAL) ====================
-- Se você quiser rastrear pagamentos no banco de dados
CREATE TABLE IF NOT EXISTS `payments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `userEmail` varchar(320),
  `planCode` enum('free', 'pro', 'elite') NOT NULL,
  `planName` varchar(60) NOT NULL,
  `amount` varchar(20) NOT NULL,
  `status` enum('pending', 'approved', 'rejected', 'refunded') DEFAULT 'pending',
  `mercadoPagoId` varchar(255),
  `preferenceId` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `payments_id` PRIMARY KEY(`id`),
  INDEX `payments_userId` (`userId`),
  INDEX `payments_status` (`status`)
);

-- ==================== RESUMO ====================
-- Usuário admin criado com sucesso!
-- Email: jefersonsantos82582@gmail.com
-- Plano: ELITE
-- Preços atualizados:
--   FREE: R$ 0,00
--   PRO: R$ 14,99
--   ELITE: R$ 24,99
