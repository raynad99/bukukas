import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Crown,
  HelpCircle,
  Mail,
  ShieldCheck,
  Sparkles,
  Zap,
  Gift,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateTrialStatus } from '../utils/trialHelper';
import { SellerApplicationModal } from './SellerApplicationModal';

export const TrialBanner: React.FC = () => {
  const { currentUser, setIsContactDevModalOpen, setIsCryptoPaymentModalOpen, setActiveView } = useApp();

  if (!currentUser) return null;

  const trialInfo = calculateTrialStatus(currentUser);
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);

  // If user is Admin / Developer
  if (currentUser.role === 'admin') {
    return (
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-4 text-white shadow-md dark:border-indigo-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            <Crown className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Akun Developer / Superadmin Resmi</span>
              <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-extrabold text-amber-300 border border-amber-400/30">
                LIFETIME VIP
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Anda memiliki hak akses penuh untuk mengelola lisensi pengguna mandiri dan melihat semua pesan masuk email bisnis.
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveView('dev')}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-sm transition hover:brightness-110 active:scale-95"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Buka Dev Console & Kotak Masuk</span>
        </button>
      </div>
    );
  }

  // If user is Lifetime VIP
  if (trialInfo.isLifetime) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100/60 p-3.5 text-amber-900 shadow-xs dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        <div className="flex items-center gap-2.5">
          <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="text-xs font-black">Lisensi Lifetime VIP Aktif</span>
            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              Akses penuh seumur hidup tanpa batas waktu, backup cloud tak terbatas, dan dukungan multi-mata uang.
            </p>
          </div>
        </div>

        <span className="rounded-full bg-amber-200/80 px-2.5 py-1 text-[10px] font-bold text-amber-900 dark:bg-amber-900 dark:text-amber-200">
          👑 Seumur Hidup
        </span>
      </div>
    );
  }

  // If user is on Paid Plan
  if (trialInfo.isPaid) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <span className="text-xs font-bold">Paket Berbayar (Pro) Aktif</span>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
              Semua fitur laporan akuntansi, konversi kurs, dan brankas terenkripsi aktif penuh.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If Trial is Expired — masa tenggang 30 hari sebelum akun dihapus otomatis
  if (trialInfo.isExpired) {
    const daysLeft = trialInfo.daysUntilAutoDelete ?? 30;
    const urgent = daysLeft <= 7;
    return (
      <div
        className={`mb-5 rounded-2xl border-2 p-4 shadow-md ${
          urgent
            ? 'border-rose-400 bg-rose-50 animate-pulse dark:border-rose-700 dark:bg-rose-950/60'
            : 'border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/50'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-rose-900 dark:text-rose-200 uppercase tracking-wider">
                  ⚠️ Segera Perpanjang Akun Anda
                </span>
                <span className="rounded-md bg-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-900 dark:bg-rose-900 dark:text-rose-200">
                  Expired
                </span>
              </div>
              <p className="text-xs font-semibold text-rose-800 dark:text-rose-200 mt-1 max-w-xl">
                Segera perpanjang, apabila tidak diperpanjang maka akun akan terhapus otomatis dalam {daysLeft} hari
                {(trialInfo.autoDeleteDate ? ` (tanggal ${trialInfo.autoDeleteDate})` : '')}.
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                Seluruh data pembukuan Anda akan hilang permanen setelah tanggal tersebut. Hubungi pengembang di{' '}
                <span className="font-mono font-bold">admin@bukukas.ai.studio</span> untuk aktivasi Lisensi Lifetime.
              </p>

              {/* Countdown bar masa tenggang */}
              <div className="mt-2 flex items-center gap-2 max-w-xs">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-rose-200 dark:bg-rose-900">
                  <div
                    className="h-full rounded-full bg-rose-600 dark:bg-rose-500"
                    style={{ width: `${Math.max(4, Math.min(100, (daysLeft / 30) * 100))}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300">
                  {daysLeft}/30 hari
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => setIsCryptoPaymentModalOpen(true)}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-sm active:scale-95 transition ${
                urgent ? 'bg-rose-700 hover:bg-rose-800 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-amber-300" />
              <span>Perpanjang Sekarang ($10 / 1 Tahun)</span>
            </button>
            <button
              onClick={() => setIsContactDevModalOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3.5 py-2 text-xs font-bold text-rose-700 shadow-xs hover:bg-rose-50 transition dark:border-rose-800 dark:bg-slate-800 dark:text-rose-300"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Hubungi Dev / Minta Lifetime</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active 7-Day Trial
  return (
    <div className="mb-4 rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50 via-sky-50 to-blue-50/80 p-4 text-slate-900 shadow-xs dark:border-indigo-900/60 dark:bg-slate-900/80 dark:text-slate-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-indigo-950 dark:text-indigo-200">
                Akun Uji Coba (Trial 7 Hari)
              </span>
              <span className="rounded-full bg-indigo-200/80 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                Sisa {trialInfo.daysRemaining} Hari Lagi
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              Akun register mandiri Anda memiliki akses uji coba gratis hingga tanggal <span className="font-semibold">{trialInfo.formattedExpiry}</span>. Selanjutnya dapat di-upgrade ke berbayar / Lifetime.
            </p>

            {/* Remaining Progress Bar */}
            <div className="mt-2 flex items-center gap-2 max-w-xs">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className={`h-full transition-all ${
                    trialInfo.daysRemaining <= 2 ? 'bg-amber-500' : 'bg-indigo-600 dark:bg-indigo-400'
                  }`}
                  style={{ width: `${trialInfo.percentageLeft}%` }}
                />
              </div>
              <span className="text-[10px] font-semibold text-slate-500">{trialInfo.percentageLeft}%</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setIsContactDevModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-xs hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-800 dark:text-indigo-300"
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Kirim Pesan ke Dev</span>
          </button>

          <button
            onClick={() => setIsContactDevModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 active:scale-95 transition"
          >
            <Crown className="h-3.5 w-3.5 text-amber-300" />
            <span>Upgrade ke Lifetime</span>
          </button>

          {/* Menjadi Seller Button — only for non-admin, non-lifetime users */}
          {!trialInfo.isLifetime && (
            <button
              onClick={() => setIsSellerModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 shadow-xs hover:bg-amber-100 transition dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
            >
              <Gift className="h-3.5 w-3.5" />
              <span>Mau Menjadi Seller?</span>
            </button>
          )}

          <SellerApplicationModal isOpen={isSellerModalOpen} onClose={() => setIsSellerModalOpen(false)} />
        </div>
      </div>
    </div>
  );
};
