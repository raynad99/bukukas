import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  Check,
  Copy,
  CornerDownLeft,
  DollarSign,
  HandCoins,
  HelpCircle,
  Maximize2,
  Minimize2,
  PieChart,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  X,
  Zap,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../i18n/translations';
import { convertCurrency, convertToIdr } from '../utils/exchangeRates';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

const PRESET_PROMPTS = [
  {
    icon: '💰',
    label: 'Total Piutang Saya',
    prompt: 'Berapa total piutang saya saat ini, siapa saja yang belum melunasi, dan kapan jatuh temponya?',
  },
  {
    icon: '💳',
    label: 'Status Hutang & Cicilan',
    prompt: 'Tolong rekap seluruh kewajiban hutang yang wajib saya bayar beserta sisa saldo dan jatuh temponya.',
  },
  {
    icon: '📊',
    label: 'Analisis Keuangan & Arus Kas',
    prompt: 'Tolong analisis kondisi kesehatan keuangan saya bulan ini berdasarkan saldo, pemasukan, pengeluaran, hutang, dan piutang.',
  },
  {
    icon: '💡',
    label: 'Strategi Pelunasan & Budgeting',
    prompt: 'Bagaimana strategi terbaik membagi anggaran 50/30/20 dan mempercepat pelunasan hutang saya?',
  },
  {
    icon: '💱',
    label: 'Tips Transaksi Valas',
    prompt: 'Bagaimana strategi terbaik mengelola pembukuan dengan multi mata uang (IDR, NZD, USD, TWD, HKD, SGD)?',
  },
];

/**
 * Mesin analisis lokal (offline fallback).
 * Dipakai otomatis bila endpoint /api/chat tidak tersedia (mis. hosting statis)
 * atau gagal — chatbot tetap menjawab memakai data finansial real-time pengguna.
 */
