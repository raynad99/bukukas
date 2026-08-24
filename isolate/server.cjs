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
    console.log("[DB] Tables created/verified: server_accounts, server_messages");
  } catch (err) {
    console.warn("[DB] Table creation error:", err);
  }
}

// server.ts
import_dotenv.default.config();
import_dotenv.default.config({ path: ".env.local", override: true });
initDatabase();
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
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "BukuKas Pro Business Mail & Backend API",
      businessEmail: "admin@bukukas.ai.studio",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      activeServerMessagesCount: inMemoryServerMessages.length,
      capabilities: ["inbound-email-receiver", "gmail-dispatcher", "license-manager", "rates-proxy", "ox-alpha-chat"],
      alphaKeyConfigured: !!process.env.OPENROUTER_API_KEY,
      database: isDbAvailable() ? "neon-postgres" : "json-file"
    });
  });
  app.get("/api/accounts", async (req, res) => {
    try {
      if (isDbAvailable()) {
        const sql2 = getSql();
        const rows = await sql2`SELECT * FROM server_accounts ORDER BY synced_at DESC`;
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
          syncedAt: r.synced_at
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
  app.post("/api/accounts/upsert", async (req, res) => {
    try {
      const incoming = req.body?.accounts || (req.body?.account ? [req.body.account] : []);
      if (!Array.isArray(incoming) || incoming.length === 0) {
        return res.status(400).json({ error: "Field 'account' or 'accounts' array is required." });
      }
      let upserted = 0;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      if (isDbAvailable()) {
        const sql2 = getSql();
        for (const raw of incoming) {
          if (!raw?.id || !raw?.email) continue;
          const email = String(raw.email).toLowerCase();
          const customNotes = typeof raw.customNotes === "string" && !raw.customNotes.toLowerCase().includes("password") ? String(raw.customNotes) : void 0;
          await sql2`
            INSERT INTO server_accounts (id, name, email, photo_url, provider, role, plan, status, registered_self, created_at, last_login_at, trial_expires_date, paid_expires_date, custom_notes, synced_at)
            VALUES (${String(raw.id)}, ${String(raw.name || email.split("@")[0])}, ${email}, ${raw.photoUrl ? String(raw.photoUrl) : null}, ${String(raw.provider || "password")}, ${String(raw.role || "user")}, ${String(raw.plan || "trial")}, ${raw.status ? String(raw.status) : null}, ${Boolean(raw.registeredSelf)}, ${String(raw.createdAt || now)}, ${String(raw.lastLoginAt || "-")}, ${raw.trialExpiresDate ? String(raw.trialExpiresDate) : null}, ${raw.paidExpiresDate ? String(raw.paidExpiresDate) : null}, ${customNotes || null}, ${now})
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, photo_url = EXCLUDED.photo_url, provider = EXCLUDED.provider, role = EXCLUDED.role, plan = EXCLUDED.plan, status = EXCLUDED.status, registered_self = EXCLUDED.registered_self, created_at = EXCLUDED.created_at, last_login_at = EXCLUDED.last_login_at, trial_expires_date = EXCLUDED.trial_expires_date, paid_expires_date = EXCLUDED.paid_expires_date, custom_notes = EXCLUDED.custom_notes, synced_at = EXCLUDED.synced_at
          `;
          upserted += 1;
        }
        return res.json({ success: true, upserted, total: upserted });
      }
      for (const raw of incoming) {
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
