import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  Link2, Copy, Check, Users, DollarSign, Clock, Gift,
  ExternalLink, Share2, TrendingUp, Award, ArrowUpCircle
} from 'lucide-react';

interface CommissionReferral {
  id: string;
  referredEmail: string;
  referredName: string;
  status: string;
  referredPlan: string | null;
  commission: number;
  paid: boolean;
  createdAt: string;
}

interface CommissionSummary {
  totalReferrals: number;
  convertedCount: number;
  pendingCount: number;
  commissionPerConversion: number;
  totalCommission: number;
  paidCommission: number;
  unpaidCommission: number;
  referrals: CommissionReferral[];
}

const EMPTY_SUMMARY: CommissionSummary = {
  totalReferrals: 0,
  convertedCount: 0,
  pendingCount: 0,
  commissionPerConversion: 30000,
  totalCommission: 0,
  paidCommission: 0,
  unpaidCommission: 0,
  referrals: [],
};

/**
 * Offline / static-hosting fallback: stable per-account code in localStorage.
 */
function getOrCreateLocalReferralCode(email: string): string {
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
}

export default function ReferralDashboard() {
  const { currentUser } = useApp();
  const [summary, setSummary] = useState<CommissionSummary>(EMPTY_SUMMARY);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const applyCode = useCallback((code: string | null | undefined) => {
    if (code) {
      setReferralCode(code);
      setInviteLink(`${window.location.origin}/auth?ref=${code}`);
    }
  }, []);

  const fetchCommission = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(
        `/api/commission/summary/${currentUser.id}?email=${encodeURIComponent(currentUser.email)}`
      );
      const data = await res.json();
      if (data.success) {
        setSummary({ ...EMPTY_SUMMARY, ...data });
        // Also fetch the referral code (may be different from commission data)
        try {
          const codeRes = await fetch(
            `/api/referral/stats/${currentUser.id}?email=${encodeURIComponent(currentUser.email)}`
          );
          const codeData = await codeRes.json();
          if (codeData.success && codeData.code) {
            applyCode(codeData.code);
          } else {
            applyCode(getOrCreateLocalReferralCode(currentUser.email));
          }
        } catch {
          applyCode(getOrCreateLocalReferralCode(currentUser.email));
        }
        return;
      }
    } catch (err) {
      console.warn('Commission API unavailable — using local fallback:', err);
    }
    // Offline fallback
    const localCode = getOrCreateLocalReferralCode(currentUser.email);
    applyCode(localCode);
  }, [currentUser, applyCode]);

  useEffect(() => {
    fetchCommission().finally(() => setLoading(false));
  }, [fetchCommission]);

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = inviteLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareWhatsApp = () => {
    if (!inviteLink) return;
    const text = encodeURIComponent(
      `Hai! 👋\n\nAku pakai BukuKas Pro untuk kelola keuangan bisnis. Cocok banget buat UMKM!\n\nYuk daftar pakai link ini:\n${inviteLink}\n\nPaket berbayar 1 tahun cuma Rp199rb, dapat fitur lengkap! 🚀`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header — Commission Overview (separate from bookkeeping) */}
      <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 p-5 dark:border-emerald-900/60 dark:from-emerald-950/40 dark:via-green-950/20 dark:to-teal-950/40">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Award className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-200">
              💰 Komisi Penjualan — Direct Selling
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
              Komisi ini terpisah dari data pembukuan pribadi Anda. Setiap member yang berhasil diaktifkan mode berbayar oleh admin/dev, Anda mendapat <strong>Rp 30.000</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Invite Link Section */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Link2 className="h-4 w-4 text-emerald-600" />
          Link Undangan Upline
        </h4>

        {inviteLink ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
              <code className="flex-1 truncate text-xs text-slate-700 dark:text-slate-300">
                {inviteLink}
              </code>
              <button
                onClick={handleCopyLink}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500 active:scale-95"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Tersalin!' : 'Salin'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center gap-1.5 rounded-xl bg-green-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-green-500 active:scale-95"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share WhatsApp
              </button>
              <button
                onClick={() => window.open(inviteLink, '_blank')}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Buka Link
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-slate-500 dark:text-slate-400">
            Memuat kode referal...
          </div>
        )}
      </div>

      {/* Commission KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3.5 dark:border-blue-950 dark:bg-blue-950/20">
          <div className="flex items-center justify-between text-xs font-medium text-blue-800 dark:text-blue-300">
            <span>Total Undangan</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-1 text-xl font-extrabold text-blue-600 dark:text-blue-400">
            {summary.totalReferrals}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5 dark:border-emerald-950 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-800 dark:text-emerald-300">
            <span>Berhasil Aktif</span>
            <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1 text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {summary.convertedCount}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3.5 dark:border-amber-950 dark:bg-amber-950/20">
          <div className="flex items-center justify-between text-xs font-medium text-amber-800 dark:text-amber-300">
            <span>Total Komisi</span>
            <DollarSign className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-1 text-xl font-extrabold text-amber-600 dark:text-amber-400">
            Rp {Number(summary.totalCommission).toLocaleString('id-ID')}
          </div>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-3.5 dark:border-purple-950 dark:bg-purple-950/20">
          <div className="flex items-center justify-between text-xs font-medium text-purple-800 dark:text-purple-300">
            <span>Menunggu Konfirmasi</span>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-1 text-xl font-extrabold text-purple-600 dark:text-purple-400">
            {summary.pendingCount}
          </div>
          <p className="text-[10px] text-purple-600/70">belum aktif berbayar</p>
        </div>
      </div>

      {/* Commission Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Sudah Dibayar
          </div>
          <div className="mt-2 text-lg font-extrabold text-emerald-600">
            Rp {Number(summary.paidCommission).toLocaleString('id-ID')}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Clock className="h-4 w-4 text-amber-500" />
            Belum Dibayar
          </div>
          <div className="mt-2 text-lg font-extrabold text-amber-600">
            Rp {Number(summary.unpaidCommission).toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      {/* Referral User List */}
      {summary.referrals.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Users className="h-4 w-4 text-emerald-600" />
            Daftar Member (Direct Selling)
          </h4>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {summary.referrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {ref.referredName?.charAt(0) || ref.referredEmail.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {ref.referredName || ref.referredEmail.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {ref.referredEmail} • {new Date(ref.createdAt).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    ref.status === 'converted'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : ref.status === 'registered'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {ref.status === 'converted' ? '💎 Aktif Berbayar' : ref.status === 'registered' ? '📧 Terdaftar' : '⏳ Pending'}
                  </span>
                  {ref.status === 'converted' && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      +Rp {Number(ref.commission || 30000).toLocaleString('id-ID')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How Commission Works */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h4 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Cara Kerja Komisi</h4>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Buat Akun Member', desc: 'Buat akun baru untuk klien/rekan via Dev Portal', icon: '👤' },
            { step: '2', title: 'Share Link Undangan', desc: 'Kirim link ke member agar mereka bisa masuk', icon: '📤' },
            { step: '3', title: 'Member Aktif Berbayar', desc: 'Admin/dev mengaktifkan paket berbayar untuk member', icon: '💳' },
            { step: '4', title: 'Komisi Masuk', desc: 'Anda mendapat Rp30.000 per konversi (direct selling, 1-level)', icon: '💰' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <span className="text-lg">{item.icon}</span>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <strong>Catatan:</strong> Sistem ini menggunakan model <strong>Direct Selling</strong> (1-level), bukan MLM. Komisi hanya dihitung dari member langsung yang Anda daftarkan.
        </div>
      </div>
    </div>
  );
}
