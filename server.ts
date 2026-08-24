import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Muat variabel environment (.env lalu override dengan .env.local bila ada)
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

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

const inMemoryServerMessages: ServerBusinessMessage[] = [
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "BukuKas Pro Business Mail & Backend API",
      businessEmail: "admin@bukukas.ai.studio",
      timestamp: new Date().toISOString(),
      activeServerMessagesCount: inMemoryServerMessages.length,
      capabilities: ["inbound-email-receiver", "gmail-dispatcher", "license-manager", "rates-proxy", "ox-alpha-chat"],
      alphaKeyConfigured: !!process.env.OPENROUTER_API_KEY,
    });
  });

  // Account Registry - list all registered accounts (Dev Portal + isolation sync)
  app.get("/api/accounts", (req, res) => {
    const accounts = Array.from(inMemoryServerAccounts.values()).sort(
      (a, b) => new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime()
    );
    res.json({ success: true, total: accounts.length, accounts });
  });

  // Account Registry - upsert one account or a batch: { account } | { accounts: [...] }
  // Passwords and other secrets are stripped before persisting.
  app.post("/api/accounts/upsert", (req, res) => {
    try {
      const incoming: any[] = req.body?.accounts || (req.body?.account ? [req.body.account] : []);
      if (!Array.isArray(incoming) || incoming.length === 0) {
        return res.status(400).json({ error: "Field 'account' or 'accounts' array is required." });
      }

      let upserted = 0;
      for (const raw of incoming) {
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
          createdAt: String(raw.createdAt || new Date().toISOString()),
          lastLoginAt: String(raw.lastLoginAt || "-"),
          trialExpiresDate: raw.trialExpiresDate ? String(raw.trialExpiresDate) : undefined,
          paidExpiresDate: raw.paidExpiresDate ? String(raw.paidExpiresDate) : undefined,
          customNotes: typeof raw.customNotes === "string" && !raw.customNotes.toLowerCase().includes("password")
            ? String(raw.customNotes)
            : undefined,
          syncedAt: new Date().toISOString(),
        });
        upserted += 1;
      }

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
  app.get("/api/business-email/messages", (req, res) => {
    res.json({
      success: true,
      businessEmail: "admin@bukukas.ai.studio",
      total: inMemoryServerMessages.length,
      messages: inMemoryServerMessages,
    });
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

      inMemoryServerMessages.unshift(serverMsg);

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

      inMemoryServerMessages.unshift(serverMsg);

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
  app.post("/api/business-email/reply", (req, res) => {
    try {
      const { messageId, replyText } = req.body;
      if (!messageId || !replyText) {
        return res.status(400).json({ error: "messageId and replyText are required." });
      }

      const msg = inMemoryServerMessages.find(m => m.id === messageId);
      if (msg) {
        msg.replyText = replyText;
        msg.repliedAt = new Date().toISOString();
        msg.isRead = true;
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
  app.delete("/api/business-email/:id", (req, res) => {
    const { id } = req.params;
    const idx = inMemoryServerMessages.findIndex(m => m.id === id);
    if (idx !== -1) {
      inMemoryServerMessages.splice(idx, 1);
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
