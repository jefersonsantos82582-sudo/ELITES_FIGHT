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

export function displayEnvErrors(result: EnvCheckResult) {
  if (result.errors.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive text-sm z-50">
      <p className="font-bold mb-2">⚠️ Configuração Incompleta</p>
      <ul className="space-y-1 text-xs">
        {result.errors.map((err, i) => (
          <li key={i}>{err}</li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground mt-3">
        Configure as variáveis de ambiente no Render Dashboard
      </p>
    </div>
  );
}
