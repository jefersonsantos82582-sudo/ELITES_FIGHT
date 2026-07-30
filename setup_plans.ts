import postgres from "postgres";

// Render PostgreSQL connection string
const DATABASE_URL = "postgresql://elites_fight_user:70RZTnOuDB685JVomjJ3oTJrwrbkjspm@dpg-d9e33cbbc2fs73f52vsg-a.postgres.render.com/elites_fight";

const defaultPlans = [
  {
    code: "free",
    name: "FREE",
    priceMonthly: "0",
    priceYearly: "0",
    description: "Gratuito para sempre. Acesso a 5 modelos e 5 temas.",
    features: [
      "5 modelos de planilhas",
      "5 temas de cores",
      "Criação e edição de planilhas",
      "Sem recursos de IA",
      "Download em XLSX",
      "Marca d'água ELITES_FIGHT",
      "Suporte por email"
    ],
    maxTemplates: 5,
    maxThemes: 5,
    maxAiUses: 0,
    maxSheetsPerMonth: 1,
    unlimitedSheets: false,
    hasWatermark: true,
    customLogo: false,
    displayOrder: 1,
  },
  {
    code: "pro",
    name: "PRO",
    priceMonthly: "14.99",
    priceYearly: "149.90",
    description: "Tudo do Plano Básico + 20 usos de IA por mês e 25 temas exclusivos.",
    features: [
      "Tudo do Plano Básico",
      "20 usos de IA por mês",
      "25 temas (5 básicos + 20 exclusivos)",
      "Mais opções de personalização",
      "Sem marca d'água",
      "Atualizações antecipadas",
      "Suporte prioritário por email",
      "Histórico completo de planilhas"
    ],
    maxTemplates: 5,
    maxThemes: 25,
    maxAiUses: 20,
    maxSheetsPerMonth: 999999,
    unlimitedSheets: true,
    hasWatermark: false,
    customLogo: false,
    displayOrder: 2,
  },
  {
    code: "elite",
    name: "ELITE",
    priceMonthly: "24.99",
    priceYearly: "249.90",
    description: "Tudo do Plano Pro + IA ilimitada, todos os modelos e temas, incluindo futuros.",
    features: [
      "Tudo do Plano Pro",
      "Usos ilimitados da IA",
      "Todos os temas (incluindo os futuros)",
      "Todos os modelos (incluindo os futuros)",
      "Logo personalizado na planilha",
      "Sem marca d'água",
      "Acesso a todos os novos recursos assim que forem lançados",
      "Prioridade nas atualizações",
      "Suporte prioritário 24/7",
      "Histórico completo de planilhas"
    ],
    maxTemplates: 999,
    maxThemes: 999,
    maxAiUses: 999999,
    maxSheetsPerMonth: 999999,
    unlimitedSheets: true,
    hasWatermark: false,
    customLogo: true,
    displayOrder: 3,
  },
];

async function setupPlans() {
  try {
    console.log("Conectando ao banco de dados Render...");
    const sql = postgres(DATABASE_URL, { prepare: false, ssl: 'require' });
    
    console.log("Verificando planos existentes...");
    const existingPlans = await sql`
      SELECT id, code, name FROM plans ORDER BY "displayOrder"
    `;
    
    console.log(`\nTotal de planos existentes: ${existingPlans.length}`);
    if (existingPlans.length > 0) {
      console.log("Planos encontrados:");
      existingPlans.forEach(p => console.log(`  - ${p.code}: ${p.name}`));
    }
    
    // Inserir planos padrão (ignorar se já existem)
    console.log("\nInserindo planos padrão...");
    for (const plan of defaultPlans) {
      try {
        await sql`
          INSERT INTO plans (
            code, name, "priceMonthly", "priceYearly", description, features,
            "maxTemplates", "maxThemes", "maxAiUses", "maxSheetsPerMonth",
            "unlimitedSheets", "hasWatermark", "customLogo", "displayOrder"
          ) VALUES (
            ${plan.code}, ${plan.name}, ${plan.priceMonthly}, ${plan.priceYearly},
            ${plan.description}, ${JSON.stringify(plan.features)},
            ${plan.maxTemplates}, ${plan.maxThemes}, ${plan.maxAiUses},
            ${plan.maxSheetsPerMonth}, ${plan.unlimitedSheets}, ${plan.hasWatermark},
            ${plan.customLogo}, ${plan.displayOrder}
          )
          ON CONFLICT (code) DO NOTHING
        `;
        console.log(`  ✓ Plano ${plan.code} inserido/verificado`);
      } catch (err: any) {
        console.log(`  ✗ Erro ao inserir ${plan.code}: ${err.message}`);
      }
    }
    
    // Verificar resultado final
    console.log("\nPlanos finais no banco:");
    const finalPlans = await sql`
      SELECT id, code, name, "priceMonthly", "priceYearly", "displayOrder"
      FROM plans 
      ORDER BY "displayOrder"
    `;
    
    console.log(`Total: ${finalPlans.length} planos`);
    finalPlans.forEach(p => {
      console.log(`  - ${p.code}: ${p.name} (R$ ${p.priceMonthly}/mês, R$ ${p.priceYearly}/ano)`);
    });
    
    await sql.end();
    console.log("\n✓ Setup concluído com sucesso!");
  } catch (error: any) {
    console.error("Erro:", error.message);
    process.exit(1);
  }
}

setupPlans();
