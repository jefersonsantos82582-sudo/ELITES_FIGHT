import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  categories,
  templates,
  generatedSheets,
  plans,
  siteSettings,
  coupons,
  announcements,
  type Template,
  type Category,
  type Plan,
  type GeneratedSheet,
  type SiteSetting,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
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
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserPlan(userId: number, plan: "free" | "pro" | "elite") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ plan }).where(eq(users.id, userId));
}

export async function updateUserSuspended(userId: number, suspended: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ suspended }).where(eq(users.id, userId));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function incrementSheetsGenerated(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({
    sheetsGenerated: sql`${users.sheetsGenerated} + 1`,
  }).where(eq(users.id, userId));
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

export async function createCategory(data: { name: string; slug: string; description?: string; icon?: string; displayOrder?: number }) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(categories).values(data);
  const id = (result as any).insertId;
  return getCategoryById(id);
}

export async function updateCategory(id: number, data: Partial<{ name: string; slug: string; description: string; icon: string; displayOrder: number }>) {
  const db = await getDb();
  if (!db) return;
  await db.update(categories).set(data).where(eq(categories.id, id));
  return getCategoryById(id);
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
  return db.select().from(templates)
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
  return db.select().from(templates)
    .where(and(eq(templates.isFeatured, true), eq(templates.isActive, true)))
    .orderBy(templates.displayOrder);
}

export async function getAllTemplatesAdmin(): Promise<Template[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(templates).orderBy(desc(templates.createdAt));
}

export async function createTemplate(data: {
  categoryId: number; name: string; slug: string; description?: string;
  plan: "free" | "pro" | "elite"; columns: unknown; sampleRows?: unknown;
  headerColor?: string; accentColor?: string; isFeatured?: boolean; isActive?: boolean; displayOrder?: number;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(templates).values(data as any);
  const id = (result as any).insertId;
  return getTemplateById(id);
}

export async function updateTemplate(id: number, data: Partial<{
  categoryId: number; name: string; slug: string; description: string;
  plan: "free" | "pro" | "elite"; columns: unknown; sampleRows: unknown;
  headerColor: string; accentColor: string; isFeatured: boolean; isActive: boolean; displayOrder: number;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(templates).set(data as any).where(eq(templates.id, id));
  return getTemplateById(id);
}

export async function deleteTemplate(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(templates).where(eq(templates.id, id));
}

// ==================== Generated Sheets ====================

export async function createGeneratedSheet(data: {
  userId: number; templateId: number; templateName: string;
  customName: string; fileUrl?: string; fileKey?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(generatedSheets).values(data);
  const id = (result as any).insertId;
  const rows = await db.select().from(generatedSheets).where(eq(generatedSheets.id, id)).limit(1);
  return rows[0];
}

export async function getGeneratedSheetsByUser(userId: number): Promise<GeneratedSheet[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(generatedSheets)
    .where(eq(generatedSheets.userId, userId))
    .orderBy(desc(generatedSheets.createdAt));
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

export async function updatePlan(id: number, data: Partial<{
  name: string; priceMonthly: string; priceYearly: string; description: string;
  features: unknown; maxTemplates: number; maxThemes: number; maxAiUses: number;
  unlimitedSheets: boolean; hasWatermark: boolean; customLogo: boolean; isActive: boolean; displayOrder: number;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(plans).set(data as any).where(eq(plans.id, id));
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
  await db.insert(siteSettings).values({ key, value: value as any })
    .onDuplicateKeyUpdate({ set: { value: value as any } });
}

// ==================== Coupons ====================

export async function getAllCoupons() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coupons).orderBy(desc(coupons.createdAt));
}

export async function createCoupon(data: { code: string; discountPercent: number; maxUses: number; expiresAt?: Date }) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(coupons).values(data);
  const id = (result as any).insertId;
  const rows = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  return rows[0];
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
  const result = await db.insert(announcements).values(data);
  const id = (result as any).insertId;
  const rows = await db.select().from(announcements).where(eq(announcements.id, id)).limit(1);
  return rows[0];
}

// ==================== Statistics ====================

export async function getStats() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, totalSheets: 0, totalTemplates: 0, planCounts: { free: 0, pro: 0, elite: 0 } };

  const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
  const sheetCount = await db.select({ count: sql<number>`count(*)` }).from(generatedSheets);
  const templateCount = await db.select({ count: sql<number>`count(*)` }).from(templates).where(eq(templates.isActive, true));

  const freeCount = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.plan, "free"));
  const proCount = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.plan, "pro"));
  const eliteCount = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.plan, "elite"));

  return {
    totalUsers: userCount[0]?.count || 0,
    totalSheets: sheetCount[0]?.count || 0,
    totalTemplates: templateCount[0]?.count || 0,
    planCounts: {
      free: freeCount[0]?.count || 0,
      pro: proCount[0]?.count || 0,
      elite: eliteCount[0]?.count || 0,
    },
  };
}
