import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  announcements,
  categories,
  coupons,
  generatedSheets,
  pageViews,
  payments,
  plans,
  siteSettings,
  templates,
  users,
  type Category,
  type GeneratedSheet,
  type InsertPageView,
  type InsertPayment,
  type InsertPlan,
  type InsertUser,
  type PageView,
  type Payment,
  type Plan,
  type SiteSetting,
  type Template,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let client: postgres.Sql | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (_db || !process.env.DATABASE_URL) return _db;

  try {
    if (!client) {
      client = postgres(process.env.DATABASE_URL, {
        max: 5,
        prepare: false,
      });
    }
    if (!_db) {
      _db = drizzle(client);
    }
  } catch (error) {
    console.error("[Database] Não foi possível inicializar PostgreSQL:", error);
    client = null;
    _db = null;
  }

  return _db;
}

// ==================== Users ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    throw new Error("Database is not configured");
  }

  const now = new Date();
  const values: InsertUser = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    photoUrl: user.photoUrl ?? null,
    loginMethod: user.loginMethod ?? null,
    role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : undefined),
    lastSignedIn: user.lastSignedIn ?? now,
  };

  await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({
      target: users.openId,
      set: {
        name: values.name,
        email: values.email,
        photoUrl: values.photoUrl,
        loginMethod: values.loginMethod,
        ...(values.role ? { role: values.role } : {}),
        lastSignedIn: values.lastSignedIn,
        updatedAt: now,
      },
    });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      openId: users.openId,
      name: users.name,
      email: users.email,
      photoUrl: users.photoUrl,
      loginMethod: users.loginMethod,
      role: users.role,
      plan: users.plan,
      suspended: users.suspended,
      sheetsGenerated: users.sheetsGenerated,
      aiUsesLeft: users.aiUsesLeft,
      aiUsesResetAt: users.aiUsesResetAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastSignedIn: users.lastSignedIn,
      planExpiresAt: users.planExpiresAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
}

export async function updateUserPlan(userId: number, plan: string, planExpiresAt?: Date) {
  const db = await getDb();
  if (!db) return;

  // Buscar os benefícios do plano para atualizar os créditos de IA do usuário
  const planInfo = await getPlanByCode(plan);
  const aiUsesLeft = planInfo?.maxAiUses ?? 0;

  const updateData: any = {
    plan,
    aiUsesLeft,
    // Marca a renovação: a cota do novo plano vale para o mês corrente.
    aiUsesResetAt: new Date(),
    updatedAt: new Date(),
  };
  // Só definir planExpiresAt se foi fornecido (pode ser null para downgrade)
  if (planExpiresAt !== undefined) {
    updateData.planExpiresAt = planExpiresAt;
  } else {
    // Verificar se o plano é gratuito (price 0)
    if (planInfo && parseFloat(planInfo.priceMonthly || "0") <= 0) {
      updateData.planExpiresAt = null;
    }
  }

  await db.update(users).set(updateData).where(eq(users.id, userId));
}

export async function downgradeExpiredPlans() {
  const db = await getDb();
  if (!db) return;
  
  // Update users whose plan is paid and their expiration date has passed
  const now = new Date();
  // Buscar planos pagos (price > 0) para fazer downgrade
  const paidPlans = await db.select({ code: plans.code }).from(plans)
    .where(and(eq(plans.isActive, true), sql`CAST(plans."priceMonthly" AS NUMERIC) > 0`));
  const paidCodes = paidPlans.map(p => p.code);
  
  if (paidCodes.length > 0) {
    await db.update(users).set({ plan: "free", planExpiresAt: null, updatedAt: now }).where(
      and(inArray(users.plan, paidCodes as [string, ...string[]]), lt(users.planExpiresAt, now))
    );
  }
}

