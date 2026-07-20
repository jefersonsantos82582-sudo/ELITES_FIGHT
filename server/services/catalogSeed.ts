import { inArray } from "drizzle-orm";
import { categories, plans, templates } from "../../drizzle/schema";
import { getDb } from "../db";

const defaultPlans = [
  {
    code: "free" as const,
    name: "FREE",
    priceMonthly: "0",
    priceYearly: "0",
    description: "Para começar a criar planilhas profissionais.",
    features: ["2 modelos essenciais", "3 temas", "1 planilha por mês", "Download em XLSX"],
    maxTemplates: 2,
    maxThemes: 3,
    maxAiUses: 0,
    unlimitedSheets: false,
    hasWatermark: true,
    customLogo: false,
    displayOrder: 1,
  },
  {
    code: "pro" as const,
    name: "PRO",
    priceMonthly: "14.99",
    priceYearly: "149.90",
    description: "Para profissionais que precisam de mais flexibilidade.",
    features: ["4 modelos profissionais", "5 temas", "Gerações ilimitadas", "Sem marca d'água"],
    maxTemplates: 4,
    maxThemes: 5,
    maxAiUses: 20,
    unlimitedSheets: true,
    hasWatermark: false,
    customLogo: false,
    displayOrder: 2,
  },
  {
    code: "elite" as const,
    name: "ELITE",
    priceMonthly: "24.99",
    priceYearly: "249.90",
    description: "Para operações que exigem personalização completa.",
    features: ["Todos os modelos", "Todos os temas", "Gerações ilimitadas", "Logo personalizado"],
    maxTemplates: 6,
    maxThemes: 6,
    maxAiUses: 100,
    unlimitedSheets: true,
    hasWatermark: false,
    customLogo: true,
    displayOrder: 3,
  },
];

const defaultCategories = [
  {
    name: "Financeiro",
    slug: "financeiro",
    description: "Controle receitas, despesas e metas financeiras.",
    icon: "WalletCards",
    displayOrder: 1,
  },
  {
    name: "Vendas",
    slug: "vendas",
    description: "Acompanhe clientes, propostas e resultados comerciais.",
    icon: "TrendingUp",
    displayOrder: 2,
  },
  {
    name: "Projetos",
    slug: "projetos",
    description: "Planeje atividades, responsáveis e prazos.",
    icon: "KanbanSquare",
    displayOrder: 3,
  },
  {
    name: "Estoque",
    slug: "estoque",
    description: "Organize entradas, saídas e níveis de reposição.",
    icon: "Package",
    displayOrder: 4,
  },
  {
    name: "Pessoal",
    slug: "pessoal",
    description: "Estruture orçamento e objetivos pessoais.",
    icon: "UserRound",
    displayOrder: 5,
  },
];

