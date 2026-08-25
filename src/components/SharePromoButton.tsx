import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Share2, Copy, Check, MessageCircle, ExternalLink, Gift, Smartphone, ChevronDown, ChevronUp, Sparkles, Star, Zap } from 'lucide-react';

/**
 * High-converting WhatsApp marketing message templates
 * Based on research: hook → value → urgency → CTA pattern
 */
const MESSAGE_TEMPLATES = [
  {
    id: 'feature',
    label: '🌟 Fitur Lengkap',
    icon: '🌟',
    desc: 'Highlight semua fitur unggulan BukuKas Pro',
    build: (name: string, link: string) =>
      `Halo ${name}! 👋

Tau gak sih ada app pembukuan yang super lengkap namanya *BukuKas Pro*? 🔥

Yang bikin beda dari app lain:

💰 *Multi Mata Uang & Kurs Live*
→ IDR, USD, SGD, AUD, EUR, GBP, JPY, MYR, NZD & 13+ mata uang
→ Kurs update real-time dari pasar (otomatis setiap 60 detik!)
→ Konversi otomatis di setiap transaksi

📊 *Laporan Keuangan Profesional*
→ Export PDF & CSV laporan instant
→ Grafik pie chart pengeluaran per kategori
→ Ringkasan arus kas & tingkat tabungan

🔒 *Keamanan Level Bank*
→ Enkripsi end-to-end (E2E) semua data
→ Brankas digital dengan passphrase
→ Backup cloud otomatis ke Google Drive

🤖 *AI Advisor Finansial*
→ Chat AI untuk saran keuangan personal
→ Analisis pola pengeluaran
→ Rekomendasi penghematan

📱 *Catatan Hutang & Piutang*
→ Tracking tempo pembayaran
→ Pengingat otomatis jatuh tempo
→ Laporan piutang bersih

Coba GRATIS 7 hari sekarang 👇
🔗 ${link}

Paket 1 tahun: Rp199.000 (hemat 87%!) 🚀`,
  },
  {
    id: 'casual',
    label: '🤝 Kasual & Ramah',
    icon: '🤝',
    desc: 'Pesan santai, cocok untuk teman & keluarga',
    build: (name: string, link: string) =>
      `Halo ${name}! 👋

Aku lagi pakai app pembukuan namanya *BukuKas Pro* dan recommended banget buat yang punya bisnis! ✅

Yang bikin suka:
✓ Kurs mata uang 13+ negara update live (IDR, USD, SGD, EUR, JPY, dll)
✓ Export laporan PDF & CSV profesional dalam hitungan detik
✓ AI advisor yang bisa kasih saran keuangan personal 🤖
✓ Data aman terenkripsi E2E + backup cloud otomatis
✓ Tracking hutang & piutang dengan pengingat otomatis
✓ Konversi kurs otomatis di setiap transaksi

Coba gratis 7 hari, daftar disini ya 👇
🔗 ${link}

Kalau cocok, paket 1 tahun cuma Rp199.000 (Rp16rb/bln aja!) 🚀

Yuk mulai kelola keuangan bisnis dengan lebih rapi! 💪`,
  },
  {
    id: 'problem',
    label: '🎯 Solve Problem',
    icon: '💡',
    desc: 'Fokus pada masalah & solusi',
    build: (name: string, link: string) =>
      `${name} masih catat keuangan pakai Excel/manual? 😅

Kalau iya, cobain *BukuKas Pro* — aplikasi pembukuan khusus UMKM Indonesia 🇮🇩

Masalah yang bisa diselesaikan:
❌ Lupa catat pengeluaran → ✅ Notifikasi otomatis
❌ Bingung laporan pajak → ✅ Export PDF & CSV instant
❌ Data hilang HP rusak → ✅ Backup cloud terenkripsi otomatis
❌ Kurs valas manual → ✅ Kurs live 13+ mata uang (USD, SGD, EUR, JPY, AUD, MYR, dll)
❌ Lupa tagihan hutang → ✅ Pengingat tempo & tracking piutang
❌ Butuh saran keuangan → ✅ AI advisor finansial built-in 🤖
❌ Hitung konversi ribet → ✅ Kalkulator kurs otomatis real-time

Fitur lengkap:
📊 Dashboard keuangan visual
💳 Multi rekening (tunai, QRIS, bank, e-wallet)
🏷️ Kategori & anggaran otomatis
📱 Aplikasi mobile-friendly (PWA)

Daftar GRATIS 7 hari tanpa kartu kredit 👇
🔗 ${link}

Paket 1 tahun: Rp199.000 (hemat 87% dari bulanan!)`,
  },
  {
    id: 'currency',
    label: '💱 Kurs & Multi-Mata Uang',
    icon: '💱',
    desc: 'Highlight fitur kurs live & multi mata uang',
    build: (name: string, link: string) =>
      `💱 *Kurs Mata Uang 13+ Negara — Update Real-Time!*

${name}, kalau bisnismu pakai multi mata uang, ini app yang tepat! 🎯

*BukuKas Pro* support:
🇮🇩 IDR Rupiah
🇺🇸 USD Dollar
🇸🇬 SGD Sing Dollar
🇦🇺 AUD Australian Dollar
🇪🇺 EUR Euro
🇬🇧 GBP Pound Sterling
🇯🇵 JPY Yen Jepang
🇲🇾 MYR Ringgit Malaysia
🇳🇿 NZD New Zealand Dollar
🇭🇰 HKD Hong Kong Dollar
🇹🇼 TWD Taiwan Dollar
🇧🇬 BGN Bulgarian Lev
🇰🇷 KRW Korean Won

Semua kurs *update live dari pasar* setiap 60 detik! 📈

Contoh penggunaan:
→ Transaksi dalam USD, otomatis convert ke IDR
→ Laporan gabungan multi mata uang
→ Kalkulator konversi instant di dashboard

Coba GRATIS 7 hari 👇
🔗 ${link}

Paket 1 tahun: Rp199.000 (Rp16rb/bln) 🚀`,
  },
  {
    id: 'urgency',
    label: '🔥 Urgency & FOMO',
    icon: '⚡',
    desc: 'Ciptakan urgensi untuk action cepat',
    build: (name: string, link: string) =>
      `⚠️ ${name}, jangan sampai kelewatan!

*BukuKas Pro* lagi ada promo spesial 🔥

Yang kamu dapatkan GRATIS 7 hari:
🚀 Semua fitur premium unlocked
📊 Dashboard keuangan visual + grafik
💱 Kurs live 13+ mata uang (IDR, USD, SGD, EUR, JPY, dll)
🤖 AI advisor finansial personal
🔒 Enkripsi E2E + backup cloud otomatis
📱 Tracking hutang & piutang + pengingat tempo
💳 Multi rekening (tunai, QRIS, bank, e-wallet)
📥 Export PDF & CSV laporan professional
🏷️ Kategori & anggaran otomatis

Bonus: Paket 1 tahun cuma Rp199.000
(Sama dengan 2x makan siang aja! 😂)

Klik daftar sekarang sebelum kehabisan 👇
🔗 ${link}

Jangan tunda lagi, mulai sekarang! 💪`,
  },
  {
    id: 'testimonial',
    label: '⭐ Social Proof',
    icon: '🏆',
    desc: 'Tunjukkan bukti dari pengguna lain',
    build: (name: string, link: string) =>
      `${name}! Ada rekomendasi app bagus nih 🌟

Aku dan beberapa teman UMKM sudah pakai *BukuKas Pro* dan hasilnya:

💬 "Gak perlu catat manual lagi, semua otomatis! Termasuk konversi kurs USD ke IDR!" — Rina, Toko Online
💬 "Laporan pajak jadi gampang banget, tinggal export PDF!" — Budi, Konveksi
💬 "Kurs live 13 mata uang langsung di dashboard, keren banget!" — Sari, Kedai Kopi
💬 "AI advisor nya kasih saran penghematan yang beneran work!" — Andi, Freelancer

Fitur unggulan:
✅ Kurs real-time 13+ mata uang (IDR, USD, SGD, EUR, JPY, AUD, MYR, dll)
✅ AI advisor finansial personal 🤖
✅ Export PDF & CSV laporan profesional
✅ Backup cloud terenkripsi E2E
✅ Tracking hutang & piutang dengan pengingat
✅ Multi rekening (tunai, QRIS, bank, e-wallet)

Coba GRATIS 7 hari tanpa komitmen 👇
🔗 ${link}`,
  },
];

