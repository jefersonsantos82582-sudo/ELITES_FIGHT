/**
 * Verificação de variáveis de ambiente críticas
 * Garante que todas as variáveis necessárias estão configuradas
 */

export interface EnvCheckResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function checkEnvironmentVariables(): EnvCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Verificar variáveis críticas
  const mercadoPagoPublicKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;
  if (!mercadoPagoPublicKey) {
    errors.push(
      "❌ VITE_MERCADO_PAGO_PUBLIC_KEY não está configurada. " +
      "Adicione esta variável no Render Dashboard com sua chave pública do Mercado Pago."
    );
  } else if (!mercadoPagoPublicKey.startsWith("APP_USR")) {
    warnings.push(
      "⚠️ VITE_MERCADO_PAGO_PUBLIC_KEY não parece ser uma chave válida (deve começar com APP_USR)"
    );
  }

  // Verificar Firebase
  const firebaseProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!firebaseProjectId) {
    warnings.push(
      "⚠️ VITE_FIREBASE_PROJECT_ID não está configurada. " +
      "Isso pode afetar a autenticação."
    );
  }

  // Log dos resultados
  if (errors.length > 0 || warnings.length > 0) {
    console.warn("[EnvCheck] Verificação de variáveis de ambiente:");
    errors.forEach(e => console.error(e));
    warnings.forEach(w => console.warn(w));
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