export async function updateUserSuspended(userId: number, suspended: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ suspended, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function incrementSheetsGenerated(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({
      sheetsGenerated: sql`${users.sheetsGenerated} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function updateUserAIUses(userId: number, aiUsesLeft: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ aiUsesLeft, updatedAt: new Date() }).where(eq(users.id, userId));
}

/**
 * Consome 1 uso de IA de forma atômica no banco, evitando condição de corrida
 * (duas gerações simultâneas descontando o mesmo saldo) e impedindo saldo
 * negativo. Retorna o saldo restante depois do desconto.
 */
export async function consumeAIUse(userId: number): Promise<number | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .update(users)
    .set({
      aiUsesLeft: sql`GREATEST(${users.aiUsesLeft} - 1, 0)`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ aiUsesLeft: users.aiUsesLeft });
  return result[0]?.aiUsesLeft;
}

/**
 * Renova a cota mensal de usos de IA quando o mês virou.
 * Antes disso o saldo nunca era reposto: quem gastava tudo ficava travado para
 * sempre, mesmo com a mensagem dizendo "aguarde o próximo mês".
 * Planos com maxAiUses <= 0 (sem IA ou ilimitado) não são tocados.
 * Retorna o saldo atualizado.
 */
export async function refreshMonthlyAIUses(
  userId: number,
  currentUses: number,
  maxAiUses: number,
  lastResetAt: Date | null | undefined,
): Promise<number> {
  if (maxAiUses <= 0) return currentUses;

  const now = new Date();
  const sameMonth =
    lastResetAt instanceof Date &&
    lastResetAt.getUTCFullYear() === now.getUTCFullYear() &&
    lastResetAt.getUTCMonth() === now.getUTCMonth();
  if (sameMonth) return currentUses;

  const db = await getDb();
  if (!db) return currentUses;
  await db
    .update(users)
    .set({ aiUsesLeft: maxAiUses, aiUsesResetAt: now, updatedAt: now })
    .where(eq(users.id, userId));
  return maxAiUses;
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(users).where(eq(users.id, userId));
}

// ==================== Categories ====================

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(categories.displayOrder);
}

export async function getCategoryById(id: number): Promise<Category | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return result[0];
}

export async function createCategory(data: Omit<Category, "id" | "createdAt" | "updatedAt">): Promise<Category | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .insert(categories)
    .values({ ...data, createdAt: new Date(), updatedAt: new Date() })
    .returning();
  return result[0];
}

export async function updateCategory(id: number, data: Partial<Omit<Category, "id" | "createdAt">>) {
  const db = await getDb();
  if (!db) return;
  await db.update(categories).set({ ...data, updatedAt: new Date() }).where(eq(categories.id, id));
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(categories).where(eq(categories.id, id));
}

// ==================== Templates ====================

export async function getAllTemplates(): Promise<Template[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(templates).where(eq(templates.isActive, true)).orderBy(templates.displayOrder);
}

export async function getAllTemplatesAdmin(): Promise<Template[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(templates).orderBy(templates.displayOrder);
}

export async function getFeaturedTemplates(): Promise<Template[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(templates)
    .where(and(eq(templates.isActive, true), eq(templates.isFeatured, true)))
    .orderBy(templates.displayOrder);
}

export async function getTemplateById(id: number): Promise<Template | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
  return result[0];
}

export async function createTemplate(data: Omit<Template, "id" | "createdAt" | "updatedAt">): Promise<Template | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .insert(templates)
    .values({ ...data, createdAt: new Date(), updatedAt: new Date() })
    .returning();
  return result[0];
}

export async function updateTemplate(id: number, data: Partial<Omit<Template, "id" | "createdAt">>) {
  const db = await getDb();
  if (!db) return;
  await db.update(templates).set({ ...data, updatedAt: new Date() }).where(eq(templates.id, id));
}

export async function deleteTemplate(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(templates).where(eq(templates.id, id));
}

// ==================== Generated Sheets ====================

export async function getGeneratedSheetsByUser(userId: number): Promise<GeneratedSheet[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(generatedSheets).where(eq(generatedSheets.userId, userId)).orderBy(desc(generatedSheets.createdAt));
}

export async function createGeneratedSheet(data: Omit<GeneratedSheet, "id" | "createdAt">): Promise<GeneratedSheet | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(generatedSheets).values({ ...data, createdAt: new Date() }).returning();
  return result[0];
}

export async function countGeneratedSheetsSince(userId: number, since: Date): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(generatedSheets)
    .where(and(eq(generatedSheets.userId, userId), gte(generatedSheets.createdAt, since)));
  return Number(result[0]?.count ?? 0);
}

export async function getAllGeneratedSheets(): Promise<GeneratedSheet[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(generatedSheets).orderBy(desc(generatedSheets.createdAt));
}

// ==================== Plans ====================
export async function getPlanByCode(code: string): Promise<Plan | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(plans).where(eq(plans.code, code)).limit(1);
  return result[0];
}
export async function getAllPlans(): Promise<Plan[]> {
  const db = await getDb();
  if (!db) return [];
  const allPlans = await db.select().from(plans).orderBy(plans.displayOrder);
  return allPlans;
}
export async function updatePlan(id: number, data: Partial<Omit<Plan, "id" | "createdAt">>) {
  const db = await getDb();
  if (!db) return;
  await db.update(plans).set({ ...data, updatedAt: new Date() }).where(eq(plans.id, id));
}
export async function createPlan(data: Omit<InsertPlan, "id" | "createdAt" | "updatedAt">): Promise<Plan | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(plans).values({ ...data, createdAt: new Date(), updatedAt: new Date() }).returning();
  return result[0];
}
export async function deletePlan(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(plans).where(eq(plans.id, id));
}

// ==================== Site Settings ====================

export async function getSiteSetting(key: string): Promise<SiteSetting | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
  return result[0];
}

export async function getAllSiteSettings(): Promise<SiteSetting[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(siteSettings);
}

export async function getAllSettings(): Promise<SiteSetting[]> {
  return getAllSiteSettings();
}

export async function getSetting(key: string): Promise<SiteSetting | undefined> {
  return getSiteSetting(key);
}

export async function upsertSetting(key: string, value: unknown): Promise<void> {
  return upsertSiteSetting(key, value);
}

export async function upsertSiteSetting(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(siteSettings)
    .values({ key, value: value as any, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: value as any, updatedAt: new Date() },
    });
}

// ==================== Admin Emails ====================

const ADMIN_EMAILS_KEY = "admin_emails";
const DEFAULT_ADMIN_EMAILS = ["jefersonsantos82582@gmail.com"];

export async function getAdminEmails(): Promise<string[]> {
  const setting = await getSiteSetting(ADMIN_EMAILS_KEY);
  if (!setting || !Array.isArray(setting.value) || setting.value.length === 0) {
    // Seed with the default owner admin the first time this is read.
    await upsertSiteSetting(ADMIN_EMAILS_KEY, DEFAULT_ADMIN_EMAILS);
    return DEFAULT_ADMIN_EMAILS;
  }
  return (setting.value as string[]).map(e => e.toLowerCase().trim());
}

export async function addAdminEmail(email: string): Promise<string[]> {
  const normalized = email.toLowerCase().trim();
  const current = await getAdminEmails();
  if (!current.includes(normalized)) {
    current.push(normalized);
    await upsertSiteSetting(ADMIN_EMAILS_KEY, current);
  }
  return current;
}

export async function removeAdminEmail(email: string): Promise<string[]> {
  const normalized = email.toLowerCase().trim();
  const current = await getAdminEmails();
  const updated = current.filter(e => e !== normalized);
  await upsertSiteSetting(ADMIN_EMAILS_KEY, updated.length > 0 ? updated : DEFAULT_ADMIN_EMAILS);
  return updated.length > 0 ? updated : DEFAULT_ADMIN_EMAILS;
}

// ==================== Coupons ====================

export async function getCouponByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  return result[0];
}

export async function incrementCouponUses(couponId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(coupons)
    .set({ usesCount: sql`${coupons.usesCount} + 1` })
    .where(eq(coupons.id, couponId));
}

// ==================== Announcements ====================

export async function getAllAnnouncements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(announcements).orderBy(desc(announcements.createdAt));
}

export async function createAnnouncement(data: Omit<typeof announcements.$inferInsert, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(announcements).values({ ...data, createdAt: new Date() }).returning();
  return result[0];
}


// ==================== Page Views ====================

export async function trackPageView(data: InsertPageView): Promise<PageView | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(pageViews).values(data).returning();
  return result[0];
}

export async function getPageViewsCount(page?: string, since?: Date): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const conditions: any[] = [];
  if (page) conditions.push(eq(pageViews.page, page));
  if (since) conditions.push(gte(pageViews.createdAt, since));
  
  const result = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(pageViews)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  
  return result[0]?.count || 0;
}

/**
 * Conta visitantes únicos (por sessionId). É essa a métrica de "quantas pessoas
 * entraram no site" — o total de pageViews conta cada página aberta.
 */
export async function getUniqueVisitorsCount(since?: Date): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`cast(count(distinct ${pageViews.sessionId}) as integer)` })
    .from(pageViews)
    .where(since ? gte(pageViews.createdAt, since) : undefined);
  return result[0]?.count || 0;
}

/**
 * Registra um acesso, evitando duplicar a mesma visita: se o mesmo visitante já
 * abriu a mesma página nos últimos 30 minutos, o acesso não é contado de novo
 * (protege contra F5 e remontagem de componente inflando a métrica).
 */
export async function trackPageViewOnce(data: InsertPageView): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  if (data.sessionId) {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const existing = await db
      .select({ id: pageViews.id })
      .from(pageViews)
      .where(
        and(
          eq(pageViews.sessionId, data.sessionId),
          eq(pageViews.page, data.page),
          gte(pageViews.createdAt, cutoff),
        ),
      )
      .limit(1);
    if (existing.length > 0) return false;
  }
  await db.insert(pageViews).values(data);
  return true;
}

export async function getPageViewsByPage(): Promise<{ page: string; count: number }[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      page: pageViews.page,
      count: sql<number>`cast(count(*) as integer)`,
    })
    .from(pageViews)
    .groupBy(pageViews.page)
    .orderBy(sql`count(*) DESC`);
  
  return result;
}

// ==================== Payments ====================

export async function recordPayment(data: InsertPayment): Promise<Payment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(payments).values(data).returning();
  return result[0];
}

export async function getPaymentByMpId(mpPaymentId: string): Promise<Payment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(payments).where(eq(payments.mpPaymentId, mpPaymentId)).limit(1);
  return result[0];
}

export async function updatePaymentStatus(mpPaymentId: string, status: string, approvedAt?: Date): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(payments)
    .set({ status, approvedAt, updatedAt: new Date() })
    .where(eq(payments.mpPaymentId, mpPaymentId));
}

export async function getApprovedPaymentsCount(since?: Date): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const conditions = [eq(payments.status, "approved")];
  if (since) conditions.push(gte(payments.approvedAt, since));
  
  const result = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(payments)
    .where(and(...conditions));
  
  return result[0]?.count || 0;
}

export async function getTotalApprovedPaymentsAmount(since?: Date): Promise<string> {
  const db = await getDb();
  if (!db) return "0";
  
  const conditions = [eq(payments.status, "approved")];
  if (since) conditions.push(gte(payments.approvedAt, since));
  
  const result = await db
    .select({ total: sql<string>`coalesce(sum(cast(amount as numeric)), 0)` })
    .from(payments)
    .where(and(...conditions));
  
  return result[0]?.total || "0";
}

export async function getPaymentsByPlan(): Promise<{ planCode: string; count: number; total: string }[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      planCode: payments.planCode,
      count: sql<number>`cast(count(*) as integer)`,
      total: sql<string>`coalesce(sum(cast(amount as numeric)), 0)`,
    })
    .from(payments)
    .where(eq(payments.status, "approved"))
    .groupBy(payments.planCode);
  
  return result;
}

export async function getAllPayments(): Promise<Payment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).orderBy(desc(payments.createdAt));
}
