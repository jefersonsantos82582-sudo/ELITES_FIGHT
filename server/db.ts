import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
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

export async function updateUserAIUses(userId: number, aiUsesLeft: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ aiUsesLeft, updatedAt: new Date() }).where(eq(users.id, userId));
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
    .where(and(eq(generatedSheets.userId, userId), sql`${generatedSheets.createdAt} >= ${since}`));
  return result[0]?.count ?? 0;
}

export async function getAllGeneratedSheets(): Promise<GeneratedSheet[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(generatedSheets).orderBy(desc(generatedSheets.createdAt));
}

// ==================== Plans ====================

export async function getPlanByCode(code: "free" | "pro" | "elite"): Promise<Plan | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(plans).where(eq(plans.code, code)).limit(1);
  return result[0];
}

export async function getAllPlans(): Promise<Plan[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.displayOrder);
}

export async function updatePlan(code: "free" | "pro" | "elite", data: Partial<Omit<Plan, "id" | "code" | "createdAt">>) {
  const db = await getDb();
  if (!db) return;
  await db.update(plans).set({ ...data, updatedAt: new Date() }).where(eq(plans.code, code));
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
