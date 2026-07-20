import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// Fallback para armazenamento local caso o Forge não esteja configurado
// Isso garante que o gerador de planilhas funcione em qualquer ambiente.
const STORAGE_DIR = path.join(process.cwd(), "dist", "public", "storage");

async function ensureStorageDir() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (err) {
    // Silencioso se já existir
  }
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  await ensureStorageDir();
  
  const key = appendHashSuffix(normalizeKey(relKey));
  const filePath = path.join(STORAGE_DIR, key);
  
  // Garantir que a subpasta exista
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  
  await fs.writeFile(filePath, data);
  
  // URL acessível publicamente via servidor estático do Vite/Express
  const url = `/storage/${key}`;
  
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  return `/storage/${key}`;
}
