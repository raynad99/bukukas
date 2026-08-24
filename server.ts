import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

function getAiClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper for generating AI content with multi-model fallback and 503 retry resilience
const GEMINI_MODELS_POOL = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.7-flash",
];

async function generateWithGeminiFailover(
  ai: GoogleGenAI,
  options: {
    contents: any;
    systemInstruction?: string;
    temperature?: number;
  }
): Promise<{ text: string; modelUsed: string } | null> {
  for (const model of GEMINI_MODELS_POOL) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const config: any = {};
        if (options.systemInstruction) {
          config.systemInstruction = options.systemInstruction;
        }
        if (options.temperature !== undefined) {
          config.temperature = options.temperature;
        }

        const res = await ai.models.generateContent({
          model,
          contents: options.contents,
          ...(Object.keys(config).length > 0 ? { config } : {}),
        });

        if (res && res.text) {
          return { text: res.text, modelUsed: model };
        }
      } catch (err: any) {
        const is503OrRateLimit =
          err?.status === "UNAVAILABLE" ||
          err?.code === 503 ||
          err?.status === 503 ||
          err?.status === "RESOURCE_EXHAUSTED" ||
          err?.code === 429 ||
          String(err?.message || "").includes("high demand") ||
          String(err?.message || "").includes("503");

        console.warn(`[Gemini AI] Model ${model} attempt ${attempt + 1} encountered error:`, err?.message || err);

        if (is503OrRateLimit && attempt === 0) {
          // Wait 350ms before trying same or next model
          await new Promise((r) => setTimeout(r, 350));
          continue;
        }
        // Move to next candidate model
        break;
      }
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
      capabilities: ["inbound-email-receiver", "gmail-dispatcher", "license-manager", "rates-proxy"],
    });
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
        contents: prompt,
      });

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

      let contextDescription = "";
      if (financialContext) {
        contextDescription = `
Konteks Finansial Pengguna BukuKas Pro Saat Ini:
- Mata Uang Utama: ${financialContext.currency || 'IDR'}
- Total Saldo: ${financialContext.totalBalance || '0'}
- Pemasukan Bulan Ini: ${financialContext.monthlyIncome || '0'}
- Pengeluaran Bulan Ini: ${financialContext.monthlyExpense || '0'}
- Tabungan Bersih: ${financialContext.netSavings || '0'} (${financialContext.savingsRate || 0}% rasio tabungan)
- Tagihan Belum Lunas: ${financialContext.unpaidBillsCount || 0} tagihan
- Nama Pengguna: ${financialContext.userName || 'Pengguna BukuKas Pro'}
`;
      }

      const systemInstruction = `Anda adalah "BukuKas AI Assistant" — konsultan keuangan dan penasihat pembukuan cerdas pribadi & UMKM resmi dari aplikasi BukuKas Pro.
Karakter Anda:
- Sangat ramah, bijak, solutif, analitis, dan profesional.
- Ahli dalam manajemen arus kas, rumus budgeting (50/30/20, amplop, zero-based), investasi pemula, pemantauan tagihan, dan konversi multi-mata uang (IDR, NZD, USD, SGD, AUD, EUR, GBP, JPY, MYR, HKD, TWD, BGN, KRW).
- Berikan saran yang praktis, terstruktur dengan poin-poin jelas atau angka yang mudah dipahami.
- Gunakan Bahasa Indonesia yang luwes, profesional, dan menyenangkan (atau gunakan bahasa yang sama dengan pengguna jika pengguna menyapa dalam bahasa lain).
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

      const ai = getAiClient();
      let generatedResult: { text: string; modelUsed: string } | null = null;

      if (ai) {
        generatedResult = await generateWithGeminiFailover(ai, {
          contents: formattedContents,
          systemInstruction,
          temperature: 0.7,
        });
      }

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

      if (lowerQuery.includes("50/30/20") || lowerQuery.includes("budget") || lowerQuery.includes("anggaran")) {
        fallbackReply = `### 💡 Panduan Budgeting 50/30/20 untuk Keuangan Anda

Berdasarkan data keuangan Anda (${financialContext?.totalBalance ? `Total Saldo: ${financialContext.totalBalance}` : 'Bulan Ini'}):

