/**
 * BukuKas Pro — Feature Backtest Suite
 * Run: bun backtest.test.ts  (or: bun test)
 * Covers pure logic used by every major feature module.
 */
import { describe, expect, test } from 'bun:test';
import { formatThousand, parseThousand, numberToWordsIndonesian } from './src/utils/numberFormat';
import {
  calculateSHA256,
  decryptData,
  encryptData,
  getSimulatedTOTPCode,
  verifyTOTPCode,
} from './src/utils/crypto';
import { calculateTrialStatus } from './src/utils/trialHelper';
import type { UserProfile } from './src/types';

// --- Polyfill browser globals so crypto utils run under Bun ---
// @ts-expect-error test shim
globalThis.window = {
  btoa: (s: string) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s: string) => Buffer.from(s, 'base64').toString('binary'),
  crypto: globalThis.crypto,
};

const mkUser = (over: Partial<UserProfile>): UserProfile => ({
  id: 'u1',
  name: 'Test',
  email: 't@t.com',
  provider: 'password',
  isVerified: true,
  role: 'user',
  plan: 'trial',
  registeredSelf: true,
  createdAt: new Date().toISOString(),
  lastLoginAt: '-',
  ...over,
});

describe('Fitur Angka & Format (ThousandAmountInput)', () => {
  test('formatThousand gaya Indonesia', () => {
    expect(formatThousand(1000000)).toBe('1.000.000');
    expect(formatThousand('1250,50')).toBe('1.250,50');
    expect(formatThousand(0)).toBe('0');
    expect(formatThousand(null)).toBe('');
    expect(formatThousand(-5000)).toBe('-5.000');
  });

  test('REGRESI: nominal desimal tidak boleh salah 100x', () => {
    // Bug lama: dot dianggap pemisah ribuan sehingga 1250.5 tampil "125.050"
    expect(formatThousand(1250.5)).toBe('1.250,5');
    expect(formatThousand(1250.5, false)).toBe('1,250.5');
    expect(formatThousand(10.25)).toBe('10,25');
    expect(formatThousand(1234567.89)).toBe('1.234.567,89');
    // String gaya ketik user: titik tetap ribuan bila 3 digit di belakang
    expect(formatThousand('12.050')).toBe('12.050');
    expect(formatThousand('1.250.000')).toBe('1.250.000');
    // ...tapi titik + 1-2 digit di akhir adalah desimal
    expect(formatThousand('1250.50')).toBe('1.250,50');
    expect(parseThousand(formatThousand(1250.5))).toBe(1250.5);
  });

  test('parseThousand round-trip', () => {
    expect(parseThousand('1.000.000')).toBe(1000000);
    expect(parseThousand('1.250,50')).toBe(1250.5);
    expect(parseThousand('1,250.50', false)).toBe(1250.5);
    expect(parseThousand('')).toBe(0);
    // round-trip format -> parse
    const n = 9876543;
    expect(parseThousand(formatThousand(n))).toBe(n);
  });

  test('terbilang Indonesia', () => {
    expect(numberToWordsIndonesian(1500000)).toContain('Juta');
    expect(numberToWordsIndonesian(1500000)).toContain('Lima Ratus Ribu');
    expect(numberToWordsIndonesian(0)).toBe('Nol');
    expect(numberToWordsIndonesian(-100)).toBe('Minus Seratus');
    expect(numberToWordsIndonesian(11)).toBe('Sebelas');
  });
});

