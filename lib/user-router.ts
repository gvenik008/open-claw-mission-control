/**
 * User Router — maps Telegram IDs to their Mission Control instances.
 * 
 * Used by Gvenik to route API calls to the correct user's database.
 * 
 * Usage:
 *   const router = new UserRouter();
 *   const mcUrl = router.getMcUrl(telegramId);
 *   // Then call: fetch(`${mcUrl}/api/deploy-agent`, ...)
 */

import Database from "better-sqlite3";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

const HOME = process.env.HOME || "/Users/test7";
const MASTER_DB_PATH = process.env.MASTER_DB_DIR 
  ? join(process.env.MASTER_DB_DIR, "master.db")
  : join(HOME, ".openclaw/data/master.db");

interface UserInstance {
  username: string;
  displayName: string;
  telegramId: string;
  mcPort: number;
  mcUrl: string;
  dbPath: string;
  status: string;
}

export function getUserByTelegramId(telegramId: string): UserInstance | null {
  if (!existsSync(MASTER_DB_PATH)) return null;
  
  const db = new Database(MASTER_DB_PATH, { readonly: true });
  try {
    const row = db.prepare("SELECT * FROM instances WHERE telegram_id = ?").get(telegramId) as any;
    if (!row) return null;
    return {
      username: row.username,
      displayName: row.display_name,
      telegramId: row.telegram_id,
      mcPort: row.mc_port,
      mcUrl: `http://localhost:${row.mc_port}`,
      dbPath: row.db_path,
      status: row.status,
    };
  } finally {
    db.close();
  }
}

export function getUserByUsername(username: string): UserInstance | null {
  if (!existsSync(MASTER_DB_PATH)) return null;
  
  const db = new Database(MASTER_DB_PATH, { readonly: true });
  try {
    const row = db.prepare("SELECT * FROM instances WHERE username = ?").get(username) as any;
    if (!row) return null;
    return {
      username: row.username,
      displayName: row.display_name,
      telegramId: row.telegram_id,
      mcPort: row.mc_port,
      mcUrl: `http://localhost:${row.mc_port}`,
      dbPath: row.db_path,
      status: row.status,
    };
  } finally {
    db.close();
  }
}

export function getAllUsers(): UserInstance[] {
  if (!existsSync(MASTER_DB_PATH)) return [];
  
  const db = new Database(MASTER_DB_PATH, { readonly: true });
  try {
    const rows = db.prepare("SELECT * FROM instances ORDER BY created_at").all() as any[];
    return rows.map((r) => ({
      username: r.username,
      displayName: r.display_name,
      telegramId: r.telegram_id,
      mcPort: r.mc_port,
      mcUrl: `http://localhost:${r.mc_port}`,
      dbPath: r.db_path,
      status: r.status,
    }));
  } finally {
    db.close();
  }
}

/**
 * Route an API call to the correct user's Mission Control.
 * Returns the full URL to call.
 * 
 * Example:
 *   routeApi("869431594", "/api/deploy-agent") 
 *   → "http://localhost:3002/api/deploy-agent"
 */
export function routeApi(telegramId: string, apiPath: string): string | null {
  const user = getUserByTelegramId(telegramId);
  if (!user) return null;
  return `${user.mcUrl}${apiPath.startsWith("/") ? apiPath : "/" + apiPath}`;
}
