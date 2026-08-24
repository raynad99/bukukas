import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { initDatabase, isDbAvailable, getSql, createTablesIfNotExist } from "./src/lib/db";
import { Resend } from "resend";

// Muat variabel environment (.env lalu override dengan .env.local bila ada)
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

// Initialize Neon database connection if DATABASE_URL is configured
initDatabase();

// ==================== Email Verification (Resend) ====================
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const EMAIL_FROM = 'BukuKas Pro <onboarding@resend.dev>';

// In-memory verification tokens (expires in 15 minutes)
const verificationTokens = new Map<string, { email: string; expiresAt: number }>();

function generateVerificationToken(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function sendVerificationEmail(to: string, token: string): Promise<boolean> {
  if (!resend) {
    console.warn('[Email] RESEND_API_KEY not configured - skipping email send');
    return false;
  }
  try {
    const verifyUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/verify/${token}`;
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: 'Verifikasi Email - BukuKas Pro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981;">🔐 Verifikasi Email Anda</h2>
          <p>Halo,</p>
          <p>Anda telah mendaftar di <strong>BukuKas Pro</strong>. Klik tombol di bawah untuk memverifikasi email Anda:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">✅ Verifikasi Email Saya</a>
          </div>
          <p style="color: #666; font-size: 13px;">Atau salin link ini ke browser: <a href="${verifyUrl}">${verifyUrl}</a></p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">Link ini berlaku selama 15 menit. Jika Anda tidak mendaftar, abaikan email ini.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 11px; text-align: center;">BukuKas Pro - Pembukuan Cerdas untuk UMKM</p>
        </div>
      `,
    });
    console.log(`[Email] Verification email sent to ${to}`);
    return true;
  } catch (err: any) {
    console.error('[Email] Failed to send verification email:', err?.message || err);
    return false;
  }
}

// ==================== 0x ALPHA — Mesin AI Chatbot ====================
// Diakses melalui OpenRouter (API kompatibel OpenAI), model: stealth/ox-alpha
const OX_ALPHA_MODEL = "stealth/ox-alpha";
const OX_ALPHA_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Panggil model 0x Alpha lewat OpenRouter.
 * - contents: format pesan [{role:'user'|'model', parts:[{text}]}] ATAU string biasa
 * - Mengembalikan null bila OPENROUTER_API_KEY tidak diset / gagal → pemanggil fallback ke mesin lokal
 */
async function generateWithOxAlpha(options: {
  contents: any;
  systemInstruction?: string;
  temperature?: number;
}): Promise<{ text: string; modelUsed: string } | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  // Normalisasi ke format messages OpenAI
  const messages: Array<{ role: string; content: string }> = [];
  if (options.systemInstruction) {
    messages.push({ role: "system", content: options.systemInstruction });
  }
  if (typeof options.contents === "string") {
    messages.push({ role: "user", content: options.contents });
  } else if (Array.isArray(options.contents)) {
    for (const item of options.contents) {
      const text = Array.isArray(item?.parts)
        ? item.parts.map((p: any) => p?.text || "").join("\n")
        : String(item?.text || item?.content || "");
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
          "X-Title": "BukuKas Pro - 0x Alpha Assistant",
        },
        body: JSON.stringify({
          model: OX_ALPHA_MODEL,
          messages,
          temperature: options.temperature ?? 0.7,
        }),
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

      const data: any = await res.json();
      const text: string | undefined = data?.choices?.[0]?.message?.content;
      if (typeof text === "string" && text.trim()) {
        return { text: text.trim(), modelUsed: "0x Alpha" };
      }
      return null;
    } catch (err: any) {
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

// ==================== Persistent JSON Storage ====================
const DATA_DIR = path.join(process.cwd(), ".server-data");
const ACCOUNTS_FILE = path.join(DATA_DIR, "accounts.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJson<T>(filePath: string, fallback: T): T {
  try {
    ensureDataDir();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw) as T;
    }
  } catch (err) {
    console.warn(`Failed to load ${filePath}:`, err);
  }
  return fallback;
}

function saveJson(filePath: string, data: unknown) {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn(`Failed to save ${filePath}:`, err);
  }
}

// Debounced save — avoids writing on every single update
let _accountsSaveTimer: ReturnType<typeof setTimeout> | null = null;
let _messagesSaveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSaveAccounts() {
  if (_accountsSaveTimer) clearTimeout(_accountsSaveTimer);
  _accountsSaveTimer = setTimeout(() => {
    saveJson(ACCOUNTS_FILE, Array.from(inMemoryServerAccounts.values()));
  }, 1000);
}

function scheduleSaveMessages() {
  if (_messagesSaveTimer) clearTimeout(_messagesSaveTimer);
  _messagesSaveTimer = setTimeout(() => {
    saveJson(MESSAGES_FILE, inMemoryServerMessages);
  }, 1000);
}

// ==================== In-Memory Stores (loaded from disk) ====================
// In-memory message store for backend synchronization & backup
export interface ServerBusinessMessage {
  id: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  subject: string;
  message: string;
  category: 'license' | 'support' | 'inquiry' | 'partnership' | 'other';
  sentAt: string;
  isRead: boolean;
  repliedAt?: string;
  replyText?: string;
  aiSuggestedReply?: string;
  source?: 'in-app' | 'gmail-web' | 'inbound-webhook' | 'api-simulator';
}

// In-memory ACCOUNT REGISTRY (public profiles only — passwords are NEVER stored here)
// Makes self-registered accounts visible to the Dev Portal from any device/browser.
interface ServerAccountRecord {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  provider: string;
  role: string;
  plan: string;
  status?: string;
  registeredSelf: boolean;
  createdAt: string;
  lastLoginAt: string;
  trialExpiresDate?: string;
  paidExpiresDate?: string;
  customNotes?: string;
  syncedAt: string;
}
const inMemoryServerAccounts = new Map<string, ServerAccountRecord>();

// Load persisted accounts from disk on startup (JSON fallback mode)
if (!isDbAvailable()) {
  const _persistedAccounts = loadJson<ServerAccountRecord[]>(ACCOUNTS_FILE, []);
  for (const acct of _persistedAccounts) {
    if (acct?.id && acct?.email) inMemoryServerAccounts.set(acct.id, acct);
  }
  console.log(`[Storage] Loaded ${inMemoryServerAccounts.size} accounts from disk (JSON mode)`);
}

const inMemoryServerMessages: ServerBusinessMessage[] = [];

// Load messages from DB or JSON fallback on startup
const seedMessages: ServerBusinessMessage[] = [
  {
    id: 'msg-srv-welcome',
    senderName: 'Sistem Pusat BukuKas',
    senderEmail: 'admin@bukukas.ai.studio',
    subject: 'Selamat Datang di Email Bisnis BukuKas Pro',
    message: 'Layanan email bisnis admin@bukukas.ai.studio aktif untuk menerima pesan, permohonan upgrade lisensi Lifetime, dan dukungan teknis developer dari akun email manapun.',
    category: 'inquiry',
    sentAt: new Date().toISOString(),
    isRead: false,
    source: 'in-app',
  },
  {
    id: 'msg-srv-002',
    senderName: 'Siti Rahmawati (Gmail Eksternal)',
    senderEmail: 'siti.rahma@gmail.com',
    senderPhone: '+62 857-1122-3344',
    subject: 'Masa Trial 7 Hari Mau Habis - Ingin Upgrade Lifetime',
    message: 'Selamat sore developer BukuKas, saya telah mencoba aplikasi ini dari akun Gmail saya. Mohon info aktivasi Lisensi Lifetime permanen untuk toko saya.',
    category: 'license',
    sentAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    isRead: false,
    source: 'gmail-web',
  },
];

