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
        referred_by TEXT,
        password_hash TEXT,
        is_active BOOLEAN DEFAULT true,
        synced_at TEXT NOT NULL
      )
    `;

    // Add referred_by column if it doesn't exist (migration)
    try {
      await sql`ALTER TABLE server_accounts ADD COLUMN IF NOT EXISTS referred_by TEXT`;
    } catch (e) { /* column already exists */ }

    // Soft-delete flag: deleted accounts are hidden but kept to prevent re-sync from browser
    try {
      await sql`ALTER TABLE server_accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`;
    } catch (e) { /* column already exists */ }

    // Password column for cross-device login verification
    try {
      await sql`ALTER TABLE server_accounts ADD COLUMN IF NOT EXISTS password_hash TEXT`;
    } catch (e) { /* column already exists */ }

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

    // Financial data sync table — stores per-user financial data (transactions, categories, etc.)
    await sql`
      CREATE TABLE IF NOT EXISTS user_financial_data (
        user_id TEXT PRIMARY KEY,
        financial_data JSONB NOT NULL DEFAULT '{}'::jsonb,
        synced_at TEXT NOT NULL DEFAULT NOW()::TEXT
      )
    `;

    // Referral system — invite links for admin/dev lifetime accounts
    await sql`
      CREATE TABLE IF NOT EXISTS referral_codes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT NOW()::TEXT,
        is_active BOOLEAN DEFAULT true
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY,
        referrer_user_id TEXT NOT NULL,
        referrer_email TEXT NOT NULL,
        referred_email TEXT NOT NULL,
        referred_user_id TEXT,
        referred_name TEXT,
        status TEXT DEFAULT 'pending',
        reward_amount NUMERIC DEFAULT 30000,
        reward_paid BOOLEAN DEFAULT false,
        referred_plan TEXT,
        referred_paid_at TEXT,
        created_at TEXT NOT NULL DEFAULT NOW()::TEXT
      )
    `;

    // Seller applications — users apply to become referral sellers
    await sql`
      CREATE TABLE IF NOT EXISTS seller_applications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_email TEXT NOT NULL,
        user_name TEXT NOT NULL,
        upline_user_id TEXT,
        upline_email TEXT,
        upline_name TEXT,
        status TEXT DEFAULT 'pending',
        reason TEXT,
        admin_notes TEXT,
        reviewed_at TEXT,
        reviewed_by TEXT,
        created_at TEXT NOT NULL DEFAULT NOW()::TEXT
      )
    `;

    console.log('[DB] Tables created/verified: server_accounts, server_messages, verification_tokens, user_financial_data, referral_codes, referrals, seller_applications');
  } catch (err) {
    console.warn('[DB] Table creation error:', err);
  }
}