function buildLocalAiReply(
  message: string,
  ctx: {
    userName: string;
    currency: string;
    totalBalance: string;
    monthlyIncome: string;
    monthlyExpense: string;
    netSavings: string;
    savingsRate: number;
    unpaidBillsCount: number;
    unpaidBillsList?: { title: string; amount: string; dueDate: string; isOverdue: boolean; recurrence: string }[];
    topExpenseCategories?: { name: string; amount: string; percent: number }[];
    loansSummary: {
      remainingReceivables: string;
      activeReceivablesCount: number;
      activeReceivablesList: any[];
      remainingPayables: string;
      activePayablesCount: number;
      activePayablesList: any[];
      netLoanPosition: string;
      overdueLoansCount: number;
    };
  }
): string {
  const q = message.toLowerCase();
  const ls = ctx.loansSummary;

  // Intent 0a: Sapaan / basa-basi
  if (
    /^(halo|hai|hi|hei|hey|assalam|pagi|siang|sore|malam)[\s!,.?]*$/.test(q) ||
    q.includes('apa kabar') ||
    q.includes('terima kasih') ||
    q.includes('makasih') ||
    q === 'thanks'
  ) {
    return `Halo ${ctx.userName}! 👋 Saya **Asisten Keuangan BukuKas** dan siap membantu Anda kapan saja.\n\nBeberapa hal yang bisa langsung Anda tanyakan:\n- 🧾 _"Tagihan apa saja yang belum dibayar?"_\n- 💰 _"Total piutang saya?"_\n- 💳 _"Status hutang & cicilan?"_\n- 📊 _"Analisis keuangan saya"_ atau _"laporan pengeluaran per kategori"_\n- 💡 _"Strategi budgeting"_ | 💱 _"Tips valas"_`;
  }

  // Intent 0b: TAGIHAN (bills) — HARUS sebelum piutang agar "tagihan" tidak
  // salah match dengan kata "tagi(h)"
  if (
    q.includes('tagihan') ||
    q.includes('tagihan rutin') ||
    q.includes('bill') && !q.includes('hutang') ||
    q.includes('listrik') ||
    q.includes('internet') ||
    q.includes('langganan') ||
    q.includes('iuran')
  ) {
    const list = ctx.unpaidBillsList ?? [];
    const billsMd = list.length
      ? list
          .map(
            (b: any, i: number) =>
              `${i + 1}. **${b.title}** — **${b.amount}** | Jatuh tempo: **${b.dueDate}**${b.isOverdue ? ' ⚠️ *TERLAMBAT*' : ''} (${b.recurrence})`
          )
          .join('\n')
      : '_Semua tagihan sudah lunas! 🎉 Tidak ada yang perlu dibayar._';
    return `### 🧾 Tagihan Belum Lunas (${list.length})\n\n${billsMd}\n\n💡 ${list.some((b: any) => b.isOverdue) ? '**Ada tagihan terlambat** — segera bayar untuk menghindari denda!' : 'Semua masih dalam batas waktu. Aktifkan auto-debit di menu Tagihan agar tidak terlewat.'}`;
  }

  // Intent 0c: PENGELUARAN bulan ini (+ breakdown kategori)
  if (
    q.includes('pengeluaran') ||
    q.includes('pengeluar') ||
    q.includes('belanja') ||
    q.includes('expense') ||
    (q.includes('laporan') && !q.includes('pemasukan'))
  ) {
    const cats = ctx.topExpenseCategories ?? [];
    const catMd = cats.length
      ? cats.map((c: any) => `- **${c.name}**: ${c.amount} (${c.percent}% dari total)`).join('\n')
      : '_Belum ada pengeluaran tercatat bulan ini._';
    return `### ⬇️ Pengeluaran Bulan Ini\n\n- **Total**: **${ctx.monthlyExpense}**\n- Dibanding pemasukan: ${ctx.monthlyIncome} → arus kas bersih **${ctx.netSavings}** (rasio tabungan ${ctx.savingsRate}%)\n\n#### 📂 Breakdown Kategori Terbesar:\n${catMd}\n\n💡 ${cats.length ? `Kategori terbesar adalah **${cats[0].name}** (${cats[0].percent}%). Jika ingin hemat, mulai review dari sini.` : 'Mulai catat transaksi Anda agar analisis makin akurat.'}`;
  }

  // Intent 0d: PEMASUKAN
  if (
    q.includes('pemasukan') ||
    q.includes('pendapatan') ||
    q.includes('income') ||
    q.includes('gaji') ||
    q.includes('uang masuk')
  ) {
    return `### ⬆️ Pemasukan Bulan Ini\n\n- **Total**: **${ctx.monthlyIncome}**\n- Pengeluaran: ${ctx.monthlyExpense} → surplus/defisit **${ctx.netSavings}**\n- Rasio tabungan: **${ctx.savingsRate}%** ${ctx.savingsRate >= 20 ? '🟢 (sudah sehat)' : ctx.savingsRate >= 5 ? '🟡 (cukup)' : '🔴 (perlu ditingkatkan)'}\n\n💡 Idealnya sisihkan minimal 20% pemasukan untuk tabungan/dana darurat.`;
  }

  // Intent 0e: SALDO spesifik
  if (
    q.includes('saldo') ||
    q.includes('balance') ||
    q.includes('kekayaan') ||
    q.includes('total uang') ||
    q.includes('uang saya')
  ) {
    return `### 💼 Saldo & Kekayaan Anda\n\n- **Total Saldo Seluruh Rekening**: **${ctx.totalBalance}**\n- ⬆️ Masuk bulan ini: ${ctx.monthlyIncome} | ⬇️ Keluar: ${ctx.monthlyExpense}\n- ⚖️ Ditambah sisa piutang ${ls.remainingReceivables}, dikurangi sisa hutang ${ls.remainingPayables}\n\n💡 Pastikan ada dana darurat minimal 3–6× pengeluaran bulanan (${ctx.monthlyExpense}).`;
  }

  const receivablesMd = ls.activeReceivablesList.length
    ? ls.activeReceivablesList
        .map(
          (r: any, i: number) =>
            `${i + 1}. **${r.person}** — *${r.title}*\n   - Sisa belum diterima: **${r.remainingAmount}** (pokok ${r.amount})\n   - Jatuh tempo: ${r.dueDate} | Kontak: ${r.contactPhone}`
        )
        .join('\n\n')
    : '_Tidak ada piutang aktif saat ini — semua sudah lunas! 🎉_';

  const payablesMd = ls.activePayablesList.length
    ? ls.activePayablesList
        .map(
          (p: any, i: number) =>
            `${i + 1}. **${p.person}** — *${p.title}*\n   - Sisa wajib dibayar: **${p.remainingAmount}** (pokok ${p.amount})\n   - Jatuh tempo: ${p.dueDate}`
        )
        .join('\n\n')
    : '_Tidak ada hutang aktif saat ini! 🎉_';

  if (
    q.includes('piutang') ||
    q.includes('receivable') ||
    q.includes('dipinjam') ||
    q.includes('meminjamkan') ||
    q.includes('hak tagih') ||
    q.includes('uang di luar')
  ) {
    return `### 💰 Ringkasan Piutang Anda (Hak Tagih)\n\n- **Total sisa piutang belum diterima**: **${ls.remainingReceivables}**\n- **Jumlah debitur aktif**: ${ls.activeReceivablesCount}\n\n---\n\n#### 📋 Rincian Peminjam:\n${receivablesMd}\n\n💡 **Tips**: Gunakan fitur pengingat WhatsApp di menu Hutang & Piutang sebelum jatuh tempo tiba.`;
  }

  if (
    q.includes('hutang') ||
    q.includes('utang') ||
    q.includes('payable') ||
    q.includes('cicilan') ||
    q.includes('kewajiban')
  ) {
    return `### 💳 Ringkasan Hutang Anda (Kewajiban)\n\n- **Total sisa hutang wajib dibayar**: **${ls.remainingPayables}**\n- **Jumlah pinjaman aktif**: ${ls.activePayablesCount}\n- **Melewati jatuh tempo**: ${ls.overdueLoansCount}\n\n---\n\n#### 📋 Rincian Hutang:\n${payablesMd}\n\n💡 **Strategi**: Lunasi dulu hutang dengan jatuh tempo terdekat atau nominal terkecil (*Metode Snowball*).`;
  }

  if (
    q.includes('analisis') ||
    q.includes('kesehatan') ||
    q.includes('arus kas') ||
    q.includes('saldo') ||
    q.includes('keuangan saya')
  ) {
    const health =
      ctx.savingsRate >= 20 ? '🟢 Sangat Sehat' : ctx.savingsRate >= 5 ? '🟡 Cukup Baik' : '🔴 Perlu Perhatian';
    return `### 📊 Analisis Keuangan ${ctx.userName}\n\n- 💼 **Total Saldo**: ${ctx.totalBalance}\n- ⬆️ **Pemasukan bulan ini**: ${ctx.monthlyIncome}\n- ⬇️ **Pengeluaran bulan ini**: ${ctx.monthlyExpense}\n- 💵 **Arus kas bersih**: ${ctx.netSavings} (rasio tabungan **${ctx.savingsRate}%**)\n- 🧾 **Tagihan belum lunas**: ${ctx.unpaidBillsCount}\n- ⚖️ **Posisi bersih hutang-piutang**: ${ls.netLoanPosition}\n\n**Kesehatan Finansial**: ${health}\n\n💡 ${ctx.savingsRate >= 20 ? 'Pertahankan disiplin menabung Anda, pertimbangkan instrumen investasi berisiko rendah.' : 'Coba kurangi pengeluaran non-esensial dan terapkan anggaran 50/30/20 untuk memperbaiki rasio tabungan.'}`;
  }

  // Intent: VALAS / MULTI-MATA UANG — HARUS sebelum budget agar pertanyaan
  // "strategi ... multi mata uang" tidak tertangkap keyword generik 'strategi'
  if (
    q.includes('valas') ||
    q.includes('mata uang') ||
    q.includes('multicurrency') ||
    q.includes('multi-currency') ||
    q.includes('kurs') ||
    q.includes('konversi') ||
    /\b(idr|nzd|usd|sgd|aud|eur|gbp|jpy|myr|hkd|twd|krw)\b/.test(q)
  ) {
    return `### 💱 Tips Pembukuan Multi-Mata Uang\n\n1. **Satukan laporan dalam 1 mata uang utama** (saat ini: ${ctx.currency}) agar arus kas mudah dibaca — aplikasi sudah mengonversi otomatis dengan kurs live.\n2. **Catat transaksi di mata uang aslinya**, biarkan sistem mengonversi ke ${ctx.currency}.\n3. **Pantau fluktuasi kurs** sebelum pembayaran besar lintas negara.\n4. Total saldo lintas rekening Anda saat ini setara **${ctx.totalBalance}**.`;
  }

  // Intent: BUDGETING (setelah valas agar keyword generik 'strategi' tidak
  // menangkap pertanyaan multi-mata uang)
  if (
    q.includes('budget') ||
    q.includes('anggaran') ||
    q.includes('50/30/20') ||
    q.includes('hemat') ||
    q.includes('strategi')
  ) {
    return `### 💡 Strategi Budgeting 50/30/20\n\nBerdasarkan pemasukan Anda (${ctx.monthlyIncome}):\n\n- 🏠 **50% Kebutuhan** — makan, transportasi, tagihan (${ctx.unpaidBillsCount} tagihan aktif prioritaskan!)\n- 🎯 **30% Keinginan** — hiburan, jajan\n- 🐖 **20% Tabungan & Pelunasan Hutang** — target minimal **${ls.remainingPayables !== 'Rp 0' ? 'alokasikan untuk cicilan hutang' : 'dana darurat 6x pengeluaran'}**\n\nRasio tabungan Anda saat ini: **${ctx.savingsRate}%**. ${ctx.savingsRate >= 20 ? 'Sudah bagus, pertahankan! 👍' : 'Tingkatkan bertahap 1-2% tiap bulan.'}`;
  }

  return `Halo ${ctx.userName}! 👋 Berikut ringkasan keuangan Anda:\n\n- 💼 **Saldo**: ${ctx.totalBalance}\n- ⬆️ **Masuk bulan ini**: ${ctx.monthlyIncome} | ⬇️ **Keluar**: ${ctx.monthlyExpense}\n- 💰 **Sisa piutang**: ${ls.remainingReceivables} | 💳 **Sisa hutang**: ${ls.remainingPayables}\n- 🧾 **Tagihan aktif**: ${ctx.unpaidBillsCount}\n\nSilakan tanyakan spesifik, misalnya _"total piutang saya"_, _"status hutang"_, _"analisis keuangan"_, atau _"strategi budgeting"_.`;
}