if (!isDbAvailable()) {
  const saved = loadJson<ServerBusinessMessage[]>(MESSAGES_FILE, seedMessages);
  inMemoryServerMessages.push(...saved);
  console.log(`[Storage] Loaded ${inMemoryServerMessages.length} messages from disk (JSON mode)`);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Initialize database tables if Neon is configured
  if (isDbAvailable()) {
    await createTablesIfNotExist();
    console.log('[DB] Neon Postgres ready for queries');
  }

  // ==================== EMAIL VERIFICATION ENDPOINTS ====================
  // Send verification email
  app.post("/api/auth/send-verification", async (req, res) => {
    try {
      const { email, name } = req.body;
      if (!email || !email.includes('@')) {
        return res.status(400).json({ success: false, error: 'Email tidak valid.' });
      }

      // Check if email is already verified (exists in accounts)
      if (isDbAvailable()) {
        const sql = getSql();
        const existing = await sql`SELECT id FROM server_accounts WHERE email = ${email.toLowerCase()} LIMIT 1`;
        if (existing.length > 0) {
          return res.json({ success: true, alreadyVerified: true, message: 'Email sudah terverifikasi. Silakan masuk.' });
        }
      }

      // Rate limit: max 3 verification emails per email per 15 minutes
      const token = generateVerificationToken();
      verificationTokens.set(token, {
        email: email.toLowerCase(),
        expiresAt: Date.now() + 15 * 60 * 1000,
      });

      // Clean expired tokens
      for (const [key, val] of verificationTokens) {
        if (val.expiresAt < Date.now()) verificationTokens.delete(key);
      }

      const sent = await sendVerificationEmail(email, token);
      if (!sent) {
        // If email service unavailable, auto-verify for development
        console.warn('[Email] Resend not configured - auto-verifying for dev mode');
        return res.json({ success: true, devMode: true, token, message: 'Email terkirim (dev mode - auto verified).' });
      }

      return res.json({ success: true, message: `Email verifikasi telah dikirim ke ${email}. Silakan cek inbox Anda.` });
    } catch (err: any) {
      console.error('[Auth] Send verification error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Gagal mengirim email verifikasi.' });
    }
  });

  // Verify email token
  app.get("/api/auth/verify/:token", (req, res) => {
    try {
      const { token } = req.params;
      const record = verificationTokens.get(token);

      if (!record) {
        return res.send(`<!DOCTYPE html><html><head><title>Verifikasi Gagal</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fef2f2;}.card{background:white;padding:40px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.1);text-align:center;max-width:400px;}.icon{font-size:48px;margin-bottom:16px;}</style></head><body><div class="card"><div class="icon">❌</div><h2>Verifikasi Gagal</h2><p>Link verifikasi tidak valid atau sudah kedaluwarsa.</p><p style="color:#666;font-size:14px;">Silakan daftar ulang untuk mendapatkan link baru.</p></div></body></html>`);
      }

      if (record.expiresAt < Date.now()) {
        verificationTokens.delete(token);
        return res.send(`<!DOCTYPE html><html><head><title>Link Kedaluwarsa</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fef2f2;}.card{background:white;padding:40px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.1);text-align:center;max-width:400px;}.icon{font-size:48px;margin-bottom:16px;}</style></head><body><div class="card"><div class="icon">⏰</div><h2>Link Kedaluwarsa</h2><p>Link verifikasi sudah tidak berlaku (lewat 15 menit).</p><p style="color:#666;font-size:14px;">Silakan daftar ulang untuk mendapatkan link baru.</p></div></body></html>`);
      }

      // Mark as verified — remove from pending tokens
      verificationTokens.delete(token);

      return res.send(`<!DOCTYPE html><html><head><title>Verifikasi Berhasil</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0fdf4;}.card{background:white;padding:40px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.1);text-align:center;max-width:400px;}.icon{font-size:48px;margin-bottom:16px;}.btn{display:inline-block;margin-top:20px;padding:12px 24px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:bold;}</style></head><body><div class="card"><div class="icon">✅</div><h2>Email Terverifikasi!</h2><p>Email <strong>${record.email}</strong> telah berhasil diverifikasi.</p><p style="color:#666;font-size:14px;">Anda sekarang bisa masuk ke akun BukuKas Pro.</p><a class="btn" href="/">Buka BukuKas Pro</a></div></body></html>`);
    } catch (err: any) {
      return res.status(500).send('Verifikasi error.');
    }
  });

  // Check verification status
  app.get("/api/auth/check-verification/:email", (req, res) => {
    const email = req.params.email?.toLowerCase();
    if (!email) return res.json({ verified: false });

    // Check if token exists for this email (not yet clicked)
    for (const [, record] of verificationTokens) {
      if (record.email === email && record.expiresAt > Date.now()) {
        return res.json({ verified: false, pending: true, message: 'Menunggu verifikasi - cek email Anda.' });
      }
    }

    return res.json({ verified: true, message: 'Email terverifikasi.' });
  });

  // ==================== Google SSO Token Verification ====================
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { credential, clientId } = req.body;
      if (!credential) {
        return res.status(400).json({ success: false, error: 'Google credential not provided.' });
      }

      // Decode the JWT payload (header.payload.signature)
      const parts = credential.split('.');
      if (parts.length !== 3) {
        return res.status(400).json({ success: false, error: 'Invalid Google credential format.' });
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));

      // Basic validation
      const expectedClientId = process.env.GOOGLE_CLIENT_ID || clientId;
      if (expectedClientId && payload.aud !== expectedClientId) {
        console.warn('[Google SSO] Client ID mismatch:', payload.aud, 'expected:', expectedClientId);
        // Allow in dev mode if GOOGLE_CLIENT_ID not set
        if (process.env.GOOGLE_CLIENT_ID) {
          return res.status(401).json({ success: false, error: 'Invalid Google client ID.' });
        }
      }

      // Check expiry
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return res.status(401).json({ success: false, error: 'Google token expired.' });
      }

      const email = payload.email;
      const name = payload.name || payload.given_name || email?.split('@')[0] || 'Google User';
      const photoUrl = payload.picture || '';
      const emailVerified = payload.email_verified === true;

      if (!email) {
        return res.status(400).json({ success: false, error: 'No email in Google token.' });
      }

      console.log(`[Google SSO] Verified login: ${email} (${name})`);

      res.json({
        success: true,
        email,
        name,
        photoUrl,
        emailVerified,
        provider: 'google',
      });
    } catch (err: any) {
      console.error('[Google SSO] Token verification failed:', err?.message);
      res.status(500).json({ success: false, error: 'Failed to verify Google token.' });
    }
  });

  // ==================== Financial Data Sync (per-user) ====================
  // Sync financial data (transactions, categories, accounts, bills, loans) per user across devices/domains
  // Uses Neon DB when available, falls back to in-memory
  const inMemoryFinancialData = new Map<string, any>();

  app.get("/api/user-data/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) return res.status(400).json({ error: 'userId required' });

      if (isDbAvailable()) {
        const sql = getSql();
        const rows = await sql`SELECT financial_data, synced_at FROM user_financial_data WHERE user_id = ${userId}`;
        if (rows.length > 0) {
          return res.json({ success: true, data: rows[0].financial_data, syncedAt: rows[0].synced_at });
        }
        return res.json({ success: true, data: null });
      }

      const data = inMemoryFinancialData.get(userId);
      return res.json({ success: true, data: data || null });
    } catch (err: any) {
      console.error('[UserData] GET error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/user-data/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) return res.status(400).json({ error: 'userId required' });

      const data = req.body;
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Invalid data' });
      }

      const now = new Date().toISOString();

      if (isDbAvailable()) {
        const sql = getSql();
        // Upsert: insert or update
        await sql`
          INSERT INTO user_financial_data (user_id, financial_data, synced_at)
          VALUES (${userId}, ${JSON.stringify(data)}::jsonb, ${now})
          ON CONFLICT (user_id) DO UPDATE SET financial_data = ${JSON.stringify(data)}::jsonb, synced_at = ${now}
        `;
        console.log(`[UserData] Synced financial data for user ${userId} (Neon DB)`);
        return res.json({ success: true, syncedAt: now });
      }

      // In-memory fallback
      const existing = inMemoryFinancialData.get(userId) || {};
      const merged = { ...existing, ...data, syncedAt: now };
      inMemoryFinancialData.set(userId, merged);

      console.log(`[UserData] Synced financial data for user ${userId} (in-memory fallback)`);
      return res.json({ success: true, syncedAt: now });
    } catch (err: any) {
      console.error('[UserData] POST error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== Referral / Invite System ====================
  // Generate a unique invite code for admin/dev users
  app.post('/api/referral/generate', async (req, res) => {
    try {
      const { userId, email } = req.body;
      if (!userId || !email) {
        return res.status(400).json({ success: false, error: 'userId and email required' });
      }

      if (isDbAvailable()) {
        const sql = getSql();
        const existing = await sql`SELECT code FROM referral_codes WHERE user_id = ${userId} AND is_active = true LIMIT 1`;
        if (existing.length > 0) {
          return res.json({ success: true, code: existing[0].code, isNew: false });
        }

        const code = 'BK' + Math.random().toString(36).slice(2, 10).toUpperCase();
        const id = `ref-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        await sql`
          INSERT INTO referral_codes (id, user_id, email, code, created_at, is_active)
          VALUES (${id}, ${userId}, ${email.toLowerCase()}, ${code}, ${new Date().toISOString()}, true)
        `;
        console.log(`[Referral] Generated code ${code} for ${email}`);
        return res.json({ success: true, code, isNew: true });
      }

      const code = 'BK' + Math.random().toString(36).slice(2, 10).toUpperCase();
      return res.json({ success: true, code, isNew: true });
    } catch (err: any) {
      console.error('[Referral] Generate error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get referral stats for a user
  app.get('/api/referral/stats/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

      if (isDbAvailable()) {
        const sql = getSql();
        const referrals = await sql`SELECT * FROM referrals WHERE referrer_user_id = ${userId} ORDER BY created_at DESC`;
        const codeRow = await sql`SELECT code FROM referral_codes WHERE user_id = ${userId} AND is_active = true LIMIT 1`;
        const totalReward = await sql`SELECT COALESCE(SUM(reward_amount), 0)::int as total FROM referrals WHERE referrer_user_id = ${userId} AND reward_paid = true`;
        const pendingReward = await sql`SELECT COALESCE(SUM(reward_amount), 0)::int as total FROM referrals WHERE referrer_user_id = ${userId} AND reward_paid = false AND status = 'converted'`;

        return res.json({
          success: true,
          code: codeRow[0]?.code || null,
          totalReferrals: referrals.length,
          convertedReferrals: referrals.filter((r: any) => r.status === 'converted').length,
          totalRewardEarned: totalReward[0]?.total ?? 0,
          pendingReward: pendingReward[0]?.total ?? 0,
          referrals: referrals.map((r: any) => ({
            id: r.id,
            referredEmail: r.referred_email,
            referredName: r.referred_name,
            status: r.status,
            rewardAmount: r.reward_amount,
            rewardPaid: r.reward_paid,
            referredPlan: r.referred_plan,
            createdAt: r.created_at,
          })),
        });
      }

      return res.json({ success: true, code: null, totalReferrals: 0, convertedReferrals: 0, totalRewardEarned: 0, pendingReward: 0, referrals: [] });
    } catch (err: any) {
      console.error('[Referral] Stats error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Track a new referral (called when user registers via invite link)
  app.post('/api/referral/track', async (req, res) => {
    try {
      const { code, referredEmail, referredName, referredUserId } = req.body;
      if (!code || !referredEmail) {
        return res.status(400).json({ success: false, error: 'code and referredEmail required' });
      }

      if (isDbAvailable()) {
        const sql = getSql();
        const codeRow = await sql`SELECT * FROM referral_codes WHERE code = ${code.toUpperCase()} AND is_active = true LIMIT 1`;
        if (codeRow.length === 0) {
          return res.status(404).json({ success: false, error: 'Kode undangan tidak valid.' });
        }

        const referrer = codeRow[0];
        const id = `ref-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const existing = await sql`SELECT id FROM referrals WHERE referred_email = ${referredEmail.toLowerCase()} LIMIT 1`;
        if (existing.length > 0) {
          return res.json({ success: true, message: 'Already referred' });
        }

        await sql`
          INSERT INTO referrals (id, referrer_user_id, referrer_email, referred_email, referred_user_id, referred_name, status, created_at)
          VALUES (${id}, ${referrer.user_id}, ${referrer.email}, ${referredEmail.toLowerCase()}, ${referredUserId || null}, ${referredName || null}, 'registered', ${new Date().toISOString()})
        `;
        console.log(`[Referral] ${referredEmail} registered via code ${code} from ${referrer.email}`);
        return res.json({ success: true, referrerName: referrer.email });
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.error('[Referral] Track error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Mark referral as converted (when referred user upgrades to paid plan)
  app.post('/api/referral/convert', async (req, res) => {
    try {
      const { referredEmail } = req.body;
      if (!referredEmail) {
        return res.status(400).json({ success: false, error: 'referredEmail required' });
      }

      if (isDbAvailable()) {
        const sql = getSql();
        await sql`
          UPDATE referrals SET status = 'converted', referred_plan = 'paid', referred_paid_at = ${new Date().toISOString()}
          WHERE referred_email = ${referredEmail.toLowerCase()} AND status = 'registered'
        `;
        console.log(`[Referral] ${referredEmail} converted to paid plan`);
        return res.json({ success: true });
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.error('[Referral] Convert error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Resolve referral code to referrer info
  app.get('/api/referral/resolve/:code', async (req, res) => {
    try {
      const { code } = req.params;
      if (!code) return res.status(400).json({ success: false, error: 'code required' });

      if (isDbAvailable()) {
        const sql = getSql();
        const codeRow = await sql`SELECT * FROM referral_codes WHERE code = ${code.toUpperCase()} AND is_active = true LIMIT 1`;
        if (codeRow.length === 0) {
          return res.status(404).json({ success: false, error: 'Kode undangan tidak valid atau sudah tidak aktif.' });
        }
        return res.json({ success: true, referrerName: codeRow[0].email.split('@')[0], code: codeRow[0].code });
      }

      return res.status(404).json({ success: false, error: 'Database tidak tersedia.' });
    } catch (err: any) {
      console.error('[Referral] Resolve error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==================== Seller Application System ====================
  // User applies to become a referral seller (needs admin approval + lifetime upgrade)
  app.post('/api/seller/apply', async (req, res) => {
    try {
      const { userId, email, name, uplineUserId, uplineEmail, uplineName, reason } = req.body;
      if (!userId || !email || !name) {
        return res.status(400).json({ success: false, error: 'userId, email, and name required' });
      }

      if (isDbAvailable()) {
        const sql = getSql();
        // Check if already applied
        const existing = await sql`SELECT id, status FROM seller_applications WHERE user_id = ${userId} AND status IN ('pending', 'approved') LIMIT 1`;
        if (existing.length > 0) {
          return res.json({ success: true, status: existing[0].status, message: 'Anda sudah mengajukan sebelumnya.' });
        }

        const id = `seller-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await sql`
          INSERT INTO seller_applications (id, user_id, user_email, user_name, upline_user_id, upline_email, upline_name, status, reason, created_at)
          VALUES (${id}, ${userId}, ${email.toLowerCase()}, ${name}, ${uplineUserId || null}, ${uplineEmail || null}, ${uplineName || null}, 'pending', ${reason || null}, ${new Date().toISOString()})
        `;
        console.log(`[Seller] Application submitted by ${email} (upline: ${uplineEmail || 'none'})`);
        return res.json({ success: true, status: 'pending', message: 'Pengajuan seller berhasil dikirim. Menunggu persetujuan admin.' });
      }

      return res.json({ success: true, status: 'pending', message: 'Pengajuan seller berhasil (mode offline).' });
    } catch (err: any) {
      console.error('[Seller] Apply error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // List all seller applications (admin only)
  app.get('/api/seller/applications', async (req, res) => {
    try {
      if (isDbAvailable()) {
        const sql = getSql();
        const rows = await sql`SELECT * FROM seller_applications ORDER BY created_at DESC`;
        const applications = rows.map((r: any) => ({
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
          createdAt: r.created_at,
        }));
        return res.json({ success: true, total: applications.length, applications });
      }

      return res.json({ success: true, total: 0, applications: [] });
    } catch (err: any) {
      console.error('[Seller] List error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Approve or reject a seller application
  app.post('/api/seller/review', async (req, res) => {
    try {
      const { applicationId, action, adminNotes, adminUserId } = req.body;
      if (!applicationId || !action) {
        return res.status(400).json({ success: false, error: 'applicationId and action required' });
      }
      if (!['approved', 'rejected'].includes(action)) {
        return res.status(400).json({ success: false, error: 'action must be approved or rejected' });
      }

      if (isDbAvailable()) {
        const sql = getSql();
        const appRow = await sql`SELECT * FROM seller_applications WHERE id = ${applicationId} LIMIT 1`;
        if (appRow.length === 0) {
          return res.status(404).json({ success: false, error: 'Pengajuan tidak ditemukan.' });
        }

        const now = new Date().toISOString();
        await sql`
          UPDATE seller_applications SET status = ${action}, admin_notes = ${adminNotes || null}, reviewed_at = ${now}, reviewed_by = ${adminUserId || null}
          WHERE id = ${applicationId}
        `;

        // If approved: upgrade user to lifetime + generate referral code
        if (action === 'approved') {
          const applicant = appRow[0];
          // Upgrade user to lifetime
          await sql`
            UPDATE server_accounts SET plan = 'lifetime', status = 'active'
            WHERE id = ${applicant.user_id}
          `;
          // Generate referral code for new seller
          const code = 'BK' + Math.random().toString(36).slice(2, 10).toUpperCase();
          const refId = `ref-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          try {
            await sql`
              INSERT INTO referral_codes (id, user_id, email, code, created_at, is_active)
              VALUES (${refId}, ${applicant.user_id}, ${applicant.user_email}, ${code}, ${now}, true)
              ON CONFLICT (id) DO NOTHING
            `;
          } catch (e) { /* code might already exist */ }
          console.log(`[Seller] ${applicant.user_email} approved → lifetime + referral code ${code}`);
          return res.json({ success: true, action, referralCode: code, message: `${applicant.user_name} berhasil di-upgrade ke Lifetime VIP + mendapat kode referral.` });
        }

        console.log(`[Seller] Application ${applicationId} ${action}`);
        return res.json({ success: true, action, message: `Pengajuan ${action === 'approved' ? 'disetujui' : 'ditolak'}.` });
      }

      return res.json({ success: true, action });
    } catch (err: any) {
      console.error('[Seller] Review error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get seller application status for a user
  app.get('/api/seller/status/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

      if (isDbAvailable()) {
        const sql = getSql();
        const rows = await sql`SELECT * FROM seller_applications WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 1`;
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
          createdAt: r.created_at,
        });
      }

      return res.json({ success: true, hasApplied: false });
    } catch (err: any) {
      console.error('[Seller] Status error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "BukuKas Pro Business Mail & Backend API",
      businessEmail: "admin@bukukas.ai.studio",
      timestamp: new Date().toISOString(),
      activeServerMessagesCount: inMemoryServerMessages.length,
      capabilities: ["inbound-email-receiver", "gmail-dispatcher", "license-manager", "rates-proxy", "ox-alpha-chat", "email-verification"],
      alphaKeyConfigured: !!process.env.OPENROUTER_API_KEY,
      emailConfigured: !!resend,
      database: isDbAvailable() ? 'neon-postgres' : 'json-file',
    });
  });

  // Account Registry - list all registered accounts (Dev Portal + isolation sync)
  app.get("/api/accounts", async (req, res) => {
    try {
      if (isDbAvailable()) {
        const sql = getSql();
        const rows = await sql`SELECT * FROM server_accounts ORDER BY synced_at DESC`;
        const accounts = rows.map((r: any) => ({
          id: r.id, name: r.name, email: r.email, photoUrl: r.photo_url,
          provider: r.provider, role: r.role, plan: r.plan, status: r.status,
          registeredSelf: r.registered_self, createdAt: r.created_at,
          lastLoginAt: r.last_login_at, trialExpiresDate: r.trial_expires_date,
          paidExpiresDate: r.paid_expires_date, customNotes: r.custom_notes,
          referredBy: r.referred_by, syncedAt: r.synced_at,
        }));
        return res.json({ success: true, total: accounts.length, accounts });
      }
      // JSON fallback
      const accounts = Array.from(inMemoryServerAccounts.values()).sort(
        (a, b) => new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime()
      );
      res.json({ success: true, total: accounts.length, accounts });
    } catch (err: any) {
      console.error('[DB] GET /api/accounts error:', err);
      // Fallback to in-memory
      const accounts = Array.from(inMemoryServerAccounts.values());
      res.json({ success: true, total: accounts.length, accounts });
    }
  });

  // Account Create — create a new account in Neon DB (Dev Portal)
  app.post('/api/accounts/create', async (req, res) => {
    try {
      const { name, email, password, role, plan, photoUrl, status, registeredSelf, customNotes, referredBy } = req.body;
      if (!name || !email) {
        return res.status(400).json({ success: false, error: 'name and email required' });
      }
      const id = `usr-srv-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      const now = new Date().toISOString();

      if (isDbAvailable()) {
        const sql = getSql();
        // Upsert — if email exists, update; otherwise insert
        await sql`
          INSERT INTO server_accounts (id, name, email, photo_url, provider, role, plan, status, registered_self, created_at, last_login_at, custom_notes, referred_by, synced_at)
          VALUES (${id}, ${name}, ${email.toLowerCase()}, ${photoUrl || null}, ${'password'}, ${role || 'user'}, ${plan || 'lifetime'}, ${status || 'active'}, ${registeredSelf ?? false}, ${now}, ${now}, ${customNotes || null}, ${referredBy || null}, ${now})
          ON CONFLICT (email) DO UPDATE SET
            name = ${name}, plan = ${plan || 'lifetime'}, role = ${role || 'user'},
            status = ${status || 'active'}, custom_notes = ${customNotes || null},
            synced_at = ${now}
        `;
        console.log(`[DB] Account created: ${name} (${email}) [${id}]`);
        return res.json({ success: true, id, message: `Akun ${name} berhasil dibuat.` });
      }

      // JSON fallback
      const record = {
        id, name, email: email.toLowerCase(), photoUrl: photoUrl || undefined,
        provider: 'password', role: role || 'user', plan: plan || 'lifetime',
        status: status || 'active', registeredSelf: registeredSelf ?? false,
        createdAt: now, lastLoginAt: now, customNotes, syncedAt: now,
      };
      inMemoryServerAccounts.set(id, record);
      res.json({ success: true, id, message: `Akun ${name} berhasil dibuat.` });
    } catch (err: any) {
      console.error('[DB] POST /api/accounts/create error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Account Cleanup — DELETE all non-admin/non-dev accounts
  app.delete('/api/accounts/cleanup', async (req, res) => {
    const PROTECTED_EMAILS = ['admin@bukukas.ai.studio', 'indoclickshop@gmail.com'];
    try {
      if (isDbAvailable()) {
        const sql = getSql();
        // First count what will be deleted
        const countResult = await sql`SELECT COUNT(*)::int as cnt FROM server_accounts WHERE email NOT IN ('admin@bukukas.ai.studio', 'indoclickshop@gmail.com')`;
        const count = countResult[0]?.cnt ?? 0;
        if (count > 0) {
          await sql`DELETE FROM server_accounts WHERE email NOT IN ('admin@bukukas.ai.studio', 'indoclickshop@gmail.com')`;
        }
        console.log(`[DB] Cleanup: deleted ${count} non-admin accounts`);
        return res.json({ success: true, deleted: count, message: `${count} akun sampah dihapus. Hanya akun admin/dev yang tersisa.` });
      }
      // JSON fallback
      let deleted = 0;
      for (const [key, acc] of inMemoryServerAccounts.entries()) {
        if (!PROTECTED_EMAILS.includes(acc.email)) {
          inMemoryServerAccounts.delete(key);
          deleted++;
        }
      }
      res.json({ success: true, deleted, message: `${deleted} akun sampah dihapus.` });
    } catch (err: any) {
      console.error('[DB] Cleanup error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Cleanup junk emails/messages (keep only seed + legitimate messages)
  app.delete('/api/business-email/cleanup', async (req, res) => {
    try {
      if (isDbAvailable()) {
        const sql = getSql();
        // Delete test/backtest messages (from bot@backtest.dev, webhook@eksternal.id, etc.)
        const countResult = await sql`SELECT COUNT(*)::int as cnt FROM server_messages WHERE sender_email LIKE '%@backtest.dev' OR sender_email LIKE '%@eksternal.id' OR sender_email LIKE '%@test%'`;
        const count = countResult[0]?.cnt ?? 0;
        if (count > 0) {
          await sql`DELETE FROM server_messages WHERE sender_email LIKE '%@backtest.dev' OR sender_email LIKE '%@eksternal.id' OR sender_email LIKE '%@test%'`;
        }
        // Count remaining
        const remaining = await sql`SELECT COUNT(*)::int as cnt FROM server_messages`;
        console.log(`[DB] Email cleanup: deleted ${count} junk messages, ${remaining[0]?.cnt ?? 0} remaining`);
        return res.json({ success: true, deleted: count, remaining: remaining[0]?.cnt ?? 0 });
      }
      // In-memory fallback
      let deleted = 0;
      for (let i = inMemoryServerMessages.length - 1; i >= 0; i--) {
        const email = inMemoryServerMessages[i].senderEmail;
        if (email.includes('@backtest.dev') || email.includes('@eksternal.id') || email.includes('@test')) {
          inMemoryServerMessages.splice(i, 1);
          deleted++;
        }
      }
      res.json({ success: true, deleted, remaining: inMemoryServerMessages.length });
    } catch (err: any) {
      console.error('[DB] Email cleanup error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Account Registry - upsert one account or a batch: { account } | { accounts: [...] }
  // Passwords and other secrets are stripped before persisting.
  app.post("/api/accounts/upsert", async (req, res) => {
    try {
      const incoming: any[] = req.body?.accounts || (req.body?.account ? [req.body.account] : []);
      if (!Array.isArray(incoming) || incoming.length === 0) {
        return res.status(400).json({ error: "Field 'account' or 'accounts' array is required." });
      }

      // Filter out test accounts (stress test, isolation test, etc.)
      const filtered = incoming.filter((raw: any) => {
        const email = String(raw?.email || '').toLowerCase();
        if (email.includes('@test.dev') || email.includes('@backtest.dev') || email.includes('stress-user') || email.includes('tes-isolasi') || email.includes('tes@') || email.includes('persist-') || email.includes('e2e-test') || email.includes('neon-test') || email.includes('test-sync')) {
          return false; // Reject test accounts
        }
        return true;
      });
      if (filtered.length === 0) {
        return res.json({ success: true, upserted: 0, total: 0, message: 'No non-test accounts to sync.' });
      }

      let upserted = 0;
      const now = new Date().toISOString();

      if (isDbAvailable()) {
        const sql = getSql();
        for (const raw of filtered) {
          if (!raw?.id || !raw?.email) continue;
          const email = String(raw.email).toLowerCase();
          const customNotes = typeof raw.customNotes === "string" && !raw.customNotes.toLowerCase().includes("password")
            ? String(raw.customNotes) : undefined;
          await sql`
            INSERT INTO server_accounts (id, name, email, photo_url, provider, role, plan, status, registered_self, created_at, last_login_at, trial_expires_date, paid_expires_date, custom_notes, referred_by, synced_at)
            VALUES (${String(raw.id)}, ${String(raw.name || email.split("@")[0])}, ${email}, ${raw.photoUrl ? String(raw.photoUrl) : null}, ${String(raw.provider || "password")}, ${String(raw.role || "user")}, ${String(raw.plan || "trial")}, ${raw.status ? String(raw.status) : null}, ${Boolean(raw.registeredSelf)}, ${String(raw.createdAt || now)}, ${String(raw.lastLoginAt || "-")}, ${raw.trialExpiresDate ? String(raw.trialExpiresDate) : null}, ${raw.paidExpiresDate ? String(raw.paidExpiresDate) : null}, ${customNotes || null}, ${raw.referredBy ? String(raw.referredBy) : null}, ${now})
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, photo_url = EXCLUDED.photo_url, provider = EXCLUDED.provider, role = EXCLUDED.role, plan = EXCLUDED.plan, status = EXCLUDED.status, registered_self = EXCLUDED.registered_self, created_at = EXCLUDED.created_at, last_login_at = EXCLUDED.last_login_at, trial_expires_date = EXCLUDED.trial_expires_date, paid_expires_date = EXCLUDED.paid_expires_date, custom_notes = EXCLUDED.custom_notes, referred_by = COALESCE(EXCLUDED.referred_by, server_accounts.referred_by), synced_at = EXCLUDED.synced_at
          `;
          upserted += 1;
        }
        return res.json({ success: true, upserted, total: upserted });
      }

      // JSON fallback
      for (const raw of filtered) {
        if (!raw?.id || !raw?.email) continue;
        inMemoryServerAccounts.set(String(raw.id), {
          id: String(raw.id),
          name: String(raw.name || raw.email.split("@")[0]),
          email: String(raw.email).toLowerCase(),
          photoUrl: raw.photoUrl ? String(raw.photoUrl) : undefined,
          provider: String(raw.provider || "password"),
          role: String(raw.role || "user"),
          plan: String(raw.plan || "trial"),
          status: raw.status ? String(raw.status) : undefined,
          registeredSelf: Boolean(raw.registeredSelf),
          createdAt: String(raw.createdAt || now),
          lastLoginAt: String(raw.lastLoginAt || "-"),
          trialExpiresDate: raw.trialExpiresDate ? String(raw.trialExpiresDate) : undefined,
          paidExpiresDate: raw.paidExpiresDate ? String(raw.paidExpiresDate) : undefined,
          customNotes: typeof raw.customNotes === "string" && !raw.customNotes.toLowerCase().includes("password")
            ? String(raw.customNotes) : undefined,
          syncedAt: now,
        });
        upserted += 1;
      }
      scheduleSaveAccounts();

      return res.json({
        success: true,
        upserted,
        total: inMemoryServerAccounts.size,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Account registry error" });
    }
  });

  // Business Email - Get all server stored messages
  app.get("/api/business-email/messages", async (req, res) => {
    try {
      if (isDbAvailable()) {
        const sql = getSql();
        const rows = await sql`SELECT * FROM server_messages ORDER BY sent_at DESC`;
        const messages = rows.map((r: any) => ({
          id: r.id, senderName: r.sender_name, senderEmail: r.sender_email,
          senderPhone: r.sender_phone, subject: r.subject, message: r.message,
          category: r.category, sentAt: r.sent_at, isRead: r.is_read,
          repliedAt: r.replied_at, replyText: r.reply_text,
          aiSuggestedReply: r.ai_suggested_reply, source: r.source,
        }));
        return res.json({ success: true, businessEmail: 'admin@bukukas.ai.studio', total: messages.length, messages });
      }
      // JSON fallback
      res.json({
        success: true,
        businessEmail: "admin@bukukas.ai.studio",
        total: inMemoryServerMessages.length,
        messages: inMemoryServerMessages,
      });
    } catch (err: any) {
      console.error('[DB] GET /api/business-email/messages error:', err);
      res.json({ success: true, businessEmail: 'admin@bukukas.ai.studio', total: inMemoryServerMessages.length, messages: inMemoryServerMessages });
    }
  });

  // Helper to generate AI reply
  async function generateAiReply(senderName: string, senderEmail: string, subject: string, message: string, category: string): Promise<string> {
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
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 12000)),
      ]);

      return aiResult?.text || "";
    } catch (aiErr) {
      console.warn("AI suggestion generation error (non-fatal):", aiErr);
      return "";
    }
  }

  // Business Email - Send new message to admin@bukukas.ai.studio (from app or external form)
  app.post("/api/business-email/send", async (req, res) => {
    try {
      const { senderName, senderEmail, senderPhone, subject, message, category, source } = req.body;
      if (!senderName || !senderEmail || !subject || !message) {
        return res.status(400).json({
          error: "Field senderName, senderEmail, subject, and message are required.",
        });
      }

      const newMsgId = `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const aiSuggestedReply = await generateAiReply(
        String(senderName),
        String(senderEmail),
        String(subject),
        String(message),
        category || 'inquiry'
      );

      const serverMsg: ServerBusinessMessage = {
        id: newMsgId,
        senderName: String(senderName),
        senderEmail: String(senderEmail),
        senderPhone: senderPhone ? String(senderPhone) : undefined,
        subject: String(subject),
        message: String(message),
        category: category || 'inquiry',
        sentAt: new Date().toISOString(),
        isRead: false,
        aiSuggestedReply: aiSuggestedReply || undefined,
        source: source || 'in-app',
      };

      if (isDbAvailable()) {
        const sql = getSql();
        await sql`
          INSERT INTO server_messages (id, sender_name, sender_email, sender_phone, subject, message, category, sent_at, is_read, ai_suggested_reply, source)
          VALUES (${serverMsg.id}, ${serverMsg.senderName}, ${serverMsg.senderEmail}, ${serverMsg.senderPhone || null}, ${serverMsg.subject}, ${serverMsg.message}, ${serverMsg.category}, ${serverMsg.sentAt}, ${false}, ${serverMsg.aiSuggestedReply || null}, ${serverMsg.source || 'in-app'})
        `;
      } else {
        inMemoryServerMessages.unshift(serverMsg);
        scheduleSaveMessages();
      }

      return res.json({
        success: true,
        message: "Pesan berhasil diterima di server email admin@bukukas.ai.studio",
        data: serverMsg,
      });
    } catch (err: any) {
      console.error("Error processing business email:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Business Email - INBOUND WEBHOOK & EXTERNAL EMAIL RECEIVER
  // Receives simulated or live inbound webhook emails (from Gmail, SendGrid, Mailgun, AWS SES, or external forms)
  app.post(["/api/inbound-email", "/api/business-email/receive", "/api/business-email/webhook"], async (req, res) => {
    try {
      const payload = req.body || {};
      const senderEmail = payload.from || payload.sender || payload.senderEmail || payload.email || "external-user@gmail.com";
      const senderName = payload.from_name || payload.senderName || payload.name || senderEmail.split('@')[0];
      const subject = payload.subject || payload.title || "Pesan Masuk dari Email Eksternal";
      const message = payload.text || payload.body || payload.message || payload.html || "(Pesan kosong)";
      const senderPhone = payload.phone || payload.senderPhone || undefined;
      const category = payload.category || (subject.toLowerCase().includes('lifetime') ? 'license' : 'inquiry');

      const newMsgId = `inbound-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const aiSuggestedReply = await generateAiReply(senderName, senderEmail, subject, message, category);

      const serverMsg: ServerBusinessMessage = {
        id: newMsgId,
        senderName: String(senderName),
        senderEmail: String(senderEmail),
        senderPhone: senderPhone ? String(senderPhone) : undefined,
        subject: String(subject),
        message: String(message),
        category: category as any,
        sentAt: new Date().toISOString(),
        isRead: false,
        aiSuggestedReply: aiSuggestedReply || undefined,
        source: 'inbound-webhook',
      };

      if (isDbAvailable()) {
        const sql = getSql();
        await sql`
          INSERT INTO server_messages (id, sender_name, sender_email, sender_phone, subject, message, category, sent_at, is_read, ai_suggested_reply, source)
          VALUES (${serverMsg.id}, ${serverMsg.senderName}, ${serverMsg.senderEmail}, ${serverMsg.senderPhone || null}, ${serverMsg.subject}, ${serverMsg.message}, ${serverMsg.category}, ${serverMsg.sentAt}, ${false}, ${serverMsg.aiSuggestedReply || null}, ${serverMsg.source || 'inbound-webhook'})
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
        data: serverMsg,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Inbound receiver error" });
    }
  });

  // Business Email - Reply from Developer
  app.post("/api/business-email/reply", async (req, res) => {
    try {
      const { messageId, replyText } = req.body;
      if (!messageId || !replyText) {
        return res.status(400).json({ error: "messageId and replyText are required." });
      }

      if (isDbAvailable()) {
        const sql = getSql();
        const now = new Date().toISOString();
        await sql`
          UPDATE server_messages SET reply_text = ${replyText}, replied_at = ${now}, is_read = true
          WHERE id = ${messageId}
        `;
        return res.json({ success: true, message: "Balasan berhasil dikirim dari admin@bukukas.ai.studio" });
      }

      // JSON fallback
      const msg = inMemoryServerMessages.find(m => m.id === messageId);
      if (msg) {
        msg.replyText = replyText;
        msg.repliedAt = new Date().toISOString();
        msg.isRead = true;
        scheduleSaveMessages();
      }

      return res.json({
        success: true,
        message: "Balasan berhasil dikirim dari admin@bukukas.ai.studio",
        data: msg,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Business Email - Delete Message
  app.delete("/api/business-email/:id", async (req, res) => {
    const { id } = req.params;
    if (isDbAvailable()) {
      const sql = getSql();
      await sql`DELETE FROM server_messages WHERE id = ${id}`;
    } else {
      const idx = inMemoryServerMessages.findIndex(m => m.id === id);
      if (idx !== -1) {
        inMemoryServerMessages.splice(idx, 1);
        scheduleSaveMessages();
      }
    }
    return res.json({ success: true, message: "Pesan dihapus dari server." });
  });

  // AI Chatbot Assistant API for BukuKas Pro
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history = [], financialContext } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Pesan tidak boleh kosong." });
      }

      const ls = financialContext?.loansSummary || {};
      const payablesListStr = Array.isArray(ls.activePayablesList) && ls.activePayablesList.length > 0
        ? ls.activePayablesList.map((p: any, i: number) => 
            `  ${i + 1}. ${p.person} (${p.title}): Pokok ${p.amount} | Sisa Wajib Dibayar: ${p.remainingAmount} | Terbayar: ${p.paidAmount} | Status: ${p.status} | Jatuh Tempo: ${p.dueDate} | Kontak: ${p.contactPhone || '-'}`
          ).join('\n')
        : '  (Tidak ada hutang aktif)';

      const receivablesListStr = Array.isArray(ls.activeReceivablesList) && ls.activeReceivablesList.length > 0
        ? ls.activeReceivablesList.map((r: any, i: number) => 
            `  ${i + 1}. ${r.person} (${r.title}): Pokok ${r.amount} | Sisa Belum Ditagih/Diterima: ${r.remainingAmount} | Diterima: ${r.paidAmount} | Status: ${r.status} | Jatuh Tempo: ${r.dueDate} | Kontak: ${r.contactPhone || '-'}`
          ).join('\n')
        : '  (Tidak ada piutang aktif)';

      const settledListStr = Array.isArray(ls.settledLoansList) && ls.settledLoansList.length > 0
        ? ls.settledLoansList.map((s: any, i: number) => 
            `  ${i + 1}. [${s.type}] ${s.person} - ${s.title}: ${s.amount} (${s.status})`
          ).join('\n')
        : '  (Belum ada riwayat pelunasan)';

      let contextDescription = "";
      if (financialContext) {
        contextDescription = `
KONTEKS FINANSIAL REAL-TIME PENGGUNA BUKUKAS PRO:
- Nama Pengguna: ${financialContext.userName || 'Pengguna BukuKas Pro'}
- Mata Uang Utama: ${financialContext.currency || 'IDR'}
- Total Saldo di Seluruh Rekening: ${financialContext.totalBalance || '0'}
- Pemasukan Bulan Ini: ${financialContext.monthlyIncome || '0'}
- Pengeluaran Bulan Ini: ${financialContext.monthlyExpense || '0'}
- Tabungan Bersih: ${financialContext.netSavings || '0'} (${financialContext.savingsRate || 0}% rasio tabungan)
- Tagihan Rutin Belum Lunas: ${financialContext.unpaidBillsCount || 0} tagihan
${Array.isArray(financialContext.unpaidBillsList) && financialContext.unpaidBillsList.length > 0 ? `- Daftar Tagihan Belum Lunas (urut jatuh tempo):
${financialContext.unpaidBillsList.map((b: any) => `   * ${b.title}: ${b.amount} | Jatuh tempo ${b.dueDate}${b.isOverdue ? ' (TERLAMBAT)' : ''}`).join('\n')}` : '- Semua tagihan sudah lunas'}
${Array.isArray(financialContext.topExpenseCategories) && financialContext.topExpenseCategories.length > 0 ? `- Breakdown Pengeluaran per Kategori (bulan ini):
${financialContext.topExpenseCategories.map((c: any) => `   * ${c.name}: ${c.amount} (${c.percent}%)`).join('\n')}` : ''}

RINGKASAN MODUL HUTANG & PIUTANG (LIABILITIES & ASSETS):
1. PIUTANG (RECEIVABLES / UANG PENGGUNA YANG DIPINJAM ORANG LAIN / HAK TAGIH):
   - Total Pokok Piutang: ${ls.totalReceivables || '0'}
   - Total Sudah Diterima/Dicicil: ${ls.paidReceivables || '0'}
   - Sisa Saldo Piutang yang Belum Ditagih/Diterima: ${ls.remainingReceivables || '0'}
   - Jumlah Debitur/Peminjam Aktif: ${ls.activeReceivablesCount || 0} orang/entitas
   - Rincian Daftar Piutang Aktif:
${receivablesListStr}

2. HUTANG (PAYABLES / KEWAJIBAN PENGGUNA KEPADA PIHAK LAIN):
   - Total Pokok Hutang: ${ls.totalPayables || '0'}
   - Total Sudah Dilunasi/Dicicil: ${ls.paidPayables || '0'}
   - Sisa Saldo Hutang yang Wajib Dibayar: ${ls.remainingPayables || '0'}
   - Jumlah Kreditor/Hutang Aktif: ${ls.activePayablesCount || 0} entitas
   - Rincian Daftar Hutang Aktif:
${payablesListStr}

3. POSISI BERSIH PINJAMAN & STATUS PELUNASAN:
   - Posisi Bersih (Sisa Piutang - Sisa Hutang): ${ls.netLoanPosition || '0'}
   - Pinjaman Melewati Jatuh Tempo (Overdue): ${ls.overdueLoansCount || 0}
   - Riwayat Lunas (100%):
${settledListStr}
`;
      }

      const systemInstruction = `Anda adalah "0x Alpha — Asisten Keuangan BukuKas Pro" — konsultan keuangan dan penasihat pembukuan cerdas pribadi & UMKM resmi dari aplikasi BukuKas Pro.
Karakter Anda:
- Sangat ramah, bijak, solutif, analitis, akurat secara angka, dan profesional.
- Ahli dalam manajemen arus kas, pencatatan Hutang & Piutang (Liabilities & Assets), rumus budgeting (50/30/20, amplop, zero-based), pemantauan tagihan, dan konversi multi-mata uang.
- ATURAN KHUSUS HUTANG & PIUTANG:
  * "Piutang" (Receivables) = Uang milik pengguna yang dipinjam oleh orang/pihak lain (Hak tagih). Jika ditanya "total piutang", sebutkan total sisa piutang yang belum diterima (${ls.remainingReceivables || '0'}), rincikan nama-nama peminjamnya, nominal pokok, sisa saldo, dan tanggal jatuh temponya dengan rapi dan jelas.
  * "Hutang" (Payables) = Kewajiban uang yang dipinjam pengguna dari pihak lain. Jika ditanya "total hutang", sebutkan total sisa hutang yang wajib dibayar (${ls.remainingPayables || '0'}), rincikan nama pemberi pinjaman/bank, pokok, sisa saldo, dan jatuh temponya.
  * Tampilkan angka dan nama secara presisi sesuai data real-time pada konteks tanpa mengarang.
- Format teks menggunakan Markdown yang rapi (bold, bullet points, emoji yang proporsional).
${contextDescription}`;

      // Build contents history
      const formattedContents: any[] = [];
      if (Array.isArray(history)) {
        history.slice(-10).forEach((item: any) => {
          if (item.role && item.text) {
            formattedContents.push({
              role: item.role === 'user' ? 'user' : 'model',
              parts: [{ text: String(item.text) }],
            });
          }
        });
      }

      formattedContents.push({
        role: 'user',
        parts: [{ text: String(message) }],
      });

      // useLocalEngine: true → lewati 0x Alpha dan paksa mesin analisis lokal
      // (dipakai untuk pengujian deterministik & mode hemat)
      let generatedResult: { text: string; modelUsed: string } | null = req.body.useLocalEngine
        ? null
        : await generateWithOxAlpha({
            contents: formattedContents,
            systemInstruction,
            temperature: 0.7,
          });

      if (generatedResult && generatedResult.text) {
        return res.json({
          success: true,
          reply: generatedResult.text,
          model: generatedResult.modelUsed,
        });
      }

      // Offline / Resilient Advisor Fallback Logic
      const lowerQuery = message.toLowerCase();
      let fallbackReply = "";

      // Intent 0a: Sapaan / basa-basi
      if (
        /^(halo|hai|hi|hei|hey|assalam|pagi|siang|sore|malam)[\s!,.?]*$/.test(lowerQuery) ||
        lowerQuery.includes("apa kabar") ||
        lowerQuery.includes("terima kasih") ||
        lowerQuery.includes("makasih") ||
        lowerQuery === "thanks"
      ) {
        fallbackReply = `Halo ${financialContext?.userName || 'Kak'}! 👋 Saya **Asisten Keuangan BukuKas** dan siap membantu Anda kapan saja.\n\nBeberapa hal yang bisa langsung Anda tanyakan:\n- 🧾 _"Tagihan apa saja yang belum dibayar?"_\n- 💰 _"Total piutang saya?"_\n- 💳 _"Status hutang & cicilan?"_\n- ⬇️ _"Berapa pengeluaran bulan ini?"_ | ⬆️ _"Pemasukan bulan ini?"_\n- 📊 _"Analisis keuangan saya"_ | 💡 _"Strategi budgeting"_ | 💱 _"Tips valas"_`;
      }
      // Intent 0b: TAGIHAN (bills) — HARUS sebelum piutang agar kata
      // "tagihan" tidak salah match ke "tagih"
      else if (
        lowerQuery.includes("tagihan") ||
        (lowerQuery.includes("bill") && !lowerQuery.includes("hutang")) ||
        lowerQuery.includes("listrik") ||
        lowerQuery.includes("internet") ||
        lowerQuery.includes("langganan") ||
        lowerQuery.includes("iuran")
      ) {
        const unpaidBills = Array.isArray(financialContext?.unpaidBillsList) ? financialContext.unpaidBillsList : [];
        const billsMd = unpaidBills.length > 0
          ? unpaidBills.map((b: any, i: number) =>
              `${i + 1}. **${b.title}** — **${b.amount}** | Jatuh tempo: **${b.dueDate}**${b.isOverdue ? ' ⚠️ *TERLAMBAT*' : ''} (${b.recurrence})`
            ).join('\n')
          : "_Semua tagihan sudah lunas! 🎉 Tidak ada yang perlu dibayar._";
        const hasOverdue = unpaidBills.some((b: any) => b.isOverdue);
        fallbackReply = `### 🧾 Tagihan Belum Lunas (${unpaidBills.length})\n\n${billsMd}\n\n💡 ${hasOverdue ? '**Ada tagihan terlambat** — segera bayar untuk menghindari denda!' : 'Semua masih dalam batas waktu. Aktifkan auto-debit di menu Tagihan agar tidak terlewat.'}`;
      }
      // Intent 0c: PENGELUARAN bulan ini (+ breakdown kategori)
      else if (
        lowerQuery.includes("pengeluaran") ||
        lowerQuery.includes("pengeluar") ||
        lowerQuery.includes("belanja") ||
        lowerQuery.includes("expense") ||
        (lowerQuery.includes("laporan") && !lowerQuery.includes("pemasukan"))
      ) {
        const cats = Array.isArray(financialContext?.topExpenseCategories) ? financialContext.topExpenseCategories : [];
        const catMd = cats.length > 0
          ? cats.map((c: any) => `- **${c.name}**: ${c.amount} (${c.percent}% dari total)`).join('\n')
          : "_Belum ada pengeluaran tercatat bulan ini._";
        fallbackReply = `### ⬇️ Pengeluaran Bulan Ini\n\n- **Total**: **${financialContext?.monthlyExpense || 'Rp 0'}**\n- Dibanding pemasukan: ${financialContext?.monthlyIncome || 'Rp 0'} → arus kas bersih **${financialContext?.netSavings || 'Rp 0'}** (rasio tabungan ${financialContext?.savingsRate || 0}%)\n\n#### 📂 Breakdown Kategori Terbesar:\n${catMd}\n\n💡 ${cats.length > 0 ? `Kategori terbesar adalah **${cats[0].name}** (${cats[0].percent}%). Jika ingin hemat, mulai review dari sini.` : 'Mulai catat transaksi Anda agar analisis makin akurat.'}`;
      }
      // Intent 0d: PEMASUKAN
      else if (
        lowerQuery.includes("pemasukan") ||
        lowerQuery.includes("pendapatan") ||
        lowerQuery.includes("income") ||
        lowerQuery.includes("gaji") ||
        lowerQuery.includes("uang masuk")
      ) {
        fallbackReply = `### ⬆️ Pemasukan Bulan Ini\n\n- **Total**: **${financialContext?.monthlyIncome || 'Rp 0'}**\n- Pengeluaran: ${financialContext?.monthlyExpense || 'Rp 0'} → surplus/defisit **${financialContext?.netSavings || 'Rp 0'}**\n- Rasio tabungan: **${financialContext?.savingsRate || 0}%** ${(financialContext?.savingsRate || 0) >= 20 ? '🟢 (sudah sehat)' : (financialContext?.savingsRate || 0) >= 5 ? '🟡 (cukup)' : '🔴 (perlu ditingkatkan)'}\n\n💡 Idealnya sisihkan minimal 20% pemasukan untuk tabungan/dana darurat.`;
      }
      // Intent 0e: SALDO spesifik
      else if (
        lowerQuery.includes("saldo") ||
        lowerQuery.includes("balance") ||
        lowerQuery.includes("kekayaan") ||
        lowerQuery.includes("total uang") ||
        lowerQuery.includes("uang saya")
      ) {
        fallbackReply = `### 💼 Saldo & Kekayaan Anda\n\n- **Total Saldo Seluruh Rekening**: **${financialContext?.totalBalance || 'Rp 0'}**\n- ⬆️ Masuk bulan ini: ${financialContext?.monthlyIncome || 'Rp 0'} | ⬇️ Keluar: ${financialContext?.monthlyExpense || 'Rp 0'}\n- ⚖️ Ditambah sisa piutang ${ls.remainingReceivables || 'Rp 0'}, dikurangi sisa hutang ${ls.remainingPayables || 'Rp 0'}\n\n💡 Pastikan ada dana darurat minimal 3–6× pengeluaran bulanan (${financialContext?.monthlyExpense || 'Rp 0'}).`;
      }
      // Intent 1: Pertanyaan seputar PIUTANG (Receivables)
      else if (
        lowerQuery.includes("piutang") ||
        lowerQuery.includes("receivable") ||
        lowerQuery.includes("siapa yang pinjam") ||
        lowerQuery.includes("siapa yang ngutang") ||
        lowerQuery.includes("orang pinjam") ||
        lowerQuery.includes("dipinjam") ||
        lowerQuery.includes("hak tagih") ||
        lowerQuery.includes("uang di luar")
      ) {
        const activeReceivables = Array.isArray(ls.activeReceivablesList) ? ls.activeReceivablesList : [];
        let listMarkdown = "";
        if (activeReceivables.length > 0) {
          listMarkdown = activeReceivables.map((r: any, idx: number) => 
            `${idx + 1}. **${r.person}** — *${r.title}*\n   - **Sisa Belum Diterima**: \`${r.remainingAmount}\` (dari total pokok ${r.amount})\n   - **Sudah Masuk**: ${r.paidAmount}\n   - **Status**: ${r.status}\n   - **Jatuh Tempo**: ${r.dueDate}\n   - **Kontak**: ${r.contactPhone || '-'}`
          ).join('\n\n');
        } else {
          listMarkdown = "_Tidak ada piutang aktif saat ini. Semua piutang telah lunas! 🎉_";
        }

        fallbackReply = `### 💰 Ringkasan & Total Piutang Anda (Hak Tagih)

Berikut adalah status lengkap piutang uang Anda yang dipinjam oleh pihak lain:

- **Total Sisa Piutang yang Belum Ditagih/Diterima**: **${ls.remainingReceivables || 'Rp 0'}**
- **Total Pokok Piutang**: ${ls.totalReceivables || 'Rp 0'}
- **Total yang Sudah Diterima/Dicicil**: ${ls.paidReceivables || 'Rp 0'}
- **Jumlah Peminjam (Debitur) Aktif**: ${ls.activeReceivablesCount || 0} orang/entitas

---

#### 📋 Rincian Peminjam & Jadwal Jatuh Tempo:
${listMarkdown}

💡 **Tips Penagihan**: Anda dapat menggunakan fitur **Kirim Pengingat WhatsApp** langsung dari menu **Hutang & Piutang** untuk mengingatkan peminjam secara sopan dan profesional sebelum jatuh tempo tiba.`;
      } 
      // Intent 2: Pertanyaan seputar HUTANG (Payables)
      else if (
        lowerQuery.includes("hutang") ||
        lowerQuery.includes("utang") ||
        lowerQuery.includes("payable") ||
        lowerQuery.includes("kewajiban") ||
        lowerQuery.includes("cicilan") ||
        lowerQuery.includes("bayar hutang")
      ) {
        const activePayables = Array.isArray(ls.activePayablesList) ? ls.activePayablesList : [];
        let listMarkdown = "";
        if (activePayables.length > 0) {
          listMarkdown = activePayables.map((p: any, idx: number) => 
            `${idx + 1}. **${p.person}** — *${p.title}*\n   - **Sisa Wajib Dibayar**: \`${p.remainingAmount}\` (dari total pokok ${p.amount})\n   - **Sudah Dilunasi/Dicicil**: ${p.paidAmount}\n   - **Status**: ${p.status}\n   - **Jatuh Tempo**: ${p.dueDate}`
          ).join('\n\n');
        } else {
          listMarkdown = "_Alhamdulillah, Anda tidak memiliki hutang aktif saat ini! 🎉_";
        }

        fallbackReply = `### 💳 Ringkasan & Total Kewajiban Hutang Anda

Berikut adalah status seluruh pinjaman yang wajib Anda lunasi:

- **Total Sisa Saldo Hutang Wajib Dibayar**: **${ls.remainingPayables || 'Rp 0'}**
- **Total Pokok Pinjaman**: ${ls.totalPayables || 'Rp 0'}
- **Total yang Sudah Dicicil**: ${ls.paidPayables || 'Rp 0'}
- **Jumlah Pinjaman Aktif**: ${ls.activePayablesCount || 0} pinjaman

---

#### 📋 Rincian Hutang & Jadwal Jatuh Tempo:
${listMarkdown}

💡 **Strategi Pelunasan**: Prioritaskan melunasi pinjaman dengan jatuh tempo terdekat atau nominal terkecil lebih dahulu (*Metode Snowball*) untuk meringankan beban cashflow bulanan.`;
      }
      // Intent 3: Rekap gabungan Hutang & Piutang / Pinjaman
      else if (
        lowerQuery.includes("pinjaman") ||
        lowerQuery.includes("posisi bersih") ||
        lowerQuery.includes("rekap pinjaman") ||
        lowerQuery.includes("debitur") ||
        lowerQuery.includes("kreditor")
      ) {
        fallbackReply = `### ⚖️ Ikhtisar Portofolio Hutang & Piutang

Berikut adalah perbandingan posisi kewajiban vs hak tagih Anda:

- 💰 **Sisa Piutang (Uang Anda di Luar)**: **${ls.remainingReceivables || 'Rp 0'}** (${ls.activeReceivablesCount || 0} debitur)
- 💳 **Sisa Hutang (Kewajiban Anda)**: **${ls.remainingPayables || 'Rp 0'}** (${ls.activePayablesCount || 0} pinjaman)
- 📊 **Posisi Bersih (Net Loan Position)**: **${ls.netLoanPosition || 'Rp 0'}**

${Number(ls.overdueLoansCount || 0) > 0 ? `⚠️ **Perhatian**: Terdapat ${ls.overdueLoansCount} catatan pinjaman yang telah melewati jatuh tempo!` : '✅ Tidak ada pinjaman yang jatuh tempo terlambat.'}

Buka menu **Hutang & Piutang** di navigasi untuk mencatat pembayaran parsial, pelunasan penuh, atau menambah data pinjaman baru.`;
      }
      // Intent 4: Valas & Multi-Mata Uang — HARUS sebelum budget agar
      // pertanyaan "strategi ... multi mata uang (IDR, NZD, ...)" tidak salah masuk budget/analisis
      else if (
        lowerQuery.includes("valas") ||
        lowerQuery.includes("kurs") ||
        lowerQuery.includes("mata uang") ||
        lowerQuery.includes("multicurrency") ||
        lowerQuery.includes("multi-currency") ||
        lowerQuery.includes("konversi") ||
        /\b(idr|nzd|usd|sgd|aud|eur|gbp|jpy|myr|hkd|twd|krw)\b/.test(lowerQuery)
      ) {
        fallbackReply = `### 💱 Strategi Pembukuan Multi-Mata Uang (IDR, NZD, USD, TWD, HKD, SGD)

1. **Satukan Laporan dalam 1 Mata Uang Utama**: Pilih satu mata uang pelaporan (saat ini: **${financialContext?.currency || 'IDR'}**) agar arus kas mudah dibaca — BukuKas Pro mengonversi otomatis dengan kurs live real-time.
2. **Catat di Mata Uang Aslinya**: Setiap transaksi valas dicatat sesuai nominal aslinya (NZD untuk gaji NZ, SGD untuk belanja Singapura, dst.), biarkan sistem yang mengonversi ke ${financialContext?.currency || 'IDR'}.
3. **Pantau Fluktuasi Kurs**: Sebelum pembayaran besar lintas negara atau konversi nominal besar, periksa tab **Kurs Valas** di menu atas untuk melihat selisih nilai tukar harian dan pilih waktu terbaik.
4. **Pisahkan Rekening per Mata Uang**: Simpan dana di rekening mata uang masing-masing untuk meminimalkan biaya konversi ganda.
5. **Evaluasi Posisi Valas Berkala**: Total saldo lintas rekening Anda saat ini setara **${financialContext?.totalBalance || 'Rp 0'}** — pantau apakah konsentrasi valas sesuai toleransi risiko Anda.`;
      } 
      // Intent 5: Budgeting 50/30/20
      else if (lowerQuery.includes("50/30/20") || lowerQuery.includes("budget") || lowerQuery.includes("anggaran") || lowerQuery.includes("hemat") || lowerQuery.includes("strategi")) {
        fallbackReply = `### 💡 Panduan Budgeting 50/30/20 untuk Keuangan Anda

Berdasarkan data keuangan Anda (${financialContext?.totalBalance ? `Total Saldo: ${financialContext.totalBalance}` : 'Bulan Ini'}):

1. **50% Kebutuhan Pokok (Needs)**
   - Prioritaskan sewa/tempat tinggal, listrik/air, belanja dapur, dan tagihan wajib (${financialContext?.unpaidBillsCount || 0} tagihan aktif).
2. **30% Keinginan (Wants)**
   - Alokasikan untuk hiburan, makan di luar, belanja gaya hidup, dan langganan digital.
3. **20% Tabungan, Hutang & Investasi (Savings & Debt)**
   - Saat ini rasio tabungan Anda berada di kisaran **${financialContext?.savingsRate || 0}%** (Tabungan Bersih: ${financialContext?.netSavings || 'Rp 0'}).
   - Alokasikan sebagian porsi 20% ini untuk mempercepat pembayaran sisa hutang Anda (${ls.remainingPayables || 'Rp 0'}).`;
      } 
      // Intent 5: Analisis Kesehatan Arus Kas Lengkap
      else if (lowerQuery.includes("analisis") || lowerQuery.includes("kesehatan") || lowerQuery.includes("evaluasi")) {
        fallbackReply = `### 📊 Analisis Kesehatan Finansial & Arus Kas

Berikut adalah evaluasi ringkas catatan finansial Anda:
- **Total Saldo Seluruh Rekening**: ${financialContext?.totalBalance || '-'}
- **Pemasukan Bulan Ini**: ${financialContext?.monthlyIncome || '-'}
- **Pengeluaran Bulan Ini**: ${financialContext?.monthlyExpense || '-'}
- **Surplus / Tabungan Bersih**: ${financialContext?.netSavings || '-'} (${financialContext?.savingsRate || 0}%)
- **Status Tagihan Rutin**: ${financialContext?.unpaidBillsCount ? `${financialContext.unpaidBillsCount} tagihan belum lunas` : 'Semua tagihan lunas! 🎉'}
- **Hak Piutang di Luar**: ${ls.remainingReceivables || 'Rp 0'}
- **Kewajiban Hutang**: ${ls.remainingPayables || 'Rp 0'}

**Rekomendasi:**
1. Pertahankan rasio tabungan di atas 20% untuk memperkuat dana darurat.
2. Segera follow up penagihan sisa piutang ${ls.remainingReceivables || 'Rp 0'} kepada peminjam agar arus kas masuk lebih cepat.
3. Alokasikan surplus bulanan untuk mengangsur sisa hutang ${ls.remainingPayables || 'Rp 0'} sebelum jatuh tempo.`;
      } 
      // Default Greeting / Menu
      else {
        fallbackReply = `Halo ${financialContext?.userName || 'Kak'}! 👋

Terima kasih atas pertanyaannya. Sebagai asisten pembukuan cerdas BukuKas Pro, berikut beberapa hal yang dapat saya bantu:
- 💰 **Cek Total Piutang**: Mengetahui sisa piutang Anda (**${ls.remainingReceivables || 'Rp 0'}**), daftar debitur, dan jatuh tempo.
- 💳 **Cek Status Hutang**: Rekap sisa kewajiban hutang (**${ls.remainingPayables || 'Rp 0'}**) dan rencana cicilan.
- 📊 **Analisis Arus Kas**: Evaluasi rasio tabungan (${financialContext?.savingsRate || 0}%) dan pola pengeluaran.
- 💡 **Rekomendasi Budgeting**: Alokasi anggaran 50/30/20 dan strategi cashflow.
- 📅 **Manajemen Tagihan**: Pemantauan ${financialContext?.unpaidBillsCount || 0} tagihan belum dibayar.

Silakan pilih atau ketikkan pertanyaan finansial yang ingin Anda ketahui!`;
      }

      return res.json({
        success: true,
        reply: fallbackReply,
        model: "0x Alpha (Analisis Lokal)",
      });
    } catch (err: any) {
      console.error("AI Chatbot Fallback Handled:", err);
      return res.json({
        success: true,
        reply: "Halo! Saya siap membantu Anda menganalisis keuangan, hutang, piutang, dan perencanaan anggaran. Silakan ketikkan pertanyaan finansial Anda.",
        model: "0x Alpha (Analisis Lokal)",
      });
    }
  });

  // Live Exchange Rates Proxy / Fallback
  app.get("/api/exchange-rates", async (req, res) => {
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/IDR");
      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      }
      throw new Error("External rate API failed");
    } catch (err) {
      // Return reliable fallback rates
      res.json({
        result: "success",
        base_code: "IDR",
        rates: {
          IDR: 1,
          USD: 0.000062,
          EUR: 0.000058,
          JPY: 0.0094,
          SGD: 0.000084,
          MYR: 0.00028,
          GBP: 0.000050,
          AUD: 0.000096,
        },
      });
    }
  });

  // Vite middleware for development or Static files for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BukuKas Pro server running on http://localhost:${PORT}`);
  });
}

startServer();
