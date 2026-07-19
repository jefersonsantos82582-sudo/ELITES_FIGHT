import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", () => ({
  getAllCategories: vi.fn().mockResolvedValue([]),
  getAllPlans: vi.fn().mockResolvedValue([]),
  getAllSettings: vi.fn().mockResolvedValue([]),
  getAllTemplates: vi.fn().mockResolvedValue([]),
  getFeaturedTemplates: vi.fn().mockResolvedValue([]),
  getTemplateById: vi.fn().mockResolvedValue({
    id: 1,
    name: "Controle Financeiro",
    slug: "controle-financeiro",
    description: "Modelo de controle financeiro",
    categoryId: 1,
    plan: "free",
    columns: [{ name: "Data", type: "date", width: 15 }, { name: "Descrição", type: "text", width: 30 }],
    sampleRows: [],
    headerColor: "#D4AF37",
    accentColor: "#1A1A1A",
    isActive: true,
    isFeatured: false,
    displayOrder: 0,
  }),
  getPlanByCode: vi.fn().mockResolvedValue({
    id: 1,
    code: "free",
    name: "FREE",
    unlimitedSheets: false,
    hasWatermark: true,
    maxThemes: 5,
    maxAiUses: 0,
  }),
  getGeneratedSheetsByUser: vi.fn().mockResolvedValue([]),
  createGeneratedSheet: vi.fn().mockResolvedValue({ id: 1 }),
  incrementSheetsGenerated: vi.fn().mockResolvedValue(undefined),
}));

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    key: "sheets/test/file.xlsx",
    url: "https://example.com/file.xlsx",
  }),
}));

// Mock sheetGenerator
vi.mock("./services/sheetGenerator", () => ({
  generateSpreadsheet: vi.fn().mockResolvedValue(Buffer.from("fake-xlsx")),
}));

function createAuthContext(): { ctx: TrpcContext } {
  const user = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user" as const,
    plan: "free" as const,
    suspended: false,
    sheetsGenerated: 0,
    aiUsesLeft: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("generator.generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate a spreadsheet successfully for a free plan user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.generator.generate({
      templateId: 1,
      customName: "Minha Planilha",
    });

    expect(result).toBeDefined();
    expect(result.fileUrl).toBe("https://example.com/file.xlsx");
    expect(result.fileName).toBe("Minha Planilha.xlsx");
  });

  it("should throw if user is suspended", async () => {
    const { ctx } = createAuthContext();
    ctx.user!.suspended = true;
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.generator.generate({ templateId: 1, customName: "Test" })
    ).rejects.toThrow("Conta suspensa");
  });

  it("should throw if template plan is higher than user plan", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Mock getTemplateById to return an elite template
    const db = await import("./db");
    vi.mocked(db.getTemplateById).mockResolvedValueOnce({
      id: 2,
      name: "Elite Template",
      slug: "elite-template",
      plan: "elite",
      columns: [],
      isActive: true,
    } as any);

    await expect(
      caller.generator.generate({ templateId: 2, customName: "Test" })
    ).rejects.toThrow("plano");
  });
});

describe("categories.list", () => {
  it("should return categories", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: {} as any,
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.categories.list();
    expect(result).toEqual([]);
  });
});

describe("plans.list", () => {
  it("should return plans", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: {} as any,
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.plans.list();
    expect(result).toEqual([]);
  });
});
