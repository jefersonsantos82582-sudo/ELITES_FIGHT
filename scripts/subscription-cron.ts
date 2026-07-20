/**
 * Script de cron job para rebaixar usuários com planos expirados.
 * Este script deve ser executado diariamente pelo Render (ex: node dist/cron.js)
 * ou pode ser chamado diretamente via npm run cron.
 */

import * as db from '../server/db';

async function runCronJob() {
  console.log(`[${new Date().toISOString()}] Iniciando verificação de planos expirados...`);
  
  try {
    await db.downgradeExpiredPlans();
    console.log(`[${new Date().toISOString()}] Verificação concluída com sucesso.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro na verificação:`, error);
    process.exit(1);
  }
}

runCronJob();
