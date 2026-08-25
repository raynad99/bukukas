var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);

// src/lib/db.ts
var import_serverless = require("@neondatabase/serverless");
var sql = null;
var dbAvailable = false;
function initDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("[DB] DATABASE_URL not configured \u2014 using JSON file fallback");
    return false;
  }
  try {
    sql = (0, import_serverless.neon)(dbUrl);
    dbAvailable = true;
    console.log("[DB] Neon serverless Postgres connected");
    return true;
  } catch (err) {
    console.warn("[DB] Failed to connect to Neon:", err);
    return false;
  }
}
function isDbAvailable() {
  return dbAvailable && sql !== null;
}
function getSql() {
  return sql;
}
async function createTablesIfNotExist() {
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
    try {
      await sql`ALTER TABLE server_accounts ADD COLUMN IF NOT EXISTS referred_by TEXT`;
    } catch (e) {
    }
    try {
      await sql`ALTER TABLE server_accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`;
    } catch (e) {
    }
    try {
      await sql`ALTER TABLE server_accounts ADD COLUMN IF NOT EXISTS password_hash TEXT`;
    } catch (e) {
    }
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
    await sql`
      CREATE TABLE IF NOT EXISTS user_financial_data (
        user_id TEXT PRIMARY KEY,
        financial_data JSONB NOT NULL DEFAULT '{}'::jsonb,
        synced_at TEXT NOT NULL DEFAULT NOW()::TEXT
      )
    `;
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
    console.log("[DB] Tables created/verified: server_accounts, server_messages, verification_tokens, user_financial_data, referral_codes, referrals, seller_applications");
  } catch (err) {
    console.warn("[DB] Table creation error:", err);
  }
}