const defaultTemplates = [
  {
    categorySlug: "financeiro",
    name: "Controle Financeiro Mensal",
    slug: "controle-financeiro-mensal",
    description: "Registre receitas e despesas para acompanhar o saldo do mês.",
    plan: "free" as const,
    columns: [
      { name: "Data", width: 14 },
      { name: "Descrição", width: 30 },
      { name: "Categoria", width: 18 },
      { name: "Tipo", width: 12 },
      { name: "Valor", width: 16 },
    ],
    sampleRows: [
      ["01/07/2026", "Salário", "Receitas", "Entrada", 4500],
      ["03/07/2026", "Aluguel", "Moradia", "Saída", 1200],
      ["05/07/2026", "Mercado", "Alimentação", "Saída", 380],
    ],
    headerColor: "#D4AF37",
    accentColor: "#1A1A1A",
    isFeatured: true,
    displayOrder: 1,
  },
  {
    categorySlug: "pessoal",
    name: "Orçamento Pessoal",
    slug: "orcamento-pessoal",
    description: "Planeje metas de economia e despesas recorrentes.",
    plan: "free" as const,
    columns: [
      { name: "Categoria", width: 24 },
      { name: "Orçado", width: 16 },
      { name: "Realizado", width: 16 },
      { name: "Diferença", width: 16 },
      { name: "Observações", width: 30 },
    ],
    sampleRows: [
      ["Moradia", 1500, 1450, 50, "Pagamento em dia"],
      ["Alimentação", 800, 620, 180, ""],
      ["Transporte", 350, 290, 60, ""],
    ],
    headerColor: "#2563EB",
    accentColor: "#172554",
    isFeatured: true,
    displayOrder: 2,
  },
  {
    categorySlug: "vendas",
    name: "Pipeline de Vendas",
    slug: "pipeline-de-vendas",
    description: "Controle oportunidades comerciais desde o contato até o fechamento.",
    plan: "pro" as const,
    columns: [
      { name: "Cliente", width: 26 },
      { name: "Contato", width: 24 },
      { name: "Etapa", width: 18 },
      { name: "Valor estimado", width: 18 },
      { name: "Próxima ação", width: 28 },
    ],
    sampleRows: [
      ["Empresa Alfa", "Marina Souza", "Proposta enviada", 12000, "Retornar em 22/07"],
      ["Loja Beta", "Carlos Lima", "Qualificação", 3500, "Agendar demonstração"],
    ],
    headerColor: "#16A34A",
    accentColor: "#14532D",
    isFeatured: true,
    displayOrder: 3,
  },
  {
    categorySlug: "estoque",
    name: "Controle de Estoque",
    slug: "controle-de-estoque",
    description: "Acompanhe produtos, movimentações e ponto de reposição.",
    plan: "pro" as const,
    columns: [
      { name: "SKU", width: 16 },
      { name: "Produto", width: 30 },
      { name: "Quantidade", width: 14 },
      { name: "Mínimo", width: 12 },
      { name: "Fornecedor", width: 24 },
    ],
    sampleRows: [
      ["CAM-001", "Camiseta Premium", 42, 15, "Fornecedor Norte"],
      ["BON-014", "Boné Classic", 8, 12, "Fornecedor Sul"],
    ],
    headerColor: "#EA580C",
    accentColor: "#7C2D12",
    isFeatured: false,
    displayOrder: 4,
  },
  {
    categorySlug: "projetos",
    name: "Cronograma de Projetos",
    slug: "cronograma-de-projetos",
    description: "Planeje entregas, prazos e responsáveis em uma visão única.",
    plan: "elite" as const,
    columns: [
      { name: "Atividade", width: 32 },
      { name: "Responsável", width: 24 },
      { name: "Início", width: 14 },
      { name: "Prazo", width: 14 },
      { name: "Status", width: 18 },
    ],
    sampleRows: [
      ["Definir escopo", "Ana Ribeiro", "20/07/2026", "24/07/2026", "Em andamento"],
      ["Desenvolver protótipo", "João Silva", "25/07/2026", "05/08/2026", "Pendente"],
    ],
    headerColor: "#7C3AED",
    accentColor: "#3B0764",
    isFeatured: false,
    displayOrder: 5,
  },
  {
    categorySlug: "financeiro",
    name: "Fluxo de Caixa Empresarial",
    slug: "fluxo-de-caixa-empresarial",
    description: "Projete entradas e saídas para apoiar decisões do negócio.",
    plan: "elite" as const,
    columns: [
      { name: "Data", width: 14 },
      { name: "Descrição", width: 30 },
      { name: "Centro de custo", width: 22 },
      { name: "Entrada", width: 16 },
      { name: "Saída", width: 16 },
      { name: "Saldo", width: 16 },
    ],
    sampleRows: [
      ["01/07/2026", "Saldo inicial", "Geral", 10000, 0, 10000],
      ["02/07/2026", "Recebimento de cliente", "Comercial", 4200, 0, 14200],
      ["04/07/2026", "Pagamento fornecedor", "Operações", 0, 3100, 11100],
    ],
    headerColor: "#0F766E",
    accentColor: "#134E4A",
    isFeatured: false,
    displayOrder: 6,
  },
];

/**
 * Garante os dados mínimos necessários para que uma instalação nova já ofereça
 * planos, categorias e modelos utilizáveis. Registros existentes nunca são
 * sobrescritos, inclusive quando editados pelo administrador.
 */
export async function ensureDefaultCatalog(): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Catálogo] DATABASE_URL ausente; carga inicial não executada.");
    return false;
  }

  await db.insert(plans).values(defaultPlans).onConflictDoNothing({ target: plans.code });
  await db.insert(categories).values(defaultCategories).onConflictDoNothing({ target: categories.slug });

  const seededCategories = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories)
    .where(inArray(categories.slug, defaultCategories.map((category) => category.slug)));
  const categoryIds = new Map(seededCategories.map((category) => [category.slug, category.id]));

  const templateValues = defaultTemplates.flatMap(({ categorySlug, ...template }) => {
    const categoryId = categoryIds.get(categorySlug);
    return categoryId ? [{ ...template, categoryId }] : [];
  });

  if (templateValues.length !== defaultTemplates.length) {
    throw new Error("Não foi possível localizar todas as categorias padrão para criar os modelos.");
  }

  await db.insert(templates).values(templateValues).onConflictDoNothing({ target: templates.slug });
  console.log("[Catálogo] Planos, categorias e modelos padrão verificados.");
  return true;
}
