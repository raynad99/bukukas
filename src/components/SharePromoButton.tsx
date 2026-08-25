import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Share2, Copy, Check, MessageCircle, ExternalLink, Gift } from 'lucide-react';

/**
 * SharePromoButton — floating promo share widget.
 * Every user gets a unique referral link they can share to promote BukuKas Pro.
 * If someone registers via their link and upgrades to paid, the sharer earns Rp 30.000.
 */
export default function SharePromoButton() {
  const { currentUser } = useApp();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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
    // Try server first, fallback to local
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
  const promoText = `Hai! 👋\n\nAku pakai BukuKas Pro untuk kelola keuangan bisnis. Cocok banget buat UMKM!\n\n✅ Pencatatan transaksi mudah\n✅ Multi mata uang & kurs live\n✅ Laporan keuangan PDF\n✅ Backup cloud terenkripsi\n\nYuk daftar gratis pakai link ini:\n${promoLink}\n\nPaket berbayar 1 tahun cuma Rp199rb! 🚀`;

  const handleCopy = async () => {
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

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(promoText)}`, '_blank');
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
            className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Promosikan BukuKas Pro</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Share link referral Anda & dapatkan komisi</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Commission Info */}
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/40">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                💰 Dapatkan Rp 30.000 per konversi!
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                Setiap teman yang daftar via link Anda & upgrade ke paket berbayar, Anda mendapat komisi langsung.
              </p>
            </div>

            {/* Your Referral Link */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">Link Undangan Anda</label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                <code className="flex-1 truncate text-xs text-slate-700 dark:text-slate-300">{promoLink}</code>
                <button
                  onClick={handleCopy}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-violet-500 active:scale-95"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Tersalin!' : 'Salin'}
                </button>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">Bagikan ke</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleShareWhatsApp}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-green-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-green-500 active:scale-95"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </button>
                <button
                  onClick={handleShareTelegram}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-500 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-400 active:scale-95"
                >
                  <ExternalLink className="h-4 w-4" />
                  Telegram
                </button>
                <button
                  onClick={handleShareFacebook}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-500 active:scale-95"
                >
                  <Share2 className="h-4 w-4" />
                  Facebook
                </button>
              </div>
            </div>

            {/* Preview Message */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <label className="mb-2 block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Preview Pesan Promosi</label>
              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">{promoText}</p>
            </div>

            {/* Kode Referral */}
            <div className="mt-4 text-center">
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Kode Referral: <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{referralCode}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