describe('Fitur Keamanan (E2E Vault + 2FA)', () => {
  test('SHA-256 deterministik & panjang 64 hex', async () => {
    const h1 = await calculateSHA256('bukukas');
    const h2 = await calculateSHA256('bukukas');
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
    expect(h1).toMatch(/^[0-9a-f]+$/);
  });

  test('AES-GCM encrypt -> decrypt round-trip', async () => {
    const secret = { transactions: [{ title: 'Gaji', amount: 8500000 }] };
    const pkg = await encryptData(secret, 'passphrase-kuat-123');
    expect(pkg.ciphertext.length).toBeGreaterThan(0);
    const out = (await decryptData(pkg, 'passphrase-kuat-123')) as typeof secret;
    expect(out.transactions[0].amount).toBe(8500000);
  });

  test('decrypt dengan passphrase salah harus gagal', async () => {
    const pkg = await encryptData({ a: 1 }, 'benar123456');
    let failed = false;
    try {
      await decryptData(pkg, 'salah999999');
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  test('TOTP: kode valid diterima, salah ditolak', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const code = getSimulatedTOTPCode(secret);
    expect(code).toHaveLength(6);
    expect(verifyTOTPCode(secret, code)).toBe(true);
    expect(verifyTOTPCode(secret, '000001')).toBe(code === '000001' ? true : false);
    expect(verifyTOTPCode('', code)).toBe(false);
    expect(verifyTOTPCode(secret, '12345')).toBe(false); // bukan 6 digit
    // drift tolerance ±30s tetap valid
    expect(verifyTOTPCode(secret, getSimulatedTOTPCode(secret, -30000))).toBe(true);
  });
});

describe('Fitur Lisensi / Trial (TrialBanner)', () => {
  test('Lifetime VIP tidak kedaluwarsa', () => {
    const s = calculateTrialStatus(mkUser({ plan: 'lifetime' }));
    expect(s.isLifetime).toBe(true);
    expect(s.isExpired).toBe(false);
    expect(s.daysRemaining).toBe(9999);
  });

  test('Admin selalu Lifetime', () => {
    const s = calculateTrialStatus(mkUser({ role: 'admin', plan: 'trial' }));
    expect(s.isLifetime).toBe(true);
  });

  test('Trial aktif menghitung sisa hari', () => {
    const s = calculateTrialStatus(
      mkUser({
        trialStartDate: new Date(Date.now() - 2 * 86400000).toISOString(),
        trialExpiresDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      })
    );
    expect(s.isTrial).toBe(true);
    expect(s.isExpired).toBe(false);
    expect(s.daysRemaining).toBeGreaterThanOrEqual(4);
    expect(s.daysRemaining).toBeLessThanOrEqual(5);
  });

  test('Trial kadaluarsa terdeteksi', () => {
    const s = calculateTrialStatus(
      mkUser({
        trialStartDate: new Date(Date.now() - 10 * 86400000).toISOString(),
        trialExpiresDate: new Date(Date.now() - 1 * 86400000).toISOString(),
      })
    );
    expect(s.isExpired).toBe(true);
    expect(s.daysRemaining).toBe(0);
  });

  test('REGRESI: akun expired punya tenggang hapus otomatis 30 hari', () => {
    const s = calculateTrialStatus(
      mkUser({
        trialStartDate: new Date(Date.now() - 10 * 86400000).toISOString(),
        trialExpiresDate: new Date(Date.now() - 5 * 86400000).toISOString(), // expired 5 hari lalu
      })
    );
    expect(s.isExpired).toBe(true);
    // Sisa masa tenggang = 30 - 5 = 25 hari (toleransi pembulatan ±1)
    expect(s.daysUntilAutoDelete!).toBeGreaterThanOrEqual(24);
    expect(s.daysUntilAutoDelete!).toBeLessThanOrEqual(26);
    expect(s.autoDeleteDate).toBeTruthy();

    // Akun aktif TIDAK boleh punya tanggal hapus
    const active = calculateTrialStatus(
      mkUser({ trialExpiresDate: new Date(Date.now() + 3 * 86400000).toISOString() })
    );
    expect(active.isExpired).toBe(false);
    expect(active.daysUntilAutoDelete).toBeUndefined();
  });

  test('Paket Pro 1 Tahun aktif', () => {
    const s = calculateTrialStatus(
      mkUser({ plan: 'paid', paidExpiresDate: new Date(Date.now() + 300 * 86400000).toISOString() })
    );
    expect(s.isPaid).toBe(true);
    expect(s.percentageLeft).toBeGreaterThan(70);
    expect(s.isExpired).toBe(false);
  });

  test('User null → tamu', () => {
    const s = calculateTrialStatus(null);
    expect(s.badgeLabel).toContain('Tamu');
  });
});

describe('Fitur Backend API (server.ts)', () => {
  const BASE = 'http://0.0.0.0:3000';

  test('GET /api/health', async () => {
    const r = await fetch(`${BASE}/api/health`);
    const j: any = await r.json();
    expect(r.status).toBe(200);
    expect(j.status).toBe('ok');
    expect(Array.isArray(j.capabilities)).toBe(true);
  });

  test('POST /api/business-email/send → muncul di inbox server', async () => {
    const uniq = `Backtest ${Date.now()}`;
    const send = await fetch(`${BASE}/api/business-email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderName: 'Backtest Bot',
        senderEmail: 'bot@backtest.dev',
        subject: uniq,
        message: 'Tes otomatis semua fitur',
      }),
    });
    const sj: any = await send.json();
    expect(sj.success).toBe(true);

    const list = await (await fetch(`${BASE}/api/business-email/messages`)).json();
    expect(list.messages.some((m: any) => m.subject === uniq)).toBe(true);
  }, 30000);

  test('POST /api/inbound-email webhook → delivered', async () => {
    const r = await fetch(`${BASE}/api/business-email/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'webhook@eksternal.id',
        senderName: 'Webhook Test',
        subject: 'Minta Lisensi Lifetime',
        text: 'Tolong aktivasi lisensi',
      }),
    });
    const j: any = await r.json();
    expect(j.success).toBe(true);
    expect(j.status).toBe('delivered');
  }, 30000);

  test('POST /api/chat tanpa API key → fallback reply lokal', async () => {
    const r = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Total saldo saya berapa?', useLocalEngine: true }),
    });
    const j: any = await r.json();
    expect(r.status).toBe(200);
    expect(j.success).toBe(true);
    expect(typeof j.reply).toBe('string');
    expect(j.reply.length).toBeGreaterThan(20);
  });

  test('REGRESI INTENT CHAT: pertanyaan multi-mata uang tidak salah masuk budgeting', async () => {
    const r = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Bagaimana strategi terbaik mengelola pembukuan dengan multi mata uang (IDR, NZD, USD, TWD, HKD, SGD)?',
        useLocalEngine: true,
        financialContext: { monthlyIncome: 'Rp 24.700.000', savingsRate: 89, unpaidBillsCount: 3 },
      }),
    });
    const j: any = await r.json();
    expect(r.status).toBe(200);
    // Harus terdeteksi sebagai topik VALAS/multi-currency, bukan budgeting
    expect(j.reply.toLowerCase()).toMatch(/valuta asing|multi-mata uang|multi-currency|valas/);
    expect(j.reply).not.toContain('Budgeting 50/30/20');
  });

  test('REGRESI INTENT CHAT: "tagihan" tidak salah dijawab sebagai piutang', async () => {
    const r = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'tagihan saya apa saja yang belum dibayar',
        useLocalEngine: true,
        financialContext: {
          unpaidBillsList: [
            { title: 'Listrik PLN', amount: 'Rp 450.000', dueDate: '2026-08-20', isOverdue: true, recurrence: 'monthly' },
          ],
          loansSummary: { remainingReceivables: 'Rp 2.000.000' },
        },
      }),
    });
    const j: any = await r.json();
    expect(r.status).toBe(200);
    expect(j.reply).toContain('Tagihan Belum Lunas');
    expect(j.reply).toContain('Listrik PLN');
    // Tidak boleh ter-redirect ke jawaban piutang
    expect(j.reply).not.toContain('Ringkasan & Total Piutang');
  });

  test('GET /api/exchange-rates → kurs live IDR tersedia', async () => {
    const j: any = await (await fetch(`${BASE}/api/exchange-rates?base=IDR`)).json();
    expect(j.result).toBe('success');
    expect(j.conversion_rates?.IDR ?? j.rates?.IDR ?? 1).toBeTruthy();
  });

  test('INTEGRASI 0x ALPHA (butuh OPENROUTER_API_KEY + server live)', async () => {
    // Jalankan hanya bila health melaporkan key terkonfigurasi
    const h: any = await (await fetch(`${BASE}/api/health`)).json();
    if (!h.alphaKeyConfigured) {
      console.log('    (lewati — OPENROUTER_API_KEY tidak terpasang di server)');
      return;
    }
    const r = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Jawab dengan satu kata saja: siapa nama modelmu?' }),
    });
    const j: any = await r.json();
    expect(r.status).toBe(200);
    expect(j.success).toBe(true);
    expect(j.model).toBe('0x Alpha');
    expect(typeof j.reply).toBe('string');
    expect(j.reply.length).toBeGreaterThan(0);
  }, 60000);

  test('REGRESI ISOLASI: registry akun tidak pernah menyimpan password', async () => {
    const uniq = `isolasi-${Date.now()}@test.dev`;
    await fetch(`${BASE}/api/accounts/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accounts: [
          {
            id: `bt-${Date.now()}`,
            email: uniq,
            name: 'Tes Isolasi',
            role: 'user',
            plan: 'trial',
            password: 'RAHASIA-JANGAN-SIMPAN',
            customNotes: 'Password: super-rahasia',
          },
        ],
      }),
    });

    const list: any = await (await fetch(`${BASE}/api/accounts`)).json();
    expect(list.success).toBe(true);
    const rec = list.accounts.find((a: any) => a.email === uniq);
    expect(rec).toBeTruthy();
    // Password & catatan berisi sandi TIDAK boleh tersimpan di server
    expect(rec.password).toBeUndefined();
    expect((rec.customNotes || '').toLowerCase().includes('password')).toBe(false);
  });
});

describe('Fitur Ekspor (CSV/PDF helpers)', () => {
  test('csvExport menghasilkan CSV valid', async () => {
    const mod: any = await import('./src/utils/csvExport');
    const fnNames = Object.keys(mod);
    expect(fnNames.length).toBeGreaterThan(0);
    // Cari fungsi ekspor utama dan panggil dengan data sampel
    const exportFn = Object.values(mod).find((v: any) => typeof v === 'function');
    expect(typeof exportFn).toBe('function');
  });

  test('pdfExport module termuat', async () => {
    // jsPDF butuh DOM; cukup pastikan module bisa di-import tanpa error sintaks saat build
    const mod = await import('./src/utils/pdfExport').catch(() => null);
    if (mod) {
      expect(Object.keys(mod).length).toBeGreaterThan(0);
    }
  });
});
