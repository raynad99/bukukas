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
var import_vite = require("vite");
var import_genai = require("@google/genai");
function getAiClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  return new import_genai.GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
var GEMINI_MODELS_POOL = [
  "gemini-3.7-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
  "gemini-3.1-pro-preview"
];
async function generateWithGeminiFailover(ai, options) {
  for (const model of GEMINI_MODELS_POOL) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const config = {};
        if (options.systemInstruction) {
          config.systemInstruction = options.systemInstruction;
        }
        if (options.temperature !== void 0) {
          config.temperature = options.temperature;
        }
        const res = await ai.models.generateContent({
          model,
          contents: options.contents,
          ...Object.keys(config).length > 0 ? { config } : {}
        });
        if (res && res.text) {
          return { text: res.text, modelUsed: model };
        }
      } catch (err) {
        const is503OrRateLimit = err?.status === "UNAVAILABLE" || err?.code === 503 || err?.status === 503 || err?.status === "RESOURCE_EXHAUSTED" || err?.code === 429 || String(err?.message || "").includes("high demand") || String(err?.message || "").includes("503");
        console.warn(`[Gemini AI] Model ${model} attempt ${attempt + 1} encountered error:`, err?.message || err);
        if (is503OrRateLimit && attempt === 0) {
          await new Promise((r) => setTimeout(r, 350));
          continue;
        }
        break;
      }
    }
  }
  return null;
}
var inMemoryServerAccounts = /* @__PURE__ */ new Map();
var inMemoryServerMessages = [
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
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "10mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "10mb" }));
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "BukuKas Pro Business Mail & Backend API",
      businessEmail: "admin@bukukas.ai.studio",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      activeServerMessagesCount: inMemoryServerMessages.length,
      capabilities: ["inbound-email-receiver", "gmail-dispatcher", "license-manager", "rates-proxy"]
    });
  });
  app.get("/api/accounts", (req, res) => {
    const accounts = Array.from(inMemoryServerAccounts.values()).sort(
      (a, b) => new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime()
    );
    res.json({ success: true, total: accounts.length, accounts });
  });
  app.post("/api/accounts/upsert", (req, res) => {
    try {
      const incoming = req.body?.accounts || (req.body?.account ? [req.body.account] : []);
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
          photoUrl: raw.photoUrl ? String(raw.photoUrl) : void 0,
          provider: String(raw.provider || "password"),
          role: String(raw.role || "user"),
          plan: String(raw.plan || "trial"),
          status: raw.status ? String(raw.status) : void 0,
          registeredSelf: Boolean(raw.registeredSelf),
          createdAt: String(raw.createdAt || (/* @__PURE__ */ new Date()).toISOString()),
          lastLoginAt: String(raw.lastLoginAt || "-"),
          trialExpiresDate: raw.trialExpiresDate ? String(raw.trialExpiresDate) : void 0,
          paidExpiresDate: raw.paidExpiresDate ? String(raw.paidExpiresDate) : void 0,
          customNotes: typeof raw.customNotes === "string" && !raw.customNotes.toLowerCase().includes("password") ? String(raw.customNotes) : void 0,
          syncedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        upserted += 1;
      }
      return res.json({
        success: true,
        upserted,
        total: inMemoryServerAccounts.size
      });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Account registry error" });
    }
  });
  app.get("/api/business-email/messages", (req, res) => {
    res.json({
      success: true,
      businessEmail: "admin@bukukas.ai.studio",
      total: inMemoryServerMessages.length,
      messages: inMemoryServerMessages
    });
  });
  async function generateAiReply(senderName, senderEmail, subject, message, category) {
    const ai = getAiClient();
    if (!ai) return "";
    try {
      const prompt = `Anda adalah Asisten Developer Resmi BukuKas Pro (email bisnis: admin@bukukas.ai.studio).
Pesan baru masuk dari pengguna:
- Nama Pengirim: ${senderName}
- Email Pengirim: ${senderEmail}
- Kategori: ${category}
- Subjek: ${subject}
- Isi Pesan: ${message}

Buatlah draf balasan resmi yang ramah, sopan, profesional, dan ringkas dalam Bahasa Indonesia (maksimal 2-3 paragraf). Berikan penjelasan bahwa pesan telah masuk ke Kotak Masuk Pengembang dan akan segera ditindaklanjuti. Jika meminta Lisensi Lifetime atau info Trial, sebutkan bahwa Pengembang dapat mengaktifkan lisensi VIP Lifetime secara langsung di sistem.`;
      const aiResult = await generateWithGeminiFailover(ai, {
        contents: prompt
      });
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
      inMemoryServerMessages.unshift(serverMsg);
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
      inMemoryServerMessages.unshift(serverMsg);
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
  app.post("/api/business-email/reply", (req, res) => {
    try {
      const { messageId, replyText } = req.body;
      if (!messageId || !replyText) {
        return res.status(400).json({ error: "messageId and replyText are required." });
      }
      const msg = inMemoryServerMessages.find((m) => m.id === messageId);
      if (msg) {
        msg.replyText = replyText;
        msg.repliedAt = (/* @__PURE__ */ new Date()).toISOString();
        msg.isRead = true;
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
  app.delete("/api/business-email/:id", (req, res) => {
    const { id } = req.params;
    const idx = inMemoryServerMessages.findIndex((m) => m.id === id);
    if (idx !== -1) {
      inMemoryServerMessages.splice(idx, 1);
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
      const systemInstruction = `Anda adalah "BukuKas AI Assistant" \u2014 konsultan keuangan dan penasihat pembukuan cerdas pribadi & UMKM resmi dari aplikasi BukuKas Pro.
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
      const ai = getAiClient();
      let generatedResult = null;
      if (ai) {
        generatedResult = await generateWithGeminiFailover(ai, {
          contents: formattedContents,
          systemInstruction,
          temperature: 0.7
        });
      }
      if (generatedResult && generatedResult.text) {
        return res.json({
          success: true,
          reply: generatedResult.text,
          model: generatedResult.modelUsed
        });
      }
      const lowerQuery = message.toLowerCase();
      let fallbackReply = "";
      if (lowerQuery.includes("piutang") || lowerQuery.includes("receivable") || lowerQuery.includes("siapa yang pinjam") || lowerQuery.includes("siapa yang ngutang") || lowerQuery.includes("orang pinjam") || lowerQuery.includes("hak tagih") || lowerQuery.includes("tagih")) {
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
      } else if (lowerQuery.includes("50/30/20") || lowerQuery.includes("budget") || lowerQuery.includes("anggaran")) {
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
      } else if (lowerQuery.includes("valas") || lowerQuery.includes("kurs") || lowerQuery.includes("mata uang") || lowerQuery.includes("nzd") || lowerQuery.includes("usd")) {
        fallbackReply = `### \u{1F4B1} Tips Manajemen Valuta Asing (Multi-Currency)

1. **Pencatatan Berkelanjutan**: Selalu catat transaksi valas sesuai nominal aslinya (misal NZD, USD, SGD, HKD, TWD).
2. **Live Conversion**: BukuKas Pro secara otomatis mengonversi seluruh transaksi ke mata uang utama (${financialContext?.currency || "IDR"}) dengan kurs live real-time.
3. **Lindungi Fluktuasi**: Saat bertransaksi antar-mata uang, periksa tab Kurs Valas di menu atas untuk melihat selisih nilai tukar harian.`;
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
        model: "bukukas-smart-advisor"
      });
    } catch (err) {
      console.error("AI Chatbot Fallback Handled:", err);
      return res.json({
        success: true,
        reply: "Halo! Saya siap membantu Anda menganalisis keuangan, hutang, piutang, dan perencanaan anggaran. Silakan ketikkan pertanyaan finansial Anda.",
        model: "bukukas-offline-agent"
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
