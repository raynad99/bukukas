import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Link2, Copy, Check, Users, DollarSign, Clock, Gift, ExternalLink, Share2 } from 'lucide-react';

interface ReferralStats {
  code: string | null;
  totalReferrals: number;
  convertedReferrals: number;
  totalRewardEarned: number;
  pendingReward: number;
  referrals: Array<{
    id: string;
    referredEmail: string;
    referredName: string;
    status: string;
    rewardAmount: number;
    rewardPaid: boolean;
    referredPlan: string;
    createdAt: string;
  }>;
}

const EMPTY_STATS: ReferralStats = {
  code: null,
  totalReferrals: 0,
  convertedReferrals: 0,
  totalRewardEarned: 0,
  pendingReward: 0,
  referrals: [],
};

/**
 * Offline / static-hosting fallback: a stable per-account code kept in
 * localStorage. Used whenever the referral API is unreachable so the invite
 * link ALWAYS shows for lifetime users instead of silently disappearing.
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
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const applyInviteLink = useCallback((code: string | null | undefined) => {
    if (code) setInviteLink(`${window.location.origin}/auth?ref=${code}`);
  }, []);

  const fetchStats = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/referral/stats/${currentUser.id}?email=${encodeURIComponent(currentUser.email)}`);
      const data = await res.json();
      if (data.success) {
        const serverCode: string | null = data.code || null;
        // Show something immediately (stable local code), then make sure the
        // server also has a persistent code so the link works across devices.
        const localCode = serverCode || getOrCreateLocalReferralCode(currentUser.email);
        setStats({ ...EMPTY_STATS, ...data, code: localCode });
        applyInviteLink(localCode);
        if (!serverCode) {
          try {
            const genRes = await fetch('/api/referral/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: currentUser.id, email: currentUser.email }),
            });
            const genData = await genRes.json();
            if (genData.success && genData.code) {
              setStats(prev => (prev ? { ...prev, code: genData.code } : prev));
              applyInviteLink(genData.code);
            }
          } catch { /* offline — local code stays */ }
        }
        return;
      }
    } catch (err) {
      console.warn('Referral API unavailable — using local fallback code:', err);
    }
    const localCode = getOrCreateLocalReferralCode(currentUser.email);
    setStats({ ...EMPTY_STATS, code: localCode });
    applyInviteLink(localCode);
  }, [currentUser, applyInviteLink]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-generate referral code for lifetime users who don't have one yet.
  // The local fallback guarantees a code exists even if this request fails.
  useEffect(() => {
    if (!loading && currentUser && !stats?.code && currentUser.plan === 'lifetime') {
      const localCode = getOrCreateLocalReferralCode(currentUser.email);
      setStats(prev => (prev ? { ...prev, code: prev.code || localCode } : { ...EMPTY_STATS, code: localCode }));
      applyInviteLink(localCode);
      (async () => {
        try {
          const res = await fetch('/api/referral/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, email: currentUser.email }),
          });
          const data = await res.json();
          if (data.success && data.code) {
            applyInviteLink(data.code);
            await fetchStats();
          }
        } catch (err) {
          console.warn('Auto-generate skipped (API unavailable), local code active:', err);
        }
      })();
    }
  }, [loading, currentUser, stats?.code, fetchStats, applyInviteLink]);

  const handleGenerateLink = async () => {
    if (!currentUser) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/referral/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, email: currentUser.email }),
      });
      const data = await res.json();
      if (data.success && data.code) {
        applyInviteLink(data.code);
        await fetchStats();
      } else {
        applyInviteLink(getOrCreateLocalReferralCode(currentUser.email));
      }
    } catch {
      // API unreachable (offline/static host) — show the stable local code.
      applyInviteLink(getOrCreateLocalReferralCode(currentUser.email));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
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
      {/* Header */}
      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 p-5 dark:border-amber-900/60 dark:from-amber-950/40 dark:via-amber-950/20 dark:to-orange-950/40">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-amber-900 dark:text-amber-200">
              💰 Program Referral — Dapatkan Rp30.000!
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Undang teman daftar pakai linkmu. Setiap yang upgrade ke Paket Berbayar, kamu dapat Rp30.000.
            </p>
          </div>
        </div>
      </div>

      {/* Invite Link Section */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Link2 className="h-4 w-4 text-emerald-600" />
          Link Undangan
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
          <div className="text-center">
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Belum ada link undangan. Klik tombol di bawah untuk membuat.
            </p>
            <button
              onClick={handleGenerateLink}
              disabled={generating}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              <Gift className="h-4 w-4" />
              {generating ? 'Membuat...' : 'Generate Link Undangan'}
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3.5 dark:border-blue-950 dark:bg-blue-950/20">
            <div className="flex items-center justify-between text-xs font-medium text-blue-800 dark:text-blue-300">
              <span>Total Undangan</span>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-1 text-xl font-extrabold text-blue-600 dark:text-blue-400">
              {stats.totalReferrals}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5 dark:border-emerald-950 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between text-xs font-medium text-emerald-800 dark:text-emerald-300">
              <span>Converted</span>
              <Check className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-1 text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {stats.convertedReferrals}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3.5 dark:border-amber-950 dark:bg-amber-950/20">
            <div className="flex items-center justify-between text-xs font-medium text-amber-800 dark:text-amber-300">
              <span>Total Reward</span>
              <DollarSign className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-1 text-xl font-extrabold text-amber-600 dark:text-amber-400">
              Rp {Number(stats.totalRewardEarned || 0).toLocaleString('id-ID')}
            </div>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-3.5 dark:border-purple-950 dark:bg-purple-950/20">
            <div className="flex items-center justify-between text-xs font-medium text-purple-800 dark:text-purple-300">
              <span>Menunggu</span>
              <Clock className="h-4 w-4 text-purple-600" />
            </div>
            <div className="mt-1 text-xl font-extrabold text-purple-600 dark:text-purple-400">
              Rp {Number(stats.pendingReward || 0).toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      )}

      {/* Referred Users List */}
      {stats && stats.referrals.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Users className="h-4 w-4 text-emerald-600" />
            Daftar Pengguna Undangan
          </h4>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {stats.referrals.map((ref) => (
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
                    {ref.status === 'converted' ? '💎 Converted' : ref.status === 'registered' ? '📧 Terdaftar' : '⏳ Pending'}
                  </span>
                  {ref.status === 'converted' && (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      +Rp {Number(ref.rewardAmount || 30000).toLocaleString('id-ID')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h4 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Cara Kerja</h4>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Generate Link', desc: 'Klik tombol untuk membuat link unik', icon: '🔗' },
            { step: '2', title: 'Share ke Teman', desc: 'Kirim link via WhatsApp, email, atau media sosial', icon: '📤' },
            { step: '3', title: 'Teman Daftar', desc: 'Teman kamu daftar pakai link undanganmu', icon: '📝' },
            { step: '4', title: 'Upgrade & Dapat Reward', desc: 'Saat teman upgrade ke Paket Berbayar, kamu dapat Rp30.000', icon: '💰' },
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
      </div>
    </div>
  );
}
