/**
 * Neon Serverless Postgres Database Connection
 * 
 * Provides database access for BukuKas Pro backend.
 * Falls back gracefully if DATABASE_URL is not configured.
 */
import { neon, NeonQueryFunction } from '@neondatabase/serverless';

let sql: NeonQueryFunction<false, false> | null = null;
let dbAvailable = false;

export function initDatabase(): boolean {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn('[DB] DATABASE_URL not configured — using JSON file fallback');
    return false;
  }

  try {
    sql = neon(dbUrl);
    dbAvailable = true;
    console.log('[DB] Neon serverless Postgres connected');
    return true;
  } catch (err) {
    console.warn('[DB] Failed to connect to Neon:', err);
    return false;
  }
}

export function isDbAvailable(): boolean {
  return dbAvailable && sql !== null;
}

export function getSql() {
  return sql;
}

/**
 * Initialize database tables if they don't exist
 */
export async function createTablesIfNotExist(): Promise<void> {
  if (!sql) return;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS server_accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        photo_url TEXT,
        provider TEXT DEFAULT 'password',
        role TEXT DEFAULT 'user',
        plan TEXT DEFAULT 'trial',
        status TEXT,
        registered_self BOOLEAN DEFAULT false,
        created_at TEXT,
        last_login_at TEXT,
        trial_expires_date TEXT,
        paid_expires_date TEXT,
        custom_notes TEXT,
        synced_at TEXT NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS server_messages (
        id TEXT PRIMARY KEY,
        sender_name TEXT NOT NULL,
        sender_email TEXT NOT NULL,
        sender_phone TEXT,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        category TEXT DEFAULT 'inquiry',
        sent_at TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        replied_at TEXT,
        reply_text TEXT,
        ai_suggested_reply TEXT,
        source TEXT DEFAULT 'in-app'
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        token TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        created_at TEXT DEFAULT NOW()::TEXT
      )
    `;

    console.log('[DB] Tables created/verified: server_accounts, server_messages, verification_tokens');
  } catch (err) {
    console.warn('[DB] Table creation error:', err);
  }
}