// server.ts
var import_resend = require("resend");
import_dotenv.default.config();
import_dotenv.default.config({ path: ".env.local", override: true });
initDatabase();
var RESEND_API_KEY = process.env.RESEND_API_KEY;
var resend = RESEND_API_KEY ? new import_resend.Resend(RESEND_API_KEY) : null;
var EMAIL_FROM = "BukuKas Pro <onboarding@resend.dev>";
var verificationTokens = /* @__PURE__ */ new Map();
function generateVerificationToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
async function sendVerificationEmail(to, token) {
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not configured - skipping email send");
    return false;
  }
  try {
    const verifyUrl = `${process.env.APP_URL || "http://localhost:3000"}/api/auth/verify/${token}`;
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: "Verifikasi Email - BukuKas Pro",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981;">\u{1F510} Verifikasi Email Anda</h2>
          <p>Halo,</p>
          <p>Anda telah mendaftar di <strong>BukuKas Pro</strong>. Klik tombol di bawah untuk memverifikasi email Anda:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">\u2705 Verifikasi Email Saya</a>
          </div>
          <p style="color: #666; font-size: 13px;">Atau salin link ini ke browser: <a href="${verifyUrl}">${verifyUrl}</a></p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">Link ini berlaku selama 15 menit. Jika Anda tidak mendaftar, abaikan email ini.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 11px; text-align: center;">BukuKas Pro - Pembukuan Cerdas untuk UMKM</p>
        </div>
      `
    });
    console.log(`[Email] Verification email sent to ${to}`);
    return true;
  } catch (err) {
    console.error("[Email] Failed to send verification email:", err?.message || err);
    return false;
  }
}
var OX_ALPHA_MODEL = "stealth/ox-alpha";
var OX_ALPHA_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
async function generateWithOxAlpha(options) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const messages = [];
  if (options.systemInstruction) {
    messages.push({ role: "system", content: options.systemInstruction });
  }
  if (typeof options.contents === "string") {
    messages.push({ role: "user", content: options.contents });
  } else if (Array.isArray(options.contents)) {
    for (const item of options.contents) {
      const text = Array.isArray(item?.parts) ? item.parts.map((p) => p?.text || "").join("\n") : String(item?.text || item?.content || "");
      if (!text) continue;
      messages.push({ role: item.role === "model" ? "assistant" : item.role || "user", content: text });
    }
  }
  if (messages.length === 0) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(OX_ALPHA_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "https://bukukas.ai.studio",
          "X-Title": "BukuKas Pro - 0x Alpha Assistant"
        },
        body: JSON.stringify({
          model: OX_ALPHA_MODEL,
          messages,
          temperature: options.temperature ?? 0.7
        })
      });
      if (!res.ok) {
        const retryable = res.status === 429 || res.status >= 500;
        console.warn(`[0x Alpha] HTTP ${res.status} (percobaan ${attempt + 1})`);
        if (retryable && attempt === 0) {
          await sleep(400);
          continue;
        }
        return null;
      }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (typeof text === "string" && text.trim()) {
        return { text: text.trim(), modelUsed: "0x Alpha" };
      }
      return null;
    } catch (err) {
      console.warn(`[0x Alpha] error (percobaan ${attempt + 1}):`, err?.message || err);
      if (attempt === 0) {
        await sleep(400);
        continue;
      }
      return null;
    }
  }
  return null;
}
var DATA_DIR = import_path.default.join(process.cwd(), ".server-data");
var ACCOUNTS_FILE = import_path.default.join(DATA_DIR, "accounts.json");
var MESSAGES_FILE = import_path.default.join(DATA_DIR, "messages.json");
function ensureDataDir() {
  if (!import_fs.default.existsSync(DATA_DIR)) import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
}
function loadJson(filePath, fallback) {
  try {
    ensureDataDir();
    if (import_fs.default.existsSync(filePath)) {
      const raw = import_fs.default.readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`Failed to load ${filePath}:`, err);
  }
  return fallback;
}
function saveJson(filePath, data) {
  try {
    ensureDataDir();
    import_fs.default.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn(`Failed to save ${filePath}:`, err);
  }
}
var _accountsSaveTimer = null;
var _messagesSaveTimer = null;
function scheduleSaveAccounts() {
  if (_accountsSaveTimer) clearTimeout(_accountsSaveTimer);
  _accountsSaveTimer = setTimeout(() => {
    saveJson(ACCOUNTS_FILE, Array.from(inMemoryServerAccounts.values()));
  }, 1e3);
}
function scheduleSaveMessages() {
  if (_messagesSaveTimer) clearTimeout(_messagesSaveTimer);
  _messagesSaveTimer = setTimeout(() => {
    saveJson(MESSAGES_FILE, inMemoryServerMessages);
  }, 1e3);
}
var inMemoryServerAccounts = /* @__PURE__ */ new Map();
if (!isDbAvailable()) {
  const _persistedAccounts = loadJson(ACCOUNTS_FILE, []);
  for (const acct of _persistedAccounts) {
    if (acct?.id && acct?.email) inMemoryServerAccounts.set(acct.id, acct);
  }
  console.log(`[Storage] Loaded ${inMemoryServerAccounts.size} accounts from disk (JSON mode)`);
}
var REFERRAL_FILE = import_path.default.join(DATA_DIR, "referrals.json");
var inMemoryReferralCodes = /* @__PURE__ */ new Map();
var inMemoryReferrals = /* @__PURE__ */ new Map();
function scheduleSaveReferrals() {
  setTimeout(() => {
    saveJson(REFERRAL_FILE, { codes: Array.from(inMemoryReferralCodes.values()), referrals: Array.from(inMemoryReferrals.values()) });
  }, 500);
}
if (!isDbAvailable()) {
  const saved = loadJson(REFERRAL_FILE, {});
  for (const c of saved.codes || []) if (c?.code && c?.id) inMemoryReferralCodes.set(c.id, c);
  for (const r of saved.referrals || []) if (r?.id) inMemoryReferrals.set(r.id, r);
  console.log(`[Storage] Loaded ${inMemoryReferralCodes.size} referral codes from disk (JSON mode)`);
}
function findReferralCodeByOwner(userId, email) {
  const lowerEmail = email ? String(email).toLowerCase() : null;
  for (const c of inMemoryReferralCodes.values()) {
    if (!c.isActive) continue;
    if (c.userId === userId || lowerEmail && c.email === lowerEmail) return c;
  }
  return null;
}
var deletedEmails = /* @__PURE__ */ new Set();
var inMemoryServerMessages = [];
var seedMessages = [
  {
    id: "msg-srv-welcome",
    senderName: "Sistem Pusat BukuKas",
    senderEmail: "admin@bukukas.ai.studio",
    subject: "Selamat Datang di Email Bisnis BukuKas Pro",
    message: "Layanan email bisnis admin@bukukas.ai.studio aktif untuk menerima pesan, permohonan upgrade lisensi Lifetime, dan dukungan teknis developer dari akun email manapun.",
    category: "inquiry",
    sentAt: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false,
    source: "in-app"
  },
  {
    id: "msg-srv-002",
    senderName: "Siti Rahmawati (Gmail Eksternal)",
    senderEmail: "siti.rahma@gmail.com",
    senderPhone: "+62 857-1122-3344",
    subject: "Masa Trial 7 Hari Mau Habis - Ingin Upgrade Lifetime",
    message: "Selamat sore developer BukuKas, saya telah mencoba aplikasi ini dari akun Gmail saya. Mohon info aktivasi Lisensi Lifetime permanen untuk toko saya.",
    category: "license",
    sentAt: new Date(Date.now() - 1e3 * 60 * 45).toISOString(),
    isRead: false,
    source: "gmail-web"
  }
];
if (!isDbAvailable()) {
  const saved = loadJson(MESSAGES_FILE, seedMessages);
  inMemoryServerMessages.push(...saved);
  console.log(`[Storage] Loaded ${inMemoryServerMessages.length} messages from disk (JSON mode)`);
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "10mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "10mb" }));
  if (isDbAvailable()) {
    await createTablesIfNotExist();
    console.log("[DB] Neon Postgres ready for queries");
  }
  app.post("/api/auth/send-verification", async (req, res) => {
    try {
      const { email, name } = req.body;
      if (!email || !email.includes("@")) {
        return res.status(400).json({ success: false, error: "Email tidak valid." });
      }
      if (isDbAvailable()) {
        const sql2 = getSql();
        const existing = await sql2`SELECT id FROM server_accounts WHERE email = ${email.toLowerCase()} LIMIT 1`;
        if (existing.length > 0) {
          return res.json({ success: true, alreadyVerified: true, message: "Email sudah terverifikasi. Silakan masuk." });
        }
      }
      const token = generateVerificationToken();
      verificationTokens.set(token, {
        email: email.toLowerCase(),
        expiresAt: Date.now() + 15 * 60 * 1e3
      });
      for (const [key, val] of verificationTokens) {
        if (val.expiresAt < Date.now()) verificationTokens.delete(key);
      }
      const sent = await sendVerificationEmail(email, token);
      if (!sent) {
        console.warn("[Email] Resend not configured - auto-verifying for dev mode");
        return res.json({ success: true, devMode: true, token, message: "Email terkirim (dev mode - auto verified)." });
      }
      return res.json({ success: true, message: `Email verifikasi telah dikirim ke ${email}. Silakan cek inbox Anda.` });
    } catch (err) {
      console.error("[Auth] Send verification error:", err);
      return res.status(500).json({ success: false, error: err.message || "Gagal mengirim email verifikasi." });
    }
  });
  app.get("/api/auth/verify/:token", (req, res) => {
    try {
      const { token } = req.params;
      const record = verificationTokens.get(token);
      if (!record) {
        return res.send(`<!DOCTYPE html><html><head><title>Verifikasi Gagal</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fef2f2;}.card{background:white;padding:40px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.1);text-align:center;max-width:400px;}.icon{font-size:48px;margin-bottom:16px;}</style></head><body><div class="card"><div class="icon">\u274C</div><h2>Verifikasi Gagal</h2><p>Link verifikasi tidak valid atau sudah kedaluwarsa.</p><p style="color:#666;font-size:14px;">Silakan daftar ulang untuk mendapatkan link baru.</p></div></body></html>`);
      }
      if (record.expiresAt < Date.now()) {
        verificationTokens.delete(token);
        return res.send(`<!DOCTYPE html><html><head><title>Link Kedaluwarsa</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fef2f2;}.card{background:white;padding:40px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.1);text-align:center;max-width:400px;}.icon{font-size:48px;margin-bottom:16px;}</style></head><body><div class="card"><div class="icon">\u23F0</div><h2>Link Kedaluwarsa</h2><p>Link verifikasi sudah tidak berlaku (lewat 15 menit).</p><p style="color:#666;font-size:14px;">Silakan daftar ulang untuk mendapatkan link baru.</p></div></body></html>`);
      }
      verificationTokens.delete(token);
      return res.send(`<!DOCTYPE html><html><head><title>Verifikasi Berhasil</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0fdf4;}.card{background:white;padding:40px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.1);text-align:center;max-width:400px;}.icon{font-size:48px;margin-bottom:16px;}.btn{display:inline-block;margin-top:20px;padding:12px 24px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:bold;}</style></head><body><div class="card"><div class="icon">\u2705</div><h2>Email Terverifikasi!</h2><p>Email <strong>${record.email}</strong> telah berhasil diverifikasi.</p><p style="color:#666;font-size:14px;">Anda sekarang bisa masuk ke akun BukuKas Pro.</p><a class="btn" href="/">Buka BukuKas Pro</a></div></body></html>`);
    } catch (err) {
      return res.status(500).send("Verifikasi error.");
    }
  });
  app.get("/api/auth/check-verification/:email", (req, res) => {
    const email = req.params.email?.toLowerCase();
    if (!email) return res.json({ verified: false });
    for (const [, record] of verificationTokens) {
      if (record.email === email && record.expiresAt > Date.now()) {
        return res.json({ verified: false, pending: true, message: "Menunggu verifikasi - cek email Anda." });
      }
    }
    return res.json({ verified: true, message: "Email terverifikasi." });
  });
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { credential, clientId } = req.body;
      if (!credential) {
        return res.status(400).json({ success: false, error: "Google credential not provided." });
      }
      const parts = credential.split(".");
      if (parts.length !== 3) {
        return res.status(400).json({ success: false, error: "Invalid Google credential format." });
      }
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
      const expectedClientId = process.env.GOOGLE_CLIENT_ID || clientId;
      if (expectedClientId && payload.aud !== expectedClientId) {
        console.warn("[Google SSO] Client ID mismatch:", payload.aud, "expected:", expectedClientId);
        if (process.env.GOOGLE_CLIENT_ID) {
          return res.status(401).json({ success: false, error: "Invalid Google client ID." });
        }
      }
      if (payload.exp && payload.exp * 1e3 < Date.now()) {
        return res.status(401).json({ success: false, error: "Google token expired." });
      }
      const email = payload.email;
      const name = payload.name || payload.given_name || email?.split("@")[0] || "Google User";
      const photoUrl = payload.picture || "";
      const emailVerified = payload.email_verified === true;
      if (!email) {
        return res.status(400).json({ success: false, error: "No email in Google token." });
      }
      console.log(`[Google SSO] Verified login: ${email} (${name})`);
      res.json({
        success: true,
        email,
        name,
        photoUrl,
        emailVerified,
        provider: "google"
      });
    } catch (err) {
      console.error("[Google SSO] Token verification failed:", err?.message);
      res.status(500).json({ success: false, error: "Failed to verify Google token." });
    }
  });
  const inMemoryFinancialData = /* @__PURE__ */ new Map();
  app.get("/api/user-data/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) return res.status(400).json({ error: "userId required" });
      if (isDbAvailable()) {
        const sql2 = getSql();
        const rows = await sql2`SELECT financial_data, synced_at FROM user_financial_data WHERE user_id = ${userId}`;
        if (rows.length > 0) {
          return res.json({ success: true, data: rows[0].financial_data, syncedAt: rows[0].synced_at });
        }
        return res.json({ success: true, data: null });
      }
      const data = inMemoryFinancialData.get(userId);
      return res.json({ success: true, data: data || null });
    } catch (err) {
      console.error("[UserData] GET error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/user-data/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) return res.status(400).json({ error: "userId required" });
      const data = req.body;
      if (!data || typeof data !== "object") {
        return res.status(400).json({ error: "Invalid data" });
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      if (isDbAvailable()) {
        const sql2 = getSql();
        await sql2`
          INSERT INTO user_financial_data (user_id, financial_data, synced_at)
          VALUES (${userId}, ${JSON.stringify(data)}::jsonb, ${now})
          ON CONFLICT (user_id) DO UPDATE SET financial_data = ${JSON.stringify(data)}::jsonb, synced_at = ${now}
        `;
        console.log(`[UserData] Synced financial data for user ${userId} (Neon DB)`);
        return res.json({ success: true, syncedAt: now });
      }
      const existing = inMemoryFinancialData.get(userId) || {};
      const merged = { ...existing, ...data, syncedAt: now };
      inMemoryFinancialData.set(userId, merged);
      console.log(`[UserData] Synced financial data for user ${userId} (in-memory fallback)`);
      return res.json({ success: true, syncedAt: now });
    } catch (err) {
      console.error("[UserData] POST error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/referral/generate", async (req, res) => {
    try {
      const { userId, email } = req.body;
      if (!userId || !email) {
        return res.status(400).json({ success: false, error: "userId and email required" });
      }
      if (isDbAvailable()) {
        const sql2 = getSql();
        const existing = await sql2`SELECT id, code, user_id FROM referral_codes WHERE (user_id = ${userId} OR email = ${String(email).toLowerCase()}) AND is_active = true ORDER BY created_at DESC LIMIT 1`;
        if (existing.length > 0) {
          if (existing[0].user_id !== userId) {
            await sql2`UPDATE referral_codes SET user_id = ${userId} WHERE id = ${existing[0].id}`;
          }
          return res.json({ success: true, code: existing[0].code, isNew: false });
        }
        const code2 = "BK" + Math.random().toString(36).slice(2, 10).toUpperCase();
        const id2 = `ref-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
        await sql2`
          INSERT INTO referral_codes (id, user_id, email, code, created_at, is_active)
          VALUES (${id2}, ${userId}, ${email.toLowerCase()}, ${code2}, ${(/* @__PURE__ */ new Date()).toISOString()}, true)
        `;
        console.log(`[Referral] Generated code ${code2} for ${email}`);
        return res.json({ success: true, code: code2, isNew: true });
      }
      const lowerEmail = String(email).toLowerCase();
      const existingCode = findReferralCodeByOwner(userId, lowerEmail);
      if (existingCode) {
        if (existingCode.userId !== userId) {
          existingCode.userId = userId;
          scheduleSaveReferrals();
        }
        return res.json({ success: true, code: existingCode.code, isNew: false });
      }
      const code = "BK" + Math.random().toString(36).slice(2, 10).toUpperCase();
      const id = `ref-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
      inMemoryReferralCodes.set(id, { id, userId, email: lowerEmail, code, createdAt: (/* @__PURE__ */ new Date()).toISOString(), isActive: true });
      scheduleSaveReferrals();
      console.log(`[Referral] Generated code ${code} for ${lowerEmail} (JSON mode)`);
      return res.json({ success: true, code, isNew: true });
    } catch (err) {
      console.error("[Referral] Generate error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/referral/stats/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) return res.status(400).json({ success: false, error: "userId required" });
      if (isDbAvailable()) {
        const sql2 = getSql();
        const emailParam = typeof req.query.email === "string" ? req.query.email.toLowerCase() : null;
        let ownerId2 = userId;
        if (emailParam) {
          const codeRow0 = await sql2`SELECT id, user_id FROM referral_codes WHERE (user_id = ${userId} OR email = ${emailParam}) AND is_active = true ORDER BY created_at DESC LIMIT 1`;
          if (codeRow0.length > 0 && codeRow0[0].user_id !== userId) {
            const staleId = codeRow0[0].user_id;
            await sql2`UPDATE referral_codes SET user_id = ${userId} WHERE id = ${codeRow0[0].id}`;
            await sql2`UPDATE referrals SET referrer_user_id = ${userId} WHERE referrer_user_id = ${staleId}`;
          }
        }
        const referrals = await sql2`SELECT * FROM referrals WHERE referrer_user_id = ${ownerId2} ORDER BY created_at DESC`;
        const codeQuery = emailParam ? sql2`SELECT code FROM referral_codes WHERE (user_id = ${ownerId2} OR email = ${emailParam}) AND is_active = true ORDER BY created_at DESC LIMIT 1` : sql2`SELECT code FROM referral_codes WHERE user_id = ${ownerId2} AND is_active = true LIMIT 1`;
        const codeRow = await codeQuery;
        const totalReward = await sql2`SELECT COALESCE(SUM(reward_amount), 0)::int as total FROM referrals WHERE referrer_user_id = ${ownerId2} AND reward_paid = true`;
        const pendingReward = await sql2`SELECT COALESCE(SUM(reward_amount), 0)::int as total FROM referrals WHERE referrer_user_id = ${ownerId2} AND reward_paid = false AND status = 'converted'`;
        return res.json({
          success: true,
          code: codeRow[0]?.code || null,
          totalReferrals: referrals.length,
          convertedReferrals: referrals.filter((r) => r.status === "converted").length,
          totalRewardEarned: totalReward[0]?.total ?? 0,
          pendingReward: pendingReward[0]?.total ?? 0,
          referrals: referrals.map((r) => ({
            id: r.id,
            referredEmail: r.referred_email,
            referredName: r.referred_name,
            status: r.status,
            rewardAmount: r.reward_amount,
            rewardPaid: r.reward_paid,
            referredPlan: r.referred_plan,
            createdAt: r.created_at
          }))
        });
      }
      const lowerEmail = typeof req.query.email === "string" ? req.query.email.toLowerCase() : null;
      const owned = findReferralCodeByOwner(userId, lowerEmail);
      if (owned && owned.userId !== userId) owned.userId = userId;
      const ownerId = owned ? owned.userId : userId;
      const myRefs = Array.from(inMemoryReferrals.values()).filter((r) => r.referrerUserId === ownerId);
      scheduleSaveReferrals();
      return res.json({
        success: true,
        code: owned?.code || null,
        totalReferrals: myRefs.length,
        convertedReferrals: myRefs.filter((r) => r.status === "converted").length,
        totalRewardEarned: myRefs.filter((r) => r.rewardPaid).reduce((s, r) => s + (r.rewardAmount || 0), 0),
        pendingReward: myRefs.filter((r) => !r.rewardPaid && r.status === "converted").reduce((s, r) => s + (r.rewardAmount || 0), 0),
        referrals: myRefs.map((r) => ({
          id: r.id,
          referredEmail: r.referredEmail,
          referredName: r.referredName,
          status: r.status,
          rewardAmount: r.rewardAmount,
          rewardPaid: r.rewardPaid,
          referredPlan: r.referredPlan || null,
          createdAt: r.createdAt
        }))
      });
    } catch (err) {
      console.error("[Referral] Stats error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/referral/track", async (req, res) => {
    try {
      const { code, referredEmail, referredName, referredUserId } = req.body;
      if (!code || !referredEmail) {
        return res.status(400).json({ success: false, error: "code and referredEmail required" });
      }
      if (isDbAvailable()) {
        const sql2 = getSql();
        const codeRow = await sql2`SELECT * FROM referral_codes WHERE code = ${code.toUpperCase()} AND is_active = true LIMIT 1`;
        if (codeRow.length === 0) {
          return res.status(404).json({ success: false, error: "Kode undangan tidak valid." });
        }
        const referrer = codeRow[0];
        const id = `ref-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
        const existing = await sql2`SELECT id FROM referrals WHERE referred_email = ${referredEmail.toLowerCase()} LIMIT 1`;
        if (existing.length > 0) {
          return res.json({ success: true, message: "Already referred" });
        }
        await sql2`
          INSERT INTO referrals (id, referrer_user_id, referrer_email, referred_email, referred_user_id, referred_name, status, created_at)
          VALUES (${id}, ${referrer.user_id}, ${referrer.email}, ${referredEmail.toLowerCase()}, ${referredUserId || null}, ${referredName || null}, 'registered', ${(/* @__PURE__ */ new Date()).toISOString()})
        `;
        console.log(`[Referral] ${referredEmail} registered via code ${code} from ${referrer.email}`);
        return res.json({ success: true, referrerName: referrer.email });
      }
      const codeRec = Array.from(inMemoryReferralCodes.values()).find((c) => c.code === String(code).toUpperCase() && c.isActive);
      if (!codeRec) return res.status(404).json({ success: false, error: "Kode undangan tidak valid." });
      const lowerReferred = String(referredEmail).toLowerCase();
      if (Array.from(inMemoryReferrals.values()).some((r) => r.referredEmail === lowerReferred)) {
        return res.json({ success: true, message: "Already referred" });
      }
      inMemoryReferrals.set(`ref-${Date.now()}`, {
        id: `ref-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
        referrerUserId: codeRec.userId,
        referrerEmail: codeRec.email,
        referredEmail: lowerReferred,
        referredUserId: referredUserId || null,
        referredName: referredName || null,
        status: "registered",
        rewardAmount: 3e4,
        rewardPaid: false,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      scheduleSaveReferrals();
      console.log(`[Referral] ${lowerReferred} registered via code ${code} from ${codeRec.email} (JSON mode)`);
      return res.json({ success: true, referrerName: codeRec.email });
    } catch (err) {
      console.error("[Referral] Track error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/referral/resolve/:code", async (req, res) => {
    try {
      const { code } = req.params;
      if (!code) return res.status(400).json({ success: false, error: "code required" });
      const upperCode = code.toUpperCase();
      if (isDbAvailable()) {
        const sql2 = getSql();
        const rows = await sql2`
          SELECT rc.user_id, rc.email, rc.code, sa.name
          FROM referral_codes rc
          LEFT JOIN server_accounts sa ON sa.email = rc.email
          WHERE rc.code = ${upperCode} AND rc.is_active = true
          LIMIT 1
        `;
        if (rows.length > 0) {
          return res.json({ success: true, referrerName: rows[0].name || rows[0].email, referrerEmail: rows[0].email });
        }
      }
      for (const c of inMemoryReferralCodes.values()) {
        if (c.code === upperCode && c.isActive) {
          return res.json({ success: true, referrerName: c.email, referrerEmail: c.email });
        }
      }
      return res.json({ success: false, error: "Referral code not found" });
    } catch (err) {
      console.error("[Referral] Resolve error:", err?.message);
      return res.status(500).json({ success: false, error: "Server error" });
    }
  });
  app.post("/api/referral/convert", async (req, res) => {
    try {
      const { referredEmail } = req.body;
      if (!referredEmail) {
        return res.status(400).json({ success: false, error: "referredEmail required" });
      }
      if (isDbAvailable()) {
        const sql2 = getSql();
        await sql2`
          UPDATE referrals SET status = 'converted', referred_plan = 'paid', referred_paid_at = ${(/* @__PURE__ */ new Date()).toISOString()}
          WHERE referred_email = ${referredEmail.toLowerCase()} AND status = 'registered'
        `;
        console.log(`[Referral] ${referredEmail} converted to paid plan`);
        return res.json({ success: true });
      }
      let converted = false;
      for (const r of inMemoryReferrals.values()) {
        if (r.referredEmail === String(referredEmail).toLowerCase() && r.status === "registered") {
          r.status = "converted";
          r.referredPlan = "paid";
          converted = true;
        }
      }
      if (converted) scheduleSaveReferrals();
      return res.json({ success: true });
    } catch (err) {
      console.error("[Referral] Convert error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/commission/summary/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const emailParam = typeof req.query.email === "string" ? req.query.email.toLowerCase() : null;
      if (!userId) return res.status(400).json({ success: false, error: "userId required" });
      const COMMISSION_PER_CONVERSION = 3e4;
      if (isDbAvailable()) {
        const sql2 = getSql();
        let ownerId2 = userId;
        if (emailParam) {
          const codeRow = await sql2`SELECT user_id FROM referral_codes WHERE (user_id = ${userId} OR email = ${emailParam}) AND is_active = true LIMIT 1`;
          if (codeRow.length > 0) ownerId2 = codeRow[0].user_id;
        }
        const referrals = await sql2`SELECT * FROM referrals WHERE referrer_user_id = ${ownerId2} ORDER BY created_at DESC`;
        const converted2 = referrals.filter((r) => r.status === "converted");
        const pending2 = referrals.filter((r) => r.status === "registered");
        return res.json({
          success: true,
          totalReferrals: referrals.length,
          convertedCount: converted2.length,
          pendingCount: pending2.length,
          commissionPerConversion: COMMISSION_PER_CONVERSION,
          totalCommission: converted2.length * COMMISSION_PER_CONVERSION,
          paidCommission: referrals.filter((r) => r.reward_paid).reduce((s, r) => s + (r.reward_amount || COMMISSION_PER_CONVERSION), 0),
          unpaidCommission: converted2.filter((r) => !r.reward_paid).reduce((s, r) => s + (r.reward_amount || COMMISSION_PER_CONVERSION), 0),
          referrals: referrals.map((r) => ({
            id: r.id,
            referredEmail: r.referred_email,
            referredName: r.referred_name,
            status: r.status,
            referredPlan: r.referred_plan,
            commission: r.status === "converted" ? COMMISSION_PER_CONVERSION : 0,
            paid: r.reward_paid,
            createdAt: r.created_at
          }))
        });
      }
      const lowerEmail = emailParam;
      const owned = findReferralCodeByOwner(userId, lowerEmail);
      const ownerId = owned ? owned.userId : userId;
      const refs = Array.from(inMemoryReferrals.values()).filter((r) => r.referrerUserId === ownerId);
      const converted = refs.filter((r) => r.status === "converted");
      const pending = refs.filter((r) => r.status === "registered");
      return res.json({
        success: true,
        totalReferrals: refs.length,
        convertedCount: converted.length,
        pendingCount: pending.length,
        commissionPerConversion: COMMISSION_PER_CONVERSION,
        totalCommission: converted.length * COMMISSION_PER_CONVERSION,
        paidCommission: refs.filter((r) => r.rewardPaid).reduce((s, r) => s + (r.rewardAmount || COMMISSION_PER_CONVERSION), 0),
        unpaidCommission: converted.filter((r) => !r.rewardPaid).reduce((s, r) => s + (r.rewardAmount || COMMISSION_PER_CONVERSION), 0),
        referrals: refs.map((r) => ({
          id: r.id,
          referredEmail: r.referredEmail,
          referredName: r.referredName,
          status: r.status,
          referredPlan: r.referredPlan || null,
          commission: r.status === "converted" ? COMMISSION_PER_CONVERSION : 0,
          paid: r.rewardPaid,
          createdAt: r.createdAt
        }))
      });
    } catch (err) {
      console.error("[Commission] Summary error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/seller/apply", async (req, res) => {
    try {
      const { userId, email, name, uplineUserId, uplineEmail, uplineName, reason } = req.body;
      if (!userId || !email || !name) {
        return res.status(400).json({ success: false, error: "userId, email, and name required" });
      }
      if (isDbAvailable()) {
        const sql2 = getSql();
        const existing = await sql2`SELECT id, status FROM seller_applications WHERE user_id = ${userId} AND status IN ('pending', 'approved') LIMIT 1`;
        if (existing.length > 0) {
          return res.json({ success: true, status: existing[0].status, message: "Anda sudah mengajukan sebelumnya." });
        }
        const id = `seller-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
        await sql2`
          INSERT INTO seller_applications (id, user_id, user_email, user_name, upline_user_id, upline_email, upline_name, status, reason, created_at)
          VALUES (${id}, ${userId}, ${email.toLowerCase()}, ${name}, ${uplineUserId || null}, ${uplineEmail || null}, ${uplineName || null}, 'pending', ${reason || null}, ${(/* @__PURE__ */ new Date()).toISOString()})
        `;
        console.log(`[Seller] Application submitted by ${email} (upline: ${uplineEmail || "none"})`);
        return res.json({ success: true, status: "pending", message: "Pengajuan seller berhasil dikirim. Menunggu persetujuan admin." });
      }
      return res.json({ success: true, status: "pending", message: "Pengajuan seller berhasil (mode offline)." });
    } catch (err) {
      console.error("[Seller] Apply error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/seller/applications", async (req, res) => {
    try {
      if (isDbAvailable()) {
        const sql2 = getSql();
        const rows = await sql2`SELECT * FROM seller_applications ORDER BY created_at DESC`;
        const applications = rows.map((r) => ({
          id: r.id,
          userId: r.user_id,
          userEmail: r.user_email,
          userName: r.user_name,
          uplineUserId: r.upline_user_id,
          uplineEmail: r.upline_email,
          uplineName: r.upline_name,
          status: r.status,
          reason: r.reason,
          adminNotes: r.admin_notes,
          reviewedAt: r.reviewed_at,
          reviewedBy: r.reviewed_by,
          createdAt: r.created_at
        }));
        return res.json({ success: true, total: applications.length, applications });
      }
      return res.json({ success: true, total: 0, applications: [] });
    } catch (err) {
      console.error("[Seller] List error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/seller/review", async (req, res) => {
    try {
      const { applicationId, action, adminNotes, adminUserId } = req.body;
      if (!applicationId || !action) {
        return res.status(400).json({ success: false, error: "applicationId and action required" });
      }
      if (!["approved", "rejected"].includes(action)) {
        return res.status(400).json({ success: false, error: "action must be approved or rejected" });
      }
      if (isDbAvailable()) {
        const sql2 = getSql();
        const appRow = await sql2`SELECT * FROM seller_applications WHERE id = ${applicationId} LIMIT 1`;
        if (appRow.length === 0) {
          return res.status(404).json({ success: false, error: "Pengajuan tidak ditemukan." });
        }
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await sql2`
          UPDATE seller_applications SET status = ${action}, admin_notes = ${adminNotes || null}, reviewed_at = ${now}, reviewed_by = ${adminUserId || null}
          WHERE id = ${applicationId}
        `;
        if (action === "approved") {
          const applicant = appRow[0];
          await sql2`
            UPDATE server_accounts SET plan = 'lifetime', status = 'active'
            WHERE id = ${applicant.user_id}
          `;
          const code = "BK" + Math.random().toString(36).slice(2, 10).toUpperCase();
          const refId = `ref-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
          try {
            await sql2`
              INSERT INTO referral_codes (id, user_id, email, code, created_at, is_active)
              VALUES (${refId}, ${applicant.user_id}, ${applicant.user_email}, ${code}, ${now}, true)
              ON CONFLICT (id) DO NOTHING
            `;
          } catch (e) {
          }
          console.log(`[Seller] ${applicant.user_email} approved \u2192 lifetime + referral code ${code}`);
          return res.json({ success: true, action, referralCode: code, message: `${applicant.user_name} berhasil di-upgrade ke Lifetime VIP + mendapat kode referral.` });
        }
        console.log(`[Seller] Application ${applicationId} ${action}`);
        return res.json({ success: true, action, message: `Pengajuan ${action === "approved" ? "disetujui" : "ditolak"}.` });
      }
      return res.json({ success: true, action });
    } catch (err) {
      console.error("[Seller] Review error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/seller/status/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) return res.status(400).json({ success: false, error: "userId required" });
      if (isDbAvailable()) {
        const sql2 = getSql();
        const rows = await sql2`SELECT * FROM seller_applications WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 1`;
        if (rows.length === 0) {
          return res.json({ success: true, hasApplied: false });
        }
        const r = rows[0];
        return res.json({
          success: true,
          hasApplied: true,
          status: r.status,
          adminNotes: r.admin_notes,
          reviewedAt: r.reviewed_at,
          createdAt: r.created_at
        });
      }
      return res.json({ success: true, hasApplied: false });
    } catch (err) {
      console.error("[Seller] Status error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "BukuKas Pro Business Mail & Backend API",
      businessEmail: "admin@bukukas.ai.studio",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      activeServerMessagesCount: inMemoryServerMessages.length,
      capabilities: ["inbound-email-receiver", "gmail-dispatcher", "license-manager", "rates-proxy", "ox-alpha-chat", "email-verification"],
      alphaKeyConfigured: !!process.env.OPENROUTER_API_KEY,
      emailConfigured: !!resend,
      database: isDbAvailable() ? "neon-postgres" : "json-file"
    });
  });
  app.get("/api/accounts", async (req, res) => {
    try {
      if (isDbAvailable()) {
        const sql2 = getSql();
        const rows = await sql2`SELECT * FROM server_accounts WHERE is_active IS DISTINCT FROM false ORDER BY synced_at DESC`;
        const accounts2 = rows.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          photoUrl: r.photo_url,
          provider: r.provider,
          role: r.role,
          plan: r.plan,
          status: r.status,
          registeredSelf: r.registered_self,
          createdAt: r.created_at,
          lastLoginAt: r.last_login_at,
          trialExpiresDate: r.trial_expires_date,
          paidExpiresDate: r.paid_expires_date,
          customNotes: r.custom_notes,
          referredBy: r.referred_by,
          syncedAt: r.synced_at,
          password: r.password_hash || null
        }));
        return res.json({ success: true, total: accounts2.length, accounts: accounts2 });
      }
      const accounts = Array.from(inMemoryServerAccounts.values()).sort(
        (a, b) => new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime()
      );
      res.json({ success: true, total: accounts.length, accounts });
    } catch (err) {
      console.error("[DB] GET /api/accounts error:", err);
      const accounts = Array.from(inMemoryServerAccounts.values());
      res.json({ success: true, total: accounts.length, accounts });
    }
  });
  app.post("/api/accounts/create", async (req, res) => {
    try {
      const { name, email, password, role, plan, photoUrl, status, registeredSelf, customNotes, referredBy } = req.body;
      if (!name || !email) {
        return res.status(400).json({ success: false, error: "name and email required" });
      }
      const id = `usr-srv-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1e3)}`;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      if (isDbAvailable()) {
        const sql2 = getSql();
        await sql2`
          INSERT INTO server_accounts (id, name, email, photo_url, provider, role, plan, status, registered_self, created_at, last_login_at, custom_notes, referred_by, password_hash, synced_at)
          VALUES (${id}, ${name}, ${email.toLowerCase()}, ${photoUrl || null}, ${"password"}, ${role || "user"}, ${plan || "lifetime"}, ${status || "active"}, ${registeredSelf ?? false}, ${now}, ${now}, ${customNotes || null}, ${referredBy || null}, ${password || null}, ${now})
          ON CONFLICT (email) DO UPDATE SET
            name = ${name}, plan = ${plan || "lifetime"}, role = ${role || "user"},
            status = ${status || "active"}, custom_notes = ${customNotes || null},
            password_hash = COALESCE(${password || null}, server_accounts.password_hash),
            synced_at = ${now}
        `;
        console.log(`[DB] Account created: ${name} (${email}) [${id}]`);
        return res.json({ success: true, id, message: `Akun ${name} berhasil dibuat.` });
      }
      const record = {
        id,
        name,
        email: email.toLowerCase(),
        photoUrl: photoUrl || void 0,
        provider: "password",
        role: role || "user",
        plan: plan || "lifetime",
        status: status || "active",
        registeredSelf: registeredSelf ?? false,
        createdAt: now,
        lastLoginAt: now,
        customNotes,
        syncedAt: now,
        password: password || null
      };
      inMemoryServerAccounts.set(id, record);
      res.json({ success: true, id, message: `Akun ${name} berhasil dibuat.` });
    } catch (err) {
      console.error("[DB] POST /api/accounts/create error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/accounts/delete", async (req, res) => {
    const PROTECTED_EMAILS = ["admin@bukukas.ai.studio", "indoclickshop@gmail.com"];
    try {
      const { email, userId } = req.body;
      if (!email && !userId) {
        return res.status(400).json({ success: false, error: "email or userId required" });
      }
      const targetEmail = email ? String(email).toLowerCase() : null;
      if (targetEmail && PROTECTED_EMAILS.includes(targetEmail)) {
        return res.status(403).json({ success: false, error: "Akun admin/dev dilindungi dan tidak dapat dihapus." });
      }
      let deleted = 0;
      if (isDbAvailable()) {
        const sql2 = getSql();
        if (targetEmail) {
          const rows = await sql2`DELETE FROM server_accounts WHERE email = ${targetEmail} RETURNING id`;
          deleted += rows.length;
        } else if (userId) {
          const rows = await sql2`DELETE FROM server_accounts WHERE id = ${userId} RETURNING id`;
          deleted += rows.length;
        }
        if (targetEmail) {
          await sql2`DELETE FROM referral_codes WHERE email = ${targetEmail}`;
          await sql2`DELETE FROM referrals WHERE referrer_email = ${targetEmail} OR referred_email = ${targetEmail}`;
        }
        if (userId) {
          await sql2`DELETE FROM referral_codes WHERE user_id = ${userId}`;
          await sql2`DELETE FROM referrals WHERE referrer_user_id = ${userId}`;
        }
        if (targetEmail) {
          await sql2`DELETE FROM server_accounts WHERE email = ${targetEmail}`;
        } else if (userId) {
          await sql2`DELETE FROM server_accounts WHERE id = ${userId}`;
        }
      } else {
        for (const [key, acc] of inMemoryServerAccounts.entries()) {
          if (targetEmail && acc.email === targetEmail || userId && acc.id === userId) {
            inMemoryServerAccounts.delete(key);
            deleted++;
          }
        }
        scheduleSaveAccounts();
        for (const [key, c] of inMemoryReferralCodes.entries()) {
          if (targetEmail && c.email === targetEmail || userId && c.userId === userId) inMemoryReferralCodes.delete(key);
        }
        for (const [key, r] of inMemoryReferrals.entries()) {
          if (targetEmail && (r.referrerEmail === targetEmail || r.referredEmail === targetEmail) || userId && r.referrerUserId === userId) {
            inMemoryReferrals.delete(key);
          }
        }
        scheduleSaveReferrals();
      }
      if (targetEmail) deletedEmails.add(targetEmail);
      console.log(`[DB] Account delete requested for ${targetEmail || userId} \u2014 removed ${deleted} account(s) [blocklisted]`);
      return res.json({ success: true, deleted, message: `${deleted} akun dihapus beserta data referral terkait.` });
    } catch (err) {
      console.error("[DB] POST /api/accounts/delete error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.delete("/api/accounts/cleanup", async (req, res) => {
    const PROTECTED_EMAILS = ["admin@bukukas.ai.studio", "indoclickshop@gmail.com"];
    try {
      if (isDbAvailable()) {
        const sql2 = getSql();
        const countResult = await sql2`SELECT COUNT(*)::int as cnt FROM server_accounts WHERE email NOT IN ('admin@bukukas.ai.studio', 'indoclickshop@gmail.com')`;
        const count = countResult[0]?.cnt ?? 0;
        if (count > 0) {
          await sql2`DELETE FROM server_accounts WHERE email NOT IN ('admin@bukukas.ai.studio', 'indoclickshop@gmail.com')`;
        }
        console.log(`[DB] Cleanup: deleted ${count} non-admin accounts`);
        return res.json({ success: true, deleted: count, message: `${count} akun sampah dihapus. Hanya akun admin/dev yang tersisa.` });
      }
      let deleted = 0;
      for (const [key, acc] of inMemoryServerAccounts.entries()) {
        if (!PROTECTED_EMAILS.includes(acc.email)) {
          inMemoryServerAccounts.delete(key);
          deleted++;
        }
      }
      res.json({ success: true, deleted, message: `${deleted} akun sampah dihapus.` });
    } catch (err) {
      console.error("[DB] Cleanup error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.delete("/api/business-email/cleanup", async (req, res) => {
    try {
      if (isDbAvailable()) {
        const sql2 = getSql();
        const countResult = await sql2`SELECT COUNT(*)::int as cnt FROM server_messages WHERE sender_email LIKE '%@backtest.dev' OR sender_email LIKE '%@eksternal.id' OR sender_email LIKE '%@test%'`;
        const count = countResult[0]?.cnt ?? 0;
        if (count > 0) {
          await sql2`DELETE FROM server_messages WHERE sender_email LIKE '%@backtest.dev' OR sender_email LIKE '%@eksternal.id' OR sender_email LIKE '%@test%'`;
        }
        const remaining = await sql2`SELECT COUNT(*)::int as cnt FROM server_messages`;
        console.log(`[DB] Email cleanup: deleted ${count} junk messages, ${remaining[0]?.cnt ?? 0} remaining`);
        return res.json({ success: true, deleted: count, remaining: remaining[0]?.cnt ?? 0 });
      }
      let deleted = 0;
      for (let i = inMemoryServerMessages.length - 1; i >= 0; i--) {
        const email = inMemoryServerMessages[i].senderEmail;
        if (email.includes("@backtest.dev") || email.includes("@eksternal.id") || email.includes("@test")) {
          inMemoryServerMessages.splice(i, 1);
          deleted++;
        }
      }
      res.json({ success: true, deleted, remaining: inMemoryServerMessages.length });
    } catch (err) {
      console.error("[DB] Email cleanup error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/accounts/upsert", async (req, res) => {
    try {
      const incoming = req.body?.accounts || (req.body?.account ? [req.body.account] : []);
      if (!Array.isArray(incoming) || incoming.length === 0) {
        return res.status(400).json({ error: "Field 'account' or 'accounts' array is required." });
      }
      const filtered = incoming.filter((raw) => {
        const email = String(raw?.email || "").toLowerCase();
        if (email.includes("@test.dev") || email.includes("@backtest.dev") || email.includes("@bukukas-test.dev") || email.includes("stress-user") || email.includes("tes-isolasi") || email.includes("isolasi-") || email.includes("tes@") || email.includes("persist-") || email.includes("e2e-test") || email.includes("neon-test") || email.includes("test-sync") || email.includes("test.klien") || email.includes("test.seller")) {
          return false;
        }
        if (deletedEmails.has(email)) {
          return false;
        }
        return true;
      });
      if (filtered.length === 0) {
        return res.json({ success: true, upserted: 0, total: 0, message: "No non-test accounts to sync." });
      }
      let upserted = 0;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      if (isDbAvailable()) {
        const sql2 = getSql();
        for (const raw of filtered) {
          if (!raw?.id || !raw?.email) continue;
          const email = String(raw.email).toLowerCase();
          const customNotes = typeof raw.customNotes === "string" && !raw.customNotes.toLowerCase().includes("password") ? String(raw.customNotes) : void 0;
          await sql2`
            INSERT INTO server_accounts (id, name, email, photo_url, provider, role, plan, status, registered_self, created_at, last_login_at, trial_expires_date, paid_expires_date, custom_notes, referred_by, password_hash, synced_at)
            VALUES (${String(raw.id)}, ${String(raw.name || email.split("@")[0])}, ${email}, ${raw.photoUrl ? String(raw.photoUrl) : null}, ${String(raw.provider || "password")}, ${String(raw.role || "user")}, ${String(raw.plan || "trial")}, ${raw.status ? String(raw.status) : null}, ${Boolean(raw.registeredSelf)}, ${String(raw.createdAt || now)}, ${String(raw.lastLoginAt || "-")}, ${raw.trialExpiresDate ? String(raw.trialExpiresDate) : null}, ${raw.paidExpiresDate ? String(raw.paidExpiresDate) : null}, ${customNotes || null}, ${raw.referredBy ? String(raw.referredBy) : null}, ${raw.password ? String(raw.password) : null}, ${now})
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, photo_url = EXCLUDED.photo_url, provider = EXCLUDED.provider, role = EXCLUDED.role, plan = EXCLUDED.plan, status = EXCLUDED.status, registered_self = EXCLUDED.registered_self, created_at = EXCLUDED.created_at, last_login_at = EXCLUDED.last_login_at, trial_expires_date = EXCLUDED.trial_expires_date, paid_expires_date = EXCLUDED.paid_expires_date, custom_notes = EXCLUDED.custom_notes, referred_by = COALESCE(EXCLUDED.referred_by, server_accounts.referred_by), password_hash = COALESCE(EXCLUDED.password_hash, server_accounts.password_hash), synced_at = EXCLUDED.synced_at
          `;
          upserted += 1;
        }
        return res.json({ success: true, upserted, total: upserted });
      }
      for (const raw of filtered) {
        if (!raw?.id || !raw?.email) continue;
        inMemoryServerAccounts.set(String(raw.id), {
          id: String(raw.id),
          name: String(raw.name || raw.email.split("@")[0]),
          email: String(raw.email).toLowerCase(),
          photoUrl: raw.photoUrl ? String(raw.photoUrl) : void 0,
          provider: String(raw.provider || "password"),
          role: String(raw.role || "user"),
          plan: String(raw.plan || "trial"),
          status: raw.status ? String(raw.status) : void 0,
          registeredSelf: Boolean(raw.registeredSelf),
          createdAt: String(raw.createdAt || now),
          lastLoginAt: String(raw.lastLoginAt || "-"),
          trialExpiresDate: raw.trialExpiresDate ? String(raw.trialExpiresDate) : void 0,
          paidExpiresDate: raw.paidExpiresDate ? String(raw.paidExpiresDate) : void 0,
          customNotes: typeof raw.customNotes === "string" && !raw.customNotes.toLowerCase().includes("password") ? String(raw.customNotes) : void 0,
          syncedAt: now
        });
        upserted += 1;
      }
      scheduleSaveAccounts();
      return res.json({
        success: true,
        upserted,
        total: inMemoryServerAccounts.size
      });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Account registry error" });
    }
  });
  app.get("/api/business-email/messages", async (req, res) => {
    try {
      if (isDbAvailable()) {
        const sql2 = getSql();
        const rows = await sql2`SELECT * FROM server_messages ORDER BY sent_at DESC`;
        const messages = rows.map((r) => ({
          id: r.id,
          senderName: r.sender_name,
          senderEmail: r.sender_email,
          senderPhone: r.sender_phone,
          subject: r.subject,
          message: r.message,
          category: r.category,
          sentAt: r.sent_at,
          isRead: r.is_read,
          repliedAt: r.replied_at,
          replyText: r.reply_text,
          aiSuggestedReply: r.ai_suggested_reply,
          source: r.source
        }));
        return res.json({ success: true, businessEmail: "admin@bukukas.ai.studio", total: messages.length, messages });
      }
      res.json({
        success: true,
        businessEmail: "admin@bukukas.ai.studio",
        total: inMemoryServerMessages.length,
        messages: inMemoryServerMessages
      });
    } catch (err) {
      console.error("[DB] GET /api/business-email/messages error:", err);
      res.json({ success: true, businessEmail: "admin@bukukas.ai.studio", total: inMemoryServerMessages.length, messages: inMemoryServerMessages });
    }
  });
  async function generateAiReply(senderName, senderEmail, subject, message, category) {
    if (!process.env.OPENROUTER_API_KEY) return "";
    try {
      const prompt = `Anda adalah Asisten Developer Resmi BukuKas Pro (email bisnis: admin@bukukas.ai.studio).
Pesan baru masuk dari pengguna:
- Nama Pengirim: ${senderName}
- Email Pengirim: ${senderEmail}
- Kategori: ${category}
- Subjek: ${subject}
- Isi Pesan: ${message}

Buatlah draf balasan resmi yang ramah, sopan, profesional, dan ringkas dalam Bahasa Indonesia (maksimal 2-3 paragraf). Berikan penjelasan bahwa pesan telah masuk ke Kotak Masuk Pengembang dan akan segera ditindaklanjuti. Jika meminta Lisensi Lifetime atau info Trial, sebutkan bahwa Pengembang dapat mengaktifkan lisensi VIP Lifetime secara langsung di sistem.`;
      const aiResult = await Promise.race([
        generateWithOxAlpha({ contents: prompt }),
        new Promise((resolve) => setTimeout(() => resolve(null), 12e3))
      ]);
      return aiResult?.text || "";
    } catch (aiErr) {
      console.warn("AI suggestion generation error (non-fatal):", aiErr);
      return "";
    }
  }
  app.post("/api/business-email/send", async (req, res) => {
    try {
      const { senderName, senderEmail, senderPhone, subject, message, category, source } = req.body;
      if (!senderName || !senderEmail || !subject || !message) {
        return res.status(400).json({
          error: "Field senderName, senderEmail, subject, and message are required."
        });
      }
      const newMsgId = `msg-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
      const aiSuggestedReply = await generateAiReply(
        String(senderName),
        String(senderEmail),
        String(subject),
        String(message),
        category || "inquiry"
      );
      const serverMsg = {
        id: newMsgId,
        senderName: String(senderName),
        senderEmail: String(senderEmail),
        senderPhone: senderPhone ? String(senderPhone) : void 0,
        subject: String(subject),
        message: String(message),
        category: category || "inquiry",
        sentAt: (/* @__PURE__ */ new Date()).toISOString(),
        isRead: false,
        aiSuggestedReply: aiSuggestedReply || void 0,
        source: source || "in-app"
      };
      if (isDbAvailable()) {
        const sql2 = getSql();
        await sql2`
          INSERT INTO server_messages (id, sender_name, sender_email, sender_phone, subject, message, category, sent_at, is_read, ai_suggested_reply, source)
          VALUES (${serverMsg.id}, ${serverMsg.senderName}, ${serverMsg.senderEmail}, ${serverMsg.senderPhone || null}, ${serverMsg.subject}, ${serverMsg.message}, ${serverMsg.category}, ${serverMsg.sentAt}, ${false}, ${serverMsg.aiSuggestedReply || null}, ${serverMsg.source || "in-app"})
        `;
      } else {
        inMemoryServerMessages.unshift(serverMsg);
        scheduleSaveMessages();
      }
      return res.json({
        success: true,
        message: "Pesan berhasil diterima di server email admin@bukukas.ai.studio",
        data: serverMsg
      });
    } catch (err) {
      console.error("Error processing business email:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });
  app.post(["/api/inbound-email", "/api/business-email/receive", "/api/business-email/webhook"], async (req, res) => {
    try {
      const payload = req.body || {};
      const senderEmail = payload.from || payload.sender || payload.senderEmail || payload.email || "external-user@gmail.com";
      const senderName = payload.from_name || payload.senderName || payload.name || senderEmail.split("@")[0];
      const subject = payload.subject || payload.title || "Pesan Masuk dari Email Eksternal";
      const message = payload.text || payload.body || payload.message || payload.html || "(Pesan kosong)";
      const senderPhone = payload.phone || payload.senderPhone || void 0;
      const category = payload.category || (subject.toLowerCase().includes("lifetime") ? "license" : "inquiry");
      const newMsgId = `inbound-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
      const aiSuggestedReply = await generateAiReply(senderName, senderEmail, subject, message, category);
      const serverMsg = {
        id: newMsgId,
        senderName: String(senderName),
        senderEmail: String(senderEmail),
        senderPhone: senderPhone ? String(senderPhone) : void 0,
        subject: String(subject),
        message: String(message),
        category,
        sentAt: (/* @__PURE__ */ new Date()).toISOString(),
        isRead: false,
        aiSuggestedReply: aiSuggestedReply || void 0,
        source: "inbound-webhook"
      };
      if (isDbAvailable()) {
        const sql2 = getSql();
        await sql2`
          INSERT INTO server_messages (id, sender_name, sender_email, sender_phone, subject, message, category, sent_at, is_read, ai_suggested_reply, source)
          VALUES (${serverMsg.id}, ${serverMsg.senderName}, ${serverMsg.senderEmail}, ${serverMsg.senderPhone || null}, ${serverMsg.subject}, ${serverMsg.message}, ${serverMsg.category}, ${serverMsg.sentAt}, ${false}, ${serverMsg.aiSuggestedReply || null}, ${serverMsg.source || "inbound-webhook"})
        `;
      } else {
        inMemoryServerMessages.unshift(serverMsg);
        scheduleSaveMessages();
      }
      return res.json({
        success: true,
        status: "delivered",
        recipient: "admin@bukukas.ai.studio",
        message: "Email berhasil diterima dan disimpan di Kotak Masuk admin@bukukas.ai.studio",
        data: serverMsg
      });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Inbound receiver error" });
    }
  });
  app.post("/api/business-email/reply", async (req, res) => {
    try {
      const { messageId, replyText } = req.body;
      if (!messageId || !replyText) {
        return res.status(400).json({ error: "messageId and replyText are required." });
      }
      if (isDbAvailable()) {
        const sql2 = getSql();
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await sql2`
          UPDATE server_messages SET reply_text = ${replyText}, replied_at = ${now}, is_read = true
          WHERE id = ${messageId}
        `;
        return res.json({ success: true, message: "Balasan berhasil dikirim dari admin@bukukas.ai.studio" });
      }
      const msg = inMemoryServerMessages.find((m) => m.id === messageId);
      if (msg) {
        msg.replyText = replyText;
        msg.repliedAt = (/* @__PURE__ */ new Date()).toISOString();
        msg.isRead = true;
        scheduleSaveMessages();
      }
      return res.json({
        success: true,
        message: "Balasan berhasil dikirim dari admin@bukukas.ai.studio",
        data: msg
      });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });
  app.delete("/api/business-email/:id", async (req, res) => {
    const { id } = req.params;
    if (isDbAvailable()) {
      const sql2 = getSql();
      await sql2`DELETE FROM server_messages WHERE id = ${id}`;
    } else {
      const idx = inMemoryServerMessages.findIndex((m) => m.id === id);
      if (idx !== -1) {
        inMemoryServerMessages.splice(idx, 1);
        scheduleSaveMessages();
      }
    }
    return res.json({ success: true, message: "Pesan dihapus dari server." });
  });
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history = [], financialContext } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Pesan tidak boleh kosong." });
      }
      const ls = financialContext?.loansSummary || {};
      const payablesListStr = Array.isArray(ls.activePayablesList) && ls.activePayablesList.length > 0 ? ls.activePayablesList.map(
        (p, i) => `  ${i + 1}. ${p.person} (${p.title}): Pokok ${p.amount} | Sisa Wajib Dibayar: ${p.remainingAmount} | Terbayar: ${p.paidAmount} | Status: ${p.status} | Jatuh Tempo: ${p.dueDate} | Kontak: ${p.contactPhone || "-"}`
      ).join("\n") : "  (Tidak ada hutang aktif)";
      const receivablesListStr = Array.isArray(ls.activeReceivablesList) && ls.activeReceivablesList.length > 0 ? ls.activeReceivablesList.map(
        (r, i) => `  ${i + 1}. ${r.person} (${r.title}): Pokok ${r.amount} | Sisa Belum Ditagih/Diterima: ${r.remainingAmount} | Diterima: ${r.paidAmount} | Status: ${r.status} | Jatuh Tempo: ${r.dueDate} | Kontak: ${r.contactPhone || "-"}`
      ).join("\n") : "  (Tidak ada piutang aktif)";
      const settledListStr = Array.isArray(ls.settledLoansList) && ls.settledLoansList.length > 0 ? ls.settledLoansList.map(
        (s, i) => `  ${i + 1}. [${s.type}] ${s.person} - ${s.title}: ${s.amount} (${s.status})`
      ).join("\n") : "  (Belum ada riwayat pelunasan)";
      let contextDescription = "";
      if (financialContext) {
        contextDescription = `
KONTEKS FINANSIAL REAL-TIME PENGGUNA BUKUKAS PRO:
- Nama Pengguna: ${financialContext.userName || "Pengguna BukuKas Pro"}
- Mata Uang Utama: ${financialContext.currency || "IDR"}
- Total Saldo di Seluruh Rekening: ${financialContext.totalBalance || "0"}
- Pemasukan Bulan Ini: ${financialContext.monthlyIncome || "0"}
- Pengeluaran Bulan Ini: ${financialContext.monthlyExpense || "0"}
- Tabungan Bersih: ${financialContext.netSavings || "0"} (${financialContext.savingsRate || 0}% rasio tabungan)
- Tagihan Rutin Belum Lunas: ${financialContext.unpaidBillsCount || 0} tagihan
${Array.isArray(financialContext.unpaidBillsList) && financialContext.unpaidBillsList.length > 0 ? `- Daftar Tagihan Belum Lunas (urut jatuh tempo):
${financialContext.unpaidBillsList.map((b) => `   * ${b.title}: ${b.amount} | Jatuh tempo ${b.dueDate}${b.isOverdue ? " (TERLAMBAT)" : ""}`).join("\n")}` : "- Semua tagihan sudah lunas"}
${Array.isArray(financialContext.topExpenseCategories) && financialContext.topExpenseCategories.length > 0 ? `- Breakdown Pengeluaran per Kategori (bulan ini):
${financialContext.topExpenseCategories.map((c) => `   * ${c.name}: ${c.amount} (${c.percent}%)`).join("\n")}` : ""}

RINGKASAN MODUL HUTANG & PIUTANG (LIABILITIES & ASSETS):
1. PIUTANG (RECEIVABLES / UANG PENGGUNA YANG DIPINJAM ORANG LAIN / HAK TAGIH):
   - Total Pokok Piutang: ${ls.totalReceivables || "0"}
   - Total Sudah Diterima/Dicicil: ${ls.paidReceivables || "0"}
   - Sisa Saldo Piutang yang Belum Ditagih/Diterima: ${ls.remainingReceivables || "0"}
   - Jumlah Debitur/Peminjam Aktif: ${ls.activeReceivablesCount || 0} orang/entitas
   - Rincian Daftar Piutang Aktif:
${receivablesListStr}

2. HUTANG (PAYABLES / KEWAJIBAN PENGGUNA KEPADA PIHAK LAIN):
   - Total Pokok Hutang: ${ls.totalPayables || "0"}
   - Total Sudah Dilunasi/Dicicil: ${ls.paidPayables || "0"}
   - Sisa Saldo Hutang yang Wajib Dibayar: ${ls.remainingPayables || "0"}
   - Jumlah Kreditor/Hutang Aktif: ${ls.activePayablesCount || 0} entitas
   - Rincian Daftar Hutang Aktif:
${payablesListStr}

3. POSISI BERSIH PINJAMAN & STATUS PELUNASAN:
   - Posisi Bersih (Sisa Piutang - Sisa Hutang): ${ls.netLoanPosition || "0"}
   - Pinjaman Melewati Jatuh Tempo (Overdue): ${ls.overdueLoansCount || 0}
   - Riwayat Lunas (100%):
${settledListStr}
`;
      }
      const systemInstruction = `Anda adalah "0x Alpha \u2014 Asisten Keuangan BukuKas Pro" \u2014 konsultan keuangan dan penasihat pembukuan cerdas pribadi & UMKM resmi dari aplikasi BukuKas Pro.
Karakter Anda:
- Sangat ramah, bijak, solutif, analitis, akurat secara angka, dan profesional.
- Ahli dalam manajemen arus kas, pencatatan Hutang & Piutang (Liabilities & Assets), rumus budgeting (50/30/20, amplop, zero-based), pemantauan tagihan, dan konversi multi-mata uang.
- ATURAN KHUSUS HUTANG & PIUTANG:
  * "Piutang" (Receivables) = Uang milik pengguna yang dipinjam oleh orang/pihak lain (Hak tagih). Jika ditanya "total piutang", sebutkan total sisa piutang yang belum diterima (${ls.remainingReceivables || "0"}), rincikan nama-nama peminjamnya, nominal pokok, sisa saldo, dan tanggal jatuh temponya dengan rapi dan jelas.
  * "Hutang" (Payables) = Kewajiban uang yang dipinjam pengguna dari pihak lain. Jika ditanya "total hutang", sebutkan total sisa hutang yang wajib dibayar (${ls.remainingPayables || "0"}), rincikan nama pemberi pinjaman/bank, pokok, sisa saldo, dan jatuh temponya.
  * Tampilkan angka dan nama secara presisi sesuai data real-time pada konteks tanpa mengarang.
- Format teks menggunakan Markdown yang rapi (bold, bullet points, emoji yang proporsional).
${contextDescription}`;
      const formattedContents = [];
      if (Array.isArray(history)) {
        history.slice(-10).forEach((item) => {
          if (item.role && item.text) {
            formattedContents.push({
              role: item.role === "user" ? "user" : "model",
              parts: [{ text: String(item.text) }]
            });
          }
        });
      }
      formattedContents.push({
        role: "user",
        parts: [{ text: String(message) }]
      });
      let generatedResult = req.body.useLocalEngine ? null : await generateWithOxAlpha({
        contents: formattedContents,
        systemInstruction,
        temperature: 0.7
      });
      if (generatedResult && generatedResult.text) {
        return res.json({
          success: true,
          reply: generatedResult.text,
          model: generatedResult.modelUsed
        });
      }
      const lowerQuery = message.toLowerCase();
      let fallbackReply = "";
      if (/^(halo|hai|hi|hei|hey|assalam|pagi|siang|sore|malam)[\s!,.?]*$/.test(lowerQuery) || lowerQuery.includes("apa kabar") || lowerQuery.includes("terima kasih") || lowerQuery.includes("makasih") || lowerQuery === "thanks") {
        fallbackReply = `Halo ${financialContext?.userName || "Kak"}! \u{1F44B} Saya **Asisten Keuangan BukuKas** dan siap membantu Anda kapan saja.

Beberapa hal yang bisa langsung Anda tanyakan:
- \u{1F9FE} _"Tagihan apa saja yang belum dibayar?"_
- \u{1F4B0} _"Total piutang saya?"_
- \u{1F4B3} _"Status hutang & cicilan?"_
- \u2B07\uFE0F _"Berapa pengeluaran bulan ini?"_ | \u2B06\uFE0F _"Pemasukan bulan ini?"_
- \u{1F4CA} _"Analisis keuangan saya"_ | \u{1F4A1} _"Strategi budgeting"_ | \u{1F4B1} _"Tips valas"_`;
      } else if (lowerQuery.includes("tagihan") || lowerQuery.includes("bill") && !lowerQuery.includes("hutang") || lowerQuery.includes("listrik") || lowerQuery.includes("internet") || lowerQuery.includes("langganan") || lowerQuery.includes("iuran")) {
        const unpaidBills = Array.isArray(financialContext?.unpaidBillsList) ? financialContext.unpaidBillsList : [];
        const billsMd = unpaidBills.length > 0 ? unpaidBills.map(
          (b, i) => `${i + 1}. **${b.title}** \u2014 **${b.amount}** | Jatuh tempo: **${b.dueDate}**${b.isOverdue ? " \u26A0\uFE0F *TERLAMBAT*" : ""} (${b.recurrence})`
        ).join("\n") : "_Semua tagihan sudah lunas! \u{1F389} Tidak ada yang perlu dibayar._";
        const hasOverdue = unpaidBills.some((b) => b.isOverdue);
        fallbackReply = `### \u{1F9FE} Tagihan Belum Lunas (${unpaidBills.length})

${billsMd}

\u{1F4A1} ${hasOverdue ? "**Ada tagihan terlambat** \u2014 segera bayar untuk menghindari denda!" : "Semua masih dalam batas waktu. Aktifkan auto-debit di menu Tagihan agar tidak terlewat."}`;
      } else if (lowerQuery.includes("pengeluaran") || lowerQuery.includes("pengeluar") || lowerQuery.includes("belanja") || lowerQuery.includes("expense") || lowerQuery.includes("laporan") && !lowerQuery.includes("pemasukan")) {
        const cats = Array.isArray(financialContext?.topExpenseCategories) ? financialContext.topExpenseCategories : [];
        const catMd = cats.length > 0 ? cats.map((c) => `- **${c.name}**: ${c.amount} (${c.percent}% dari total)`).join("\n") : "_Belum ada pengeluaran tercatat bulan ini._";
        fallbackReply = `### \u2B07\uFE0F Pengeluaran Bulan Ini

- **Total**: **${financialContext?.monthlyExpense || "Rp 0"}**
- Dibanding pemasukan: ${financialContext?.monthlyIncome || "Rp 0"} \u2192 arus kas bersih **${financialContext?.netSavings || "Rp 0"}** (rasio tabungan ${financialContext?.savingsRate || 0}%)

#### \u{1F4C2} Breakdown Kategori Terbesar:
${catMd}

\u{1F4A1} ${cats.length > 0 ? `Kategori terbesar adalah **${cats[0].name}** (${cats[0].percent}%). Jika ingin hemat, mulai review dari sini.` : "Mulai catat transaksi Anda agar analisis makin akurat."}`;
      } else if (lowerQuery.includes("pemasukan") || lowerQuery.includes("pendapatan") || lowerQuery.includes("income") || lowerQuery.includes("gaji") || lowerQuery.includes("uang masuk")) {
        fallbackReply = `### \u2B06\uFE0F Pemasukan Bulan Ini

- **Total**: **${financialContext?.monthlyIncome || "Rp 0"}**
- Pengeluaran: ${financialContext?.monthlyExpense || "Rp 0"} \u2192 surplus/defisit **${financialContext?.netSavings || "Rp 0"}**
- Rasio tabungan: **${financialContext?.savingsRate || 0}%** ${(financialContext?.savingsRate || 0) >= 20 ? "\u{1F7E2} (sudah sehat)" : (financialContext?.savingsRate || 0) >= 5 ? "\u{1F7E1} (cukup)" : "\u{1F534} (perlu ditingkatkan)"}

\u{1F4A1} Idealnya sisihkan minimal 20% pemasukan untuk tabungan/dana darurat.`;
      } else if (lowerQuery.includes("saldo") || lowerQuery.includes("balance") || lowerQuery.includes("kekayaan") || lowerQuery.includes("total uang") || lowerQuery.includes("uang saya")) {
        fallbackReply = `### \u{1F4BC} Saldo & Kekayaan Anda

- **Total Saldo Seluruh Rekening**: **${financialContext?.totalBalance || "Rp 0"}**
- \u2B06\uFE0F Masuk bulan ini: ${financialContext?.monthlyIncome || "Rp 0"} | \u2B07\uFE0F Keluar: ${financialContext?.monthlyExpense || "Rp 0"}
- \u2696\uFE0F Ditambah sisa piutang ${ls.remainingReceivables || "Rp 0"}, dikurangi sisa hutang ${ls.remainingPayables || "Rp 0"}

\u{1F4A1} Pastikan ada dana darurat minimal 3\u20136\xD7 pengeluaran bulanan (${financialContext?.monthlyExpense || "Rp 0"}).`;
      } else if (lowerQuery.includes("piutang") || lowerQuery.includes("receivable") || lowerQuery.includes("siapa yang pinjam") || lowerQuery.includes("siapa yang ngutang") || lowerQuery.includes("orang pinjam") || lowerQuery.includes("dipinjam") || lowerQuery.includes("hak tagih") || lowerQuery.includes("uang di luar")) {
        const activeReceivables = Array.isArray(ls.activeReceivablesList) ? ls.activeReceivablesList : [];
        let listMarkdown = "";
        if (activeReceivables.length > 0) {
          listMarkdown = activeReceivables.map(
            (r, idx) => `${idx + 1}. **${r.person}** \u2014 *${r.title}*
   - **Sisa Belum Diterima**: \`${r.remainingAmount}\` (dari total pokok ${r.amount})
   - **Sudah Masuk**: ${r.paidAmount}
   - **Status**: ${r.status}
   - **Jatuh Tempo**: ${r.dueDate}
   - **Kontak**: ${r.contactPhone || "-"}`
          ).join("\n\n");
        } else {
          listMarkdown = "_Tidak ada piutang aktif saat ini. Semua piutang telah lunas! \u{1F389}_";
        }
        fallbackReply = `### \u{1F4B0} Ringkasan & Total Piutang Anda (Hak Tagih)

Berikut adalah status lengkap piutang uang Anda yang dipinjam oleh pihak lain:

- **Total Sisa Piutang yang Belum Ditagih/Diterima**: **${ls.remainingReceivables || "Rp 0"}**
- **Total Pokok Piutang**: ${ls.totalReceivables || "Rp 0"}
- **Total yang Sudah Diterima/Dicicil**: ${ls.paidReceivables || "Rp 0"}
- **Jumlah Peminjam (Debitur) Aktif**: ${ls.activeReceivablesCount || 0} orang/entitas

---

#### \u{1F4CB} Rincian Peminjam & Jadwal Jatuh Tempo:
${listMarkdown}

\u{1F4A1} **Tips Penagihan**: Anda dapat menggunakan fitur **Kirim Pengingat WhatsApp** langsung dari menu **Hutang & Piutang** untuk mengingatkan peminjam secara sopan dan profesional sebelum jatuh tempo tiba.`;
      } else if (lowerQuery.includes("hutang") || lowerQuery.includes("utang") || lowerQuery.includes("payable") || lowerQuery.includes("kewajiban") || lowerQuery.includes("cicilan") || lowerQuery.includes("bayar hutang")) {
        const activePayables = Array.isArray(ls.activePayablesList) ? ls.activePayablesList : [];
        let listMarkdown = "";
        if (activePayables.length > 0) {
          listMarkdown = activePayables.map(
            (p, idx) => `${idx + 1}. **${p.person}** \u2014 *${p.title}*
   - **Sisa Wajib Dibayar**: \`${p.remainingAmount}\` (dari total pokok ${p.amount})
   - **Sudah Dilunasi/Dicicil**: ${p.paidAmount}
   - **Status**: ${p.status}
   - **Jatuh Tempo**: ${p.dueDate}`
          ).join("\n\n");
        } else {
          listMarkdown = "_Alhamdulillah, Anda tidak memiliki hutang aktif saat ini! \u{1F389}_";
        }
        fallbackReply = `### \u{1F4B3} Ringkasan & Total Kewajiban Hutang Anda

Berikut adalah status seluruh pinjaman yang wajib Anda lunasi:

- **Total Sisa Saldo Hutang Wajib Dibayar**: **${ls.remainingPayables || "Rp 0"}**
- **Total Pokok Pinjaman**: ${ls.totalPayables || "Rp 0"}
- **Total yang Sudah Dicicil**: ${ls.paidPayables || "Rp 0"}
- **Jumlah Pinjaman Aktif**: ${ls.activePayablesCount || 0} pinjaman

---

#### \u{1F4CB} Rincian Hutang & Jadwal Jatuh Tempo:
${listMarkdown}

\u{1F4A1} **Strategi Pelunasan**: Prioritaskan melunasi pinjaman dengan jatuh tempo terdekat atau nominal terkecil lebih dahulu (*Metode Snowball*) untuk meringankan beban cashflow bulanan.`;
      } else if (lowerQuery.includes("pinjaman") || lowerQuery.includes("posisi bersih") || lowerQuery.includes("rekap pinjaman") || lowerQuery.includes("debitur") || lowerQuery.includes("kreditor")) {
        fallbackReply = `### \u2696\uFE0F Ikhtisar Portofolio Hutang & Piutang

Berikut adalah perbandingan posisi kewajiban vs hak tagih Anda:

- \u{1F4B0} **Sisa Piutang (Uang Anda di Luar)**: **${ls.remainingReceivables || "Rp 0"}** (${ls.activeReceivablesCount || 0} debitur)
- \u{1F4B3} **Sisa Hutang (Kewajiban Anda)**: **${ls.remainingPayables || "Rp 0"}** (${ls.activePayablesCount || 0} pinjaman)
- \u{1F4CA} **Posisi Bersih (Net Loan Position)**: **${ls.netLoanPosition || "Rp 0"}**

${Number(ls.overdueLoansCount || 0) > 0 ? `\u26A0\uFE0F **Perhatian**: Terdapat ${ls.overdueLoansCount} catatan pinjaman yang telah melewati jatuh tempo!` : "\u2705 Tidak ada pinjaman yang jatuh tempo terlambat."}

Buka menu **Hutang & Piutang** di navigasi untuk mencatat pembayaran parsial, pelunasan penuh, atau menambah data pinjaman baru.`;
      } else if (lowerQuery.includes("valas") || lowerQuery.includes("kurs") || lowerQuery.includes("mata uang") || lowerQuery.includes("multicurrency") || lowerQuery.includes("multi-currency") || lowerQuery.includes("konversi") || /\b(idr|nzd|usd|sgd|aud|eur|gbp|jpy|myr|hkd|twd|krw)\b/.test(lowerQuery)) {
        fallbackReply = `### \u{1F4B1} Strategi Pembukuan Multi-Mata Uang (IDR, NZD, USD, TWD, HKD, SGD)

1. **Satukan Laporan dalam 1 Mata Uang Utama**: Pilih satu mata uang pelaporan (saat ini: **${financialContext?.currency || "IDR"}**) agar arus kas mudah dibaca \u2014 BukuKas Pro mengonversi otomatis dengan kurs live real-time.
2. **Catat di Mata Uang Aslinya**: Setiap transaksi valas dicatat sesuai nominal aslinya (NZD untuk gaji NZ, SGD untuk belanja Singapura, dst.), biarkan sistem yang mengonversi ke ${financialContext?.currency || "IDR"}.
3. **Pantau Fluktuasi Kurs**: Sebelum pembayaran besar lintas negara atau konversi nominal besar, periksa tab **Kurs Valas** di menu atas untuk melihat selisih nilai tukar harian dan pilih waktu terbaik.
4. **Pisahkan Rekening per Mata Uang**: Simpan dana di rekening mata uang masing-masing untuk meminimalkan biaya konversi ganda.
5. **Evaluasi Posisi Valas Berkala**: Total saldo lintas rekening Anda saat ini setara **${financialContext?.totalBalance || "Rp 0"}** \u2014 pantau apakah konsentrasi valas sesuai toleransi risiko Anda.`;
      } else if (lowerQuery.includes("50/30/20") || lowerQuery.includes("budget") || lowerQuery.includes("anggaran") || lowerQuery.includes("hemat") || lowerQuery.includes("strategi")) {
        fallbackReply = `### \u{1F4A1} Panduan Budgeting 50/30/20 untuk Keuangan Anda

Berdasarkan data keuangan Anda (${financialContext?.totalBalance ? `Total Saldo: ${financialContext.totalBalance}` : "Bulan Ini"}):

1. **50% Kebutuhan Pokok (Needs)**
   - Prioritaskan sewa/tempat tinggal, listrik/air, belanja dapur, dan tagihan wajib (${financialContext?.unpaidBillsCount || 0} tagihan aktif).
2. **30% Keinginan (Wants)**
   - Alokasikan untuk hiburan, makan di luar, belanja gaya hidup, dan langganan digital.
3. **20% Tabungan, Hutang & Investasi (Savings & Debt)**
   - Saat ini rasio tabungan Anda berada di kisaran **${financialContext?.savingsRate || 0}%** (Tabungan Bersih: ${financialContext?.netSavings || "Rp 0"}).
   - Alokasikan sebagian porsi 20% ini untuk mempercepat pembayaran sisa hutang Anda (${ls.remainingPayables || "Rp 0"}).`;
      } else if (lowerQuery.includes("analisis") || lowerQuery.includes("kesehatan") || lowerQuery.includes("evaluasi")) {
        fallbackReply = `### \u{1F4CA} Analisis Kesehatan Finansial & Arus Kas

Berikut adalah evaluasi ringkas catatan finansial Anda:
- **Total Saldo Seluruh Rekening**: ${financialContext?.totalBalance || "-"}
- **Pemasukan Bulan Ini**: ${financialContext?.monthlyIncome || "-"}
- **Pengeluaran Bulan Ini**: ${financialContext?.monthlyExpense || "-"}
- **Surplus / Tabungan Bersih**: ${financialContext?.netSavings || "-"} (${financialContext?.savingsRate || 0}%)
- **Status Tagihan Rutin**: ${financialContext?.unpaidBillsCount ? `${financialContext.unpaidBillsCount} tagihan belum lunas` : "Semua tagihan lunas! \u{1F389}"}
- **Hak Piutang di Luar**: ${ls.remainingReceivables || "Rp 0"}
- **Kewajiban Hutang**: ${ls.remainingPayables || "Rp 0"}

**Rekomendasi:**
1. Pertahankan rasio tabungan di atas 20% untuk memperkuat dana darurat.
2. Segera follow up penagihan sisa piutang ${ls.remainingReceivables || "Rp 0"} kepada peminjam agar arus kas masuk lebih cepat.
3. Alokasikan surplus bulanan untuk mengangsur sisa hutang ${ls.remainingPayables || "Rp 0"} sebelum jatuh tempo.`;
      } else {
        fallbackReply = `Halo ${financialContext?.userName || "Kak"}! \u{1F44B}

Terima kasih atas pertanyaannya. Sebagai asisten pembukuan cerdas BukuKas Pro, berikut beberapa hal yang dapat saya bantu:
- \u{1F4B0} **Cek Total Piutang**: Mengetahui sisa piutang Anda (**${ls.remainingReceivables || "Rp 0"}**), daftar debitur, dan jatuh tempo.
- \u{1F4B3} **Cek Status Hutang**: Rekap sisa kewajiban hutang (**${ls.remainingPayables || "Rp 0"}**) dan rencana cicilan.
- \u{1F4CA} **Analisis Arus Kas**: Evaluasi rasio tabungan (${financialContext?.savingsRate || 0}%) dan pola pengeluaran.
- \u{1F4A1} **Rekomendasi Budgeting**: Alokasi anggaran 50/30/20 dan strategi cashflow.
- \u{1F4C5} **Manajemen Tagihan**: Pemantauan ${financialContext?.unpaidBillsCount || 0} tagihan belum dibayar.

Silakan pilih atau ketikkan pertanyaan finansial yang ingin Anda ketahui!`;
      }
      return res.json({
        success: true,
        reply: fallbackReply,
        model: "0x Alpha (Analisis Lokal)"
      });
    } catch (err) {
      console.error("AI Chatbot Fallback Handled:", err);
      return res.json({
        success: true,
        reply: "Halo! Saya siap membantu Anda menganalisis keuangan, hutang, piutang, dan perencanaan anggaran. Silakan ketikkan pertanyaan finansial Anda.",
        model: "0x Alpha (Analisis Lokal)"
      });
    }
  });
  app.get("/api/exchange-rates", async (req, res) => {
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/IDR");
      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      }
      throw new Error("External rate API failed");
    } catch (err) {
      res.json({
        result: "success",
        base_code: "IDR",
        rates: {
          IDR: 1,
          USD: 62e-6,
          EUR: 58e-6,
          JPY: 94e-4,
          SGD: 84e-6,
          MYR: 28e-5,
          GBP: 5e-5,
          AUD: 96e-6
        }
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BukuKas Pro server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