export default function SharePromoButton() {
  const { currentUser } = useApp();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  const getOrCreateLocalCode = useCallback((email: string): string => {
    const KEY = 'finvault_referral_codes';
    const mapKey = email.toLowerCase();
    try {
      const map: Record<string, string> = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (map[mapKey] && /^BK[A-Z0-9]{6,10}$/.test(map[mapKey])) return map[mapKey];
      const code = 'BK' + Math.random().toString(36).slice(2, 10).toUpperCase();
      localStorage.setItem(KEY, JSON.stringify({ ...map, [mapKey]: code }));
      return code;
    } catch {
      return 'BK' + Math.random().toString(36).slice(2, 10).toUpperCase();
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    fetch(`/api/referral/stats/${currentUser.id}?email=${encodeURIComponent(currentUser.email)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.code) {
          setReferralCode(data.code);
        } else {
          setReferralCode(getOrCreateLocalCode(currentUser.email));
        }
      })
      .catch(() => setReferralCode(getOrCreateLocalCode(currentUser.email)));
  }, [currentUser, getOrCreateLocalCode]);

  if (!currentUser || !referralCode) return null;

  const promoLink = `${window.location.origin}/auth?ref=${referralCode}`;
  const userName = currentUser.name.split(' ')[0] || currentUser.name;
  const currentMessage = MESSAGE_TEMPLATES[selectedTemplate].build(userName, promoLink);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(promoLink);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = promoLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(currentMessage);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = currentMessage;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(currentMessage)}`, '_blank');
  };

  const handleShareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(promoLink)}&text=${encodeURIComponent('BukuKas Pro — Aplikasi Pembukuan UMKM Terbaik! 🚀')}`, '_blank');
  };

  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(promoLink)}`, '_blank');
  };

  return (
    <>
      {/* Floating Share Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 py-3 px-4.5 text-white shadow-xl shadow-violet-900/30 transition-all hover:scale-105 hover:from-violet-500 hover:to-purple-500 active:scale-95"
        title="Promosikan BukuKas Pro"
      >
        <Share2 className="h-5 w-5 text-white" />
        <span className="text-xs font-bold tracking-tight hidden sm:inline">Promo & Share</span>
      </button>

      {/* Share Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs" onClick={() => setIsOpen(false)}>
          <div
            className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Promosikan BukuKas Pro</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Pilih template → Copy → Kirim ke WA</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Commission Banner */}
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-3.5 dark:border-emerald-900/60 dark:from-emerald-950/40 dark:to-green-950/40">
              <div className="flex items-center gap-2">
                <span className="text-lg">💰</span>
                <div>
                  <p className="text-xs font-black text-emerald-800 dark:text-emerald-200">
                    Dapatkan Rp 30.000 per konversi!
                  </p>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                    Teman daftar via link Anda & upgrade ke paket berbayar = komisi masuk.
                  </p>
                </div>
              </div>
            </div>

            {/* Template Selector */}
            <div className="mb-4">
              <label className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">
                <Sparkles className="inline h-3 w-3 text-violet-500 mr-1" />
                Pilih Format Pesan
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MESSAGE_TEMPLATES.map((tpl, i) => (
                  <button
                    key={tpl.id}
                    onClick={() => { setSelectedTemplate(i); setShowPreview(true); }}
                    className={`flex items-start gap-2 rounded-xl border p-3 text-left transition ${
                      selectedTemplate === i
                        ? 'border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/40'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
                    }`}
                  >
                    <span className="text-lg shrink-0">{tpl.icon}</span>
                    <div className="min-w-0">
                      <p className={`text-[11px] font-bold ${selectedTemplate === i ? 'text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-300'}`}>
                        {tpl.label}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{tpl.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Preview */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="mb-3 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <span className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-green-600" />
                {showPreview ? 'Sembunyikan Preview' : 'Lihat Preview Pesan WA'}
              </span>
              {showPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {/* WhatsApp Phone Preview */}
            {showPreview && (
              <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-[#e5ddd5] dark:border-slate-700 dark:bg-[#0b141a]">
                {/* Phone Status Bar */}
                <div className="flex items-center justify-between bg-[#075e54] px-4 py-2 dark:bg-[#1f2c34]">
                  <span className="text-[10px] font-bold text-white/80">9:41</span>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-white/60" />
                    <div className="h-2 w-2 rounded-full bg-white/60" />
                    <div className="h-2 w-3 rounded-sm bg-white/60" />
                  </div>
                </div>
                {/* WhatsApp Header */}
                <div className="flex items-center gap-3 bg-[#075e54] px-4 py-2.5 dark:bg-[#1f2c34]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25d366] text-[11px] font-bold text-white">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{userName}</p>
                    <p className="text-[10px] text-white/60">online</p>
                  </div>
                </div>
                {/* Message Bubble */}
                <div className="p-4" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'400\' height=\'400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'20\' height=\'20\' patternUnits=\'userSpaceOnUse\'%3E%3Ccircle cx=\'2\' cy=\'2\' r=\'1\' fill=\'%23d4cfc4\' opacity=\'0.4\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'400\' height=\'400\' fill=\'%23e5ddd5\'/%3E%3Crect width=\'400\' height=\'400\' fill=\'url(%23p)\'/%3E%3C/svg%3E")' }}>
                  <div className="relative ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-[#dcf8c6] p-3 shadow-sm dark:bg-[#005c4b]">
                    <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-800 dark:text-slate-100">{currentMessage}</p>
                    <div className="mt-1 text-right">
                      <span className="text-[9px] text-slate-500/70 dark:text-slate-400/70">09:41 ✓✓</span>
                    </div>
                  </div>
                </div>
                {/* Input Bar */}
                <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-[#1f2c34]">
                  <div className="flex-1 rounded-full bg-slate-100 px-4 py-1.5 text-[10px] text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                    Pesan
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25d366]">
                    <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.818-.011 7.911z"/></svg>
                  </div>
                </div>
              </div>
            )}

            {/* Copy Full Message Button */}
            <button
              onClick={handleCopyMessage}
              className={`mb-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold shadow-sm transition active:scale-95 ${
                copiedMsg
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-500 hover:to-emerald-500'
              }`}
            >
              {copiedMsg ? (
                <>
                  <Check className="h-4 w-4" />
                  Pesan Tersalin! Siap Kirim ke WA ✓
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Salin Pesan & Kirim ke WhatsApp
                </>
              )}
            </button>

            {/* Referral Link */}
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <Zap className="inline h-3 w-3 text-amber-500 mr-1" />
                Link Referral Anda
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                <code className="flex-1 truncate text-[11px] text-slate-700 dark:text-slate-300">{promoLink}</code>
                <button
                  onClick={handleCopyLink}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-violet-500 active:scale-95"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Tersalin!' : 'Salin Link'}
                </button>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bagikan Langsung</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleShareWhatsApp}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25d366] px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#20bd5a] active:scale-95"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </button>
                <button
                  onClick={handleShareTelegram}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0088cc] px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0077b5] active:scale-95"
                >
                  <ExternalLink className="h-4 w-4" />
                  Telegram
                </button>
                <button
                  onClick={handleShareFacebook}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-[#1877f2] px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#166fe5] active:scale-95"
                >
                  <Share2 className="h-4 w-4" />
                  Facebook
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/30">
              <p className="text-[11px] font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                <Star className="h-3 w-3" />
                Tips Marketing:
              </p>
              <ul className="mt-1.5 space-y-1 text-[10px] text-amber-700 dark:text-amber-300">
                <li>• Kirim pagi hari (08:00-10:00) atau malam (19:00-21:00) untuk engagement terbaik</li>
                <li>• Personalisasi dengan nama teman/klien Anda sebelum kirim</li>
                <li>• Follow-up 24 jam setelah kirim pertama jika belum daftar</li>
                <li>• Jangan kirim ke grup besar — fokus ke 1-on-1 untuk konversi lebih tinggi</li>
              </ul>
            </div>

            {/* Kode Referral */}
            <div className="mt-4 text-center">
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Kode Referral: <span className="font-mono font-bold text-violet-600 dark:text-violet-400">{referralCode}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
