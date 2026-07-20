import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import type { TrpcContext } from "../server/_core/context";
import { ensureDefaultCatalog } from "../server/services/catalogSeed";
import { appRouter } from "../server/routers";
import * as db from "../server/db";

function createContext(user: NonNullable<TrpcContext["user"]>): TrpcContext {
  return {
    user,
    req: { protocol: "http", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

async function main() {
  await ensureDefaultCatalog();
  await ensureDefaultCatalog();

  const plans = await db.getAllPlans();
  const categories = await db.getAllCategories();
  const templates = await db.getAllTemplates();
  assert.equal(plans.length, 3, "A carga inicial deve criar três planos sem duplicá-los");
  assert.equal(categories.length, 5, "A carga inicial deve criar cinco categorias");
  assert.equal(templates.length, 6, "A carga inicial deve criar seis modelos");

  const openId = `integration-test-${Date.now()}`;
  await db.upsertUser({
    openId,
    name: "Usuário de Integração",
    email: "integration@example.com",
    loginMethod: "test",
    plan: "free",
  });
  const user = await db.getUserByOpenId(openId);
  assert.ok(user, "O usuário de integração deve ser criado");

  const caller = appRouter.createCaller(createContext(user));
  const overviewBefore = await caller.dashboard.overview();
  assert.equal(overviewBefore.templatesUnlocked, 2, "O plano FREE deve liberar dois modelos");
  assert.equal(overviewBefore.themesUnlocked, 3, "O plano FREE deve liberar três temas");
  assert.equal(overviewBefore.sheetsGeneratedThisMonth, 0, "O usuário novo não deve consumir limite mensal");

  const freeTemplate = templates.find((template) => template.plan === "free");
  assert.ok(freeTemplate, "Deve haver um modelo FREE para teste");

  const generated = await caller.generator.generate({
    templateId: freeTemplate.id,
    customName: "Planilha de Teste de Integração",
    headerColor: "#123456",
    accentColor: "#654321",
    extraInfo: "Gerada durante o teste de integração.",
  });
  assert.match(generated.fileUrl, /^\/storage\/sheets\//, "A geração deve devolver uma URL pública de download");

  const generatedFilePath = path.join(process.cwd(), "dist", "public", generated.fileUrl.replace(/^\//, ""));
  const generatedFile = await fs.stat(generatedFilePath);
  assert.ok(generatedFile.size > 0, "O arquivo XLSX gerado deve existir e não ser vazio");

  const overviewAfter = await caller.dashboard.overview();
  assert.equal(overviewAfter.sheetsGeneratedThisMonth, 1, "A geração deve consumir somente o limite do mês corrente");
  assert.equal(overviewAfter.totalSheets, 1, "A geração deve entrar no histórico do usuário");

  await assert.rejects(
    () => caller.generator.generate({
      templateId: freeTemplate.id,
      customName: "Segunda planilha no mesmo mês",
      headerColor: "#123456",
      accentColor: "#654321",
    }),
    /limite mensal/i,
    "O plano FREE deve bloquear a segunda geração dentro do mesmo mês",
  );

  console.log("SMOKE_TEST_OK", JSON.stringify({
    plans: plans.length,
    categories: categories.length,
    templates: templates.length,
    generatedFileUrl: generated.fileUrl,
  }));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("SMOKE_TEST_FAILED", error);
    process.exit(1);
  });