export const AiChatBot: React.FC<{ isEmbedded?: boolean; onClose?: () => void }> = ({
  isEmbedded = false,
  onClose,
}) => {
  const {
    currency,
    language,
    accounts,
    transactions,
    bills,
    categories,
    loans,
    currentUser,
    exchangeRates,
  } = useApp();

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('finvault_ai_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [
      {
        id: 'msg-welcome',
        role: 'model',
        text: `Halo ${currentUser?.name || 'Kak'}! 👋 Saya adalah **Asisten Finansial & Pembukuan AI BukuKas Pro**.\n\nSaya dapat membantu Anda menganalisis arus kas, memeriksa status **Hutang & Piutang (Liabilities & Assets)**, merancang anggaran (budgeting), memantau tagihan rutin, serta memberikan rekomendasi pengelolaan keuangan pribadi/usaha. Apa yang ingin Anda tanyakan hari ini?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync chat history
  useEffect(() => {
    localStorage.setItem('finvault_ai_chat_history', JSON.stringify(messages));
  }, [messages]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Compute live financial summary for AI context
  const currentMonthPrefix = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const monthlyTxs = transactions.filter(t => t.date.startsWith(currentMonthPrefix));

  const totalBalance = accounts.reduce((sum, a) => {
    return sum + convertCurrency(a.balance, a.currency || 'IDR', currency, exchangeRates.rates);
  }, 0);

  const monthlyIncome = monthlyTxs
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency || 'IDR', currency, exchangeRates.rates), 0);

  const monthlyExpense = monthlyTxs
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency || 'IDR', currency, exchangeRates.rates), 0);

  const netSavings = monthlyIncome - monthlyExpense;
  const savingsRate = monthlyIncome > 0 ? Math.round((netSavings / monthlyIncome) * 100) : 0;
  const unpaidBillsCount = bills.filter(b => !b.isPaid).length;

  // Loan metrics calculations
  const safeLoans = loans || [];
  const payables = safeLoans.filter(l => l.type === 'payable');
  const receivables = safeLoans.filter(l => l.type === 'receivable');

  const totalPayableAmount = payables.reduce((sum, l) => sum + l.amount, 0);
  const totalPayablePaid = payables.reduce((sum, l) => sum + l.paidAmount, 0);
  const remainingPayables = payables.reduce((sum, l) => sum + l.remainingAmount, 0);

  const totalReceivableAmount = receivables.reduce((sum, l) => sum + l.amount, 0);
  const totalReceivablePaid = receivables.reduce((sum, l) => sum + l.paidAmount, 0);
  const remainingReceivables = receivables.reduce((sum, l) => sum + l.remainingAmount, 0);

  const netLoanPosition = remainingReceivables - remainingPayables;

  const overdueLoans = safeLoans.filter(l => {
    if (l.status === 'paid') return false;
    const due = new Date(l.dueDate).getTime();
    return due < new Date().setHours(0, 0, 0, 0);
  });

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInputMessage('');
    setIsLoading(true);

    try {
      const activePayablesList = payables
        .filter(l => l.status !== 'paid')
        .map(l => ({
          person: l.personName,
          title: l.title,
          amount: formatCurrency(l.amount, currency, language),
          paidAmount: formatCurrency(l.paidAmount, currency, language),
          remainingAmount: formatCurrency(l.remainingAmount, currency, language),
          dueDate: l.dueDate,
          status: l.status === 'partial' ? 'Cicilan Sebagian' : 'Belum Dibayar (0%)',
          contactPhone: l.contactPhone || '-',
          notes: l.notes || '-',
        }));

      const activeReceivablesList = receivables
        .filter(l => l.status !== 'paid')
        .map(l => ({
          person: l.personName,
          title: l.title,
          amount: formatCurrency(l.amount, currency, language),
          paidAmount: formatCurrency(l.paidAmount, currency, language),
          remainingAmount: formatCurrency(l.remainingAmount, currency, language),
          dueDate: l.dueDate,
          status: l.status === 'partial' ? 'Diterima Sebagian' : 'Belum Dibayar (0%)',
          contactPhone: l.contactPhone || '-',
          notes: l.notes || '-',
        }));

      const settledLoansList = safeLoans
        .filter(l => l.status === 'paid' || l.remainingAmount === 0)
        .map(l => ({
          type: l.type === 'payable' ? 'Hutang' : 'Piutang',
          person: l.personName,
          title: l.title,
          amount: formatCurrency(l.amount, currency, language),
          status: 'Lunas 100%',
        }));

      // Tagihan belum lunas, urut jatuh tempo terdekat (untuk intent "tagihan")
      const todayStr = new Date().toISOString().slice(0, 10);
      const unpaidBillsList = bills
        .filter(b => !b.isPaid)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .map(b => ({
          title: b.title,
          amount: formatCurrency(b.amount, b.currency || 'IDR', language),
          dueDate: b.dueDate,
          isOverdue: b.dueDate < todayStr,
          recurrence: b.recurrence,
        }));

      // Top 5 kategori pengeluaran bulan ini (untuk intent "laporan/pengeluaran")
      const expenseByCategory = new Map<string, number>();
      monthlyTxs
        .filter(t => t.type === 'expense')
        .forEach(t => {
          const idr = convertCurrency(t.amount, t.currency || 'IDR', currency, exchangeRates.rates);
          expenseByCategory.set(t.categoryId, (expenseByCategory.get(t.categoryId) || 0) + idr);
        });
      const topExpenseCategories = [...expenseByCategory.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([catId, total]) => {
          const cat = categories.find(c => c.id === catId);
          return {
            name: cat?.name || 'Lainnya',
            amount: formatCurrency(total, currency, language),
            percent: monthlyExpense > 0 ? Math.round((total / monthlyExpense) * 100) : 0,
          };
        });

      const financialContext = {
        userName: currentUser?.name || 'Pengguna',
        currency,
        totalBalance: formatCurrency(totalBalance, currency, language),
        monthlyIncome: formatCurrency(monthlyIncome, currency, language),
        monthlyExpense: formatCurrency(monthlyExpense, currency, language),
        netSavings: formatCurrency(netSavings, currency, language),
        savingsRate,
        unpaidBillsCount,
        unpaidBillsList,
        topExpenseCategories,
        // Loans & Debts Context
        loansSummary: {
          totalPayables: formatCurrency(totalPayableAmount, currency, language),
          paidPayables: formatCurrency(totalPayablePaid, currency, language),
          remainingPayables: formatCurrency(remainingPayables, currency, language),
          activePayablesCount: activePayablesList.length,
          activePayablesList,

          totalReceivables: formatCurrency(totalReceivableAmount, currency, language),
          paidReceivables: formatCurrency(totalReceivablePaid, currency, language),
          remainingReceivables: formatCurrency(remainingReceivables, currency, language),
          activeReceivablesCount: activeReceivablesList.length,
          activeReceivablesList,

          netLoanPosition: `${netLoanPosition >= 0 ? '+' : ''}${formatCurrency(netLoanPosition, currency, language)}`,
          overdueLoansCount: overdueLoans.length,
          settledLoansList,
        },
      };

      let data: any;
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: textToSend,
            history: messages.map(m => ({ role: m.role, text: m.text })),
            financialContext,
          }),
        });

        const contentType = response.headers.get('content-type') || '';
        if (!response.ok || !contentType.includes('application/json')) {
          // Hosting statis / backend tidak tersedia → gunakan mesin analisis lokal
          data = {
            reply: buildLocalAiReply(textToSend, financialContext),
            model: 'Analisis Lokal',
          };
        } else {
          data = await response.json();
          if (!data?.reply) {
            data = { reply: buildLocalAiReply(textToSend, financialContext), model: 'Analisis Lokal' };
          }
        }
      } catch {
        // Jaringan gagal total → tetap jawab dengan analisis lokal
        data = { reply: buildLocalAiReply(textToSend, financialContext), model: 'Analisis Lokal' };
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'model',
        text: data.reply || 'Maaf, tidak ada tanggapan yang dihasilkan.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `⚠️ Maaf, terjadi kendala memproses pertanyaan (${err.message || 'Error'}). Silakan coba tanyakan kembali!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Bersihkan riwayat percakapan dengan Asisten AI?')) {
      const welcome: ChatMessage = {
        id: 'msg-welcome-new',
        role: 'model',
        text: `Halo ${currentUser?.name || 'Kak'}! Riwayat percakapan telah dibersihkan. Ada yang bisa saya bantu terkait keuangan, hutang, atau piutang Anda hari ini?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([welcome]);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      className={`flex flex-col rounded-3xl border border-slate-200/80 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 ${
        isEmbedded ? 'min-h-[75vh] h-full w-full' : 'h-[620px] max-h-[85vh] w-full max-w-lg'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25">
            <Bot className="h-5 w-5" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white dark:bg-slate-900">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">BukuKas AI Advisor</h3>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Gemini Flash
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Konsultan Finansial & Pembukuan Cerdas</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClearHistory}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Bersihkan Percakapan"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {!isEmbedded && onClose && (
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Financial Snapshot Bar */}
      <div className="flex flex-wrap items-center justify-between gap-y-1.5 border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 text-xs dark:border-slate-800/80 dark:bg-slate-850/50">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-500">Saldo:</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {formatCurrency(totalBalance, currency, language)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span title="Sisa Piutang yang belum Anda tagih / terima" className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
            <span>Piutang:</span>
            <span>{formatCurrency(remainingReceivables, currency, language)}</span>
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span title="Sisa Hutang yang wajib Anda lunasi" className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
            <span>Hutang:</span>
            <span>{formatCurrency(remainingPayables, currency, language)}</span>
          </span>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                  <Sparkles className="h-4 w-4" />
                </div>
              )}

              <div className={`group relative max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                isUser
                  ? 'bg-emerald-600 text-white rounded-tr-xs shadow-xs shadow-emerald-600/20'
                  : 'bg-slate-100 text-slate-900 rounded-tl-xs dark:bg-slate-800 dark:text-slate-100'
              }`}>
                {isUser ? (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                ) : (
                  <div className="markdown-body space-y-2">
                    <Markdown>{msg.text}</Markdown>
                  </div>
                )}

                <div className={`mt-1.5 flex items-center justify-between gap-3 text-[10px] ${
                  isUser ? 'text-emerald-100' : 'text-slate-400'
                }`}>
                  <span>{msg.timestamp}</span>
                  {!isUser && (
                    <button
                      onClick={() => handleCopyText(msg.id, msg.text)}
                      className="opacity-0 transition group-hover:opacity-100 hover:text-slate-700 dark:hover:text-white"
                      title="Salin Teks"
                    >
                      {copiedId === msg.id ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Sparkles className="h-4 w-4 animate-spin" />
            </div>
            <div className="rounded-2xl rounded-tl-xs bg-slate-100 p-3.5 dark:bg-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 font-medium">BukuKas AI sedang menganalisis data...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="border-t border-slate-100 px-4 py-2.5 dark:border-slate-800/80">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {PRESET_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p.prompt)}
              disabled={isLoading}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-emerald-700 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Box Footer */}
      <div className="border-t border-slate-100 p-3.5 sm:p-4 dark:border-slate-800">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            placeholder="Tanyakan analisis keuangan, strategi hemat, atau valas..."
            disabled={isLoading}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-3 pr-12 pl-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-hidden transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:placeholder-slate-500 dark:focus:bg-slate-900"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-slate-400">
          Didukung Google Gemini AI. Rekomendasi bersifat edukatif dan analisis pembukuan pribadi.
        </p>
      </div>
    </div>
  );
};
