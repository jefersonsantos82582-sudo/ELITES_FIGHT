import { and, count, desc, eq, gte, sql, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  announcements,
  categories,
  coupons,
  generatedSheets,
  plans,
  siteSettings,
  templates,
  users,
  type Category,
  type GeneratedSheet,
  type InsertUser,
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
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserPlan(userId: number, plan: "free" | "pro" | "elite", planExpiresAt?: Date) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ plan, updatedAt: new Date(), planExpiresAt }).where(eq(users.id, userId));
}

export async function downgradeExpiredPlans() {
  const db = await getDb();
  if (!db) return;
  
  // Update users whose plan is not 'free' and their expiration date has passed
  const now = new Date();
  await db.update(users).set({ plan: "free", planExpiresAt: null, updatedAt: now }).where(
    and(eq(users.plan, "pro"), lt(users.planExpiresAt, now))
  );
  await db.update(users).set({ plan: "free", planExpiresAt: null, updatedAt: now }).where(
    and(eq(users.plan, "elite"), lt(users.planExpiresAt, now))
  );
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

export async function getCategoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return result[0];
}

export async function createCategory(data: {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const [created] = await db.insert(categories).values(data).returning();
  return created;
}

export async function updateCategory(
  id: number,
  data: Partial<{ name: string; slug: string; description: string; icon: string; displayOrder: number }>,
) {
  const db = await getDb();
  if (!db) return;
  const [updated] = await db
    .update(categories)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning();
  return updated;
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

export async function getTemplatesByCategory(categoryId: number): Promise<Template[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(templates)
    .where(and(eq(templates.categoryId, categoryId), eq(templates.isActive, true)))
    .orderBy(templates.displayOrder);
}

export async function getTemplateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
  return result[0];
}

export async function getFeaturedTemplates(): Promise<Template[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(templates)
    .where(and(eq(templates.isFeatured, true), eq(templates.isActive, true)))
    .orderBy(templates.displayOrder);
}

export async function getAllTemplatesAdmin(): Promise<Template[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(templates).orderBy(desc(templates.createdAt));
}

export async function createTemplate(data: {
  categoryId: number;
  name: string;
  slug: string;
  description?: string;
  plan: "free" | "pro" | "elite";
  columns: unknown;
  sampleRows?: unknown;
  headerColor?: string;
  accentColor?: string;
  isFeatured?: boolean;
  isActive?: boolean;
  displayOrder?: number;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const [created] = await db.insert(templates).values(data).returning();
  return created;
}

export async function updateTemplate(
  id: number,
  data: Partial<{
    categoryId: number;
    name: string;
    slug: string;
    description: string;
    plan: "free" | "pro" | "elite";
    columns: unknown;
    sampleRows: unknown;
    headerColor: string;
    accentColor: string;
    isFeatured: boolean;
    isActive: boolean;
    displayOrder: number;
  }>,
) {
  const db = await getDb();
  if (!db) return;
  const [updated] = await db
    .update(templates)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(templates.id, id))
    .returning();
  return updated;
}

export async function deleteTemplate(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(templates).where(eq(templates.id, id));
}

// ==================== Generated Sheets ====================

export async function createGeneratedSheet(data: {
  userId: number;
  templateId: number;
  templateName: string;
  customName: string;
  fileUrl?: string;
  fileKey?: string;
}): Promise<GeneratedSheet | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [created] = await db.insert(generatedSheets).values(data).returning();
  return created;
}

export async function getGeneratedSheetsByUser(userId: number): Promise<GeneratedSheet[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(generatedSheets)
    .where(eq(generatedSheets.userId, userId))
    .orderBy(desc(generatedSheets.createdAt));
}

export async function countGeneratedSheetsSince(userId: number, since: Date): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: count() })
    .from(generatedSheets)
    .where(and(eq(generatedSheets.userId, userId), gte(generatedSheets.createdAt, since)));
  return Number(result[0]?.count ?? 0);
}

export async function getGeneratedSheetById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(generatedSheets).where(eq(generatedSheets.id, id)).limit(1);
  return result[0];
}

export async function getAllGeneratedSheets() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(generatedSheets).orderBy(desc(generatedSheets.createdAt));
}

// ==================== Plans ====================

export async function getAllPlans(): Promise<Plan[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.displayOrder);
}

export async function getPlanByCode(code: "free" | "pro" | "elite") {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(plans).where(eq(plans.code, code)).limit(1);
  return result[0];
}

export async function updatePlan(
  id: number,
  data: Partial<{
    name: string;
    priceMonthly: string;
    priceYearly: string;
    description: string;
    features: unknown;
    maxTemplates: number;
    maxThemes: number;
    maxAiUses: number;
    unlimitedSheets: boolean;
    hasWatermark: boolean;
    customLogo: boolean;
    isActive: boolean;
    displayOrder: number;
  }>,
) {
  const db = await getDb();
  if (!db) return;
  const [updated] = await db
    .update(plans)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(plans.id, id))
    .returning();
  return updated;
}

// ==================== Site Settings ====================

export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
  return result[0];
}

export async function getAllSettings(): Promise<SiteSetting[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(siteSettings);
}

export async function upsertSetting(key: string, value: unknown) {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  await db
    .insert(siteSettings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value, updatedAt: now },
    });
}

// ==================== Coupons ====================

export async function getAllCoupons() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coupons).orderBy(desc(coupons.createdAt));
}

export async function createCoupon(data: {
  code: string;
  discountPercent: number;
  maxUses: number;
  expiresAt?: Date;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const [created] = await db.insert(coupons).values(data).returning();
  return created;
}

export async function deleteCoupon(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(coupons).where(eq(coupons.id, id));
}

// ==================== Announcements ====================

export async function getAllAnnouncements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(announcements).orderBy(desc(announcements.createdAt));
}

export async function createAnnouncement(data: { title: string; message: string; createdBy?: number }) {
  const db = await getDb();
  if (!db) return undefined;
  const [created] = await db.insert(announcements).values(data).returning();
  return created;
}

// ==================== Statistics ====================

export async function getStats() {
  const db = await getDb();
  if (!db) {
    return {
      totalUsers: 0,
      totalSheets: 0,
      totalTemplates: 0,
      planCounts: { free: 0, pro: 0, elite: 0 },
    };
  }

  const [userCount, sheetCount, templateCount, freeCount, proCount, eliteCount] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(generatedSheets),
    db.select({ count: count() }).from(templates).where(eq(templates.isActive, true)),
    db.select({ count: count() }).from(users).where(eq(users.plan, "free")),
    db.select({ count: count() }).from(users).where(eq(users.plan, "pro")),
    db.select({ count: count() }).from(users).where(eq(users.plan, "elite")),
  ]);

  return {
    totalUsers: userCount[0]?.count ?? 0,
    totalSheets: sheetCount[0]?.count ?? 0,
    totalTemplates: templateCount[0]?.count ?? 0,
    planCounts: {
      free: freeCount[0]?.count ?? 0,
      pro: proCount[0]?.count ?? 0,
      elite: eliteCount[0]?.count ?? 0,
    },
  };
}