1. **50% Kebutuhan Pokok (Needs)**
   - Prioritaskan sewa/tempat tinggal, listrik/air, belanja dapur, dan tagihan wajib (${financialContext?.unpaidBillsCount || 0} tagihan aktif).
2. **30% Keinginan (Wants)**
   - Alokasikan untuk hiburan, makan di luar, belanja gaya hidup, dan langganan digital.
3. **20% Tabungan & Investasi (Savings & Debt)**
   - Saat ini rasio tabungan Anda berada di kisaran **${financialContext?.savingsRate || 0}%** (Tabungan Bersih: ${financialContext?.netSavings || 'Rp 0'}).
   - Targetkan menyisihkan dana darurat minimal 3–6 bulan pengeluaran rutin.`;
      } else if (lowerQuery.includes("analisis") || lowerQuery.includes("kesehatan") || lowerQuery.includes("evaluasi")) {
        fallbackReply = `### 📊 Analisis Kesehatan Arus Kas Anda

Berikut adalah evaluasi ringkas catatan finansial Anda:
- **Total Saldo Seluruh Rekening**: ${financialContext?.totalBalance || '-'}
- **Pemasukan Bulan Ini**: ${financialContext?.monthlyIncome || '-'}
- **Pengeluaran Bulan Ini**: ${financialContext?.monthlyExpense || '-'}
- **Surplus / Tabungan Bersih**: ${financialContext?.netSavings || '-'} (${financialContext?.savingsRate || 0}%)
- **Status Tagihan**: ${financialContext?.unpaidBillsCount ? `${financialContext.unpaidBillsCount} tagihan belum lunas` : 'Semua tagihan lunas! 🎉'}

**Rekomendasi:**
- Pantau kategori pengeluaran tertinggi Anda dan tetapkan batas maksimal per kategori di menu **Kategori**.
- Pastikan tagihan jatuh tempo dibayar tepat waktu untuk menghindari denda.`;
      } else if (lowerQuery.includes("valas") || lowerQuery.includes("kurs") || lowerQuery.includes("mata uang") || lowerQuery.includes("nzd") || lowerQuery.includes("usd")) {
        fallbackReply = `### 💱 Tips Manajemen Valuta Asing (Multi-Currency)

1. **Pencatatan Berkelanjutan**: Selalu catat transaksi valas sesuai nominal aslinya (misal NZD, USD, SGD, HKD, TWD).
2. **Live Conversion**: BukuKas Pro secara otomatis mengonversi seluruh transaksi ke mata uang utama (${financialContext?.currency || 'IDR'}) dengan kurs live real-time.
3. **Lindungi Fluktuasi**: Saat bertransaksi antar-mata uang, periksa tab Kurs Valas di menu atas untuk melihat selisih nilai tukar harian.`;
      } else {
        fallbackReply = `Halo ${financialContext?.userName || 'Kak'}! 👋

Terima kasih atas pertanyaannya. Sebagai asisten pembukuan BukuKas Pro, berikut beberapa hal yang dapat saya bantu:
- 📊 **Analisis Arus Kas**: Evaluasi rasio tabungan (${financialContext?.savingsRate || 0}%) dan pola pengeluaran.
- 💡 **Rekomendasi Budgeting**: Alokasi anggaran 50/30/20 berdasarkan saldo ${financialContext?.totalBalance || 'Anda'}.
- 💱 **Multi Mata Uang**: Panduan kurs valuta asing (IDR, NZD, USD, SGD, HKD, TWD, dll).
- 📅 **Manajemen Tagihan**: Pemantauan jadwal jatuh tempo ${financialContext?.unpaidBillsCount || 0} tagihan belum dibayar.

Silakan pilih atau tanyakan topik spesifik yang ingin Anda diskusikan!`;
      }

      return res.json({
        success: true,
        reply: fallbackReply,
        model: "bukukas-smart-advisor",
      });
    } catch (err: any) {
      console.error("AI Chatbot Fallback Handled:", err);
      return res.json({
        success: true,
        reply: "Halo! Saya siap membantu Anda menganalisis keuangan, tagihan, dan perencanaan anggaran. Silakan ketikkan pertanyaan finansial Anda.",
        model: "bukukas-offline-agent",
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
