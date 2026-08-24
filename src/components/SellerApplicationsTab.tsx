import React, { useState, useEffect } from 'react';
import { Check, X, Clock, Users, Gift, Eye, MessageSquare } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SellerApplication {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  uplineUserId: string | null;
  uplineEmail: string | null;
  uplineName: string | null;
  status: string;
  reason: string | null;
  adminNotes: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
}

export default function SellerApplicationsTab() {
  const { currentUser } = useApp();
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/seller/applications');
      const data = await res.json();
      if (data.success) {
        setApplications(data.applications);
      }
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleReview = async (applicationId: string, action: 'approved' | 'rejected') => {
    try {
      const res = await fetch('/api/seller/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          action,
          adminNotes: reviewNotes.trim() || null,
          adminUserId: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReviewingId(null);
        setReviewNotes('');
        fetchApplications(); // Refresh list
      }
    } catch (err) {
      console.error('Failed to review application:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  const pending = applications.filter(a => a.status === 'pending');
  const reviewed = applications.filter(a => a.status !== 'pending');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 p-5 dark:border-emerald-900/60 dark:from-emerald-950/40 dark:via-green-950/20 dark:to-teal-950/40">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-200">
              📋 Pengajuan Seller / Afiliasi
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Setujui pengajuan user untuk menjadi seller → auto upgrade ke Lifetime + dapat kode referral
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3.5 dark:border-amber-950 dark:bg-amber-950/20">
          <div className="text-xs font-medium text-amber-800 dark:text-amber-300">Menunggu</div>
          <div className="mt-1 text-xl font-extrabold text-amber-600">{pending.length}</div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5 dark:border-emerald-950 dark:bg-emerald-950/20">
          <div className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Disetujui</div>
          <div className="mt-1 text-xl font-extrabold text-emerald-600">
            {applications.filter(a => a.status === 'approved').length}
          </div>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-3.5 dark:border-rose-950 dark:bg-rose-950/20">
          <div className="text-xs font-medium text-rose-800 dark:text-rose-300">Ditolak</div>
          <div className="mt-1 text-xl font-extrabold text-rose-600">
            {applications.filter(a => a.status === 'rejected').length}
          </div>
        </div>
      </div>

      {/* Pending Applications */}
      {pending.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Clock className="h-4 w-4 text-amber-500" />
            Menunggu Persetujuan ({pending.length})
          </h4>
          <div className="space-y-3">
            {pending.map(app => (
              <div key={app.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                      {app.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-bold text-slate-900 dark:text-white">{app.userName}</h5>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                          PENDING
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{app.userEmail}</p>
                      {app.uplineName && (
                        <p className="mt-1 text-[11px] text-blue-600 dark:text-blue-400">
                          🔗 Upline: {app.uplineName} ({app.uplineEmail})
                        </p>
                      )}
                      {app.reason && (
                        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 italic">
                          "{app.reason}"
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-slate-400">
                        Diajukan: {new Date(app.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Review actions */}
                {reviewingId === app.id ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                    <label className="mb-1 block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Catatan Admin (opsional)
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={e => setReviewNotes(e.target.value)}
                      className="mb-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      rows={2}
                      placeholder="Catatan untuk applicant..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReview(app.id, 'approved')}
                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500"
                      >
                        <Check className="h-3 w-3" /> Setujui
                      </button>
                      <button
                        onClick={() => handleReview(app.id, 'rejected')}
                        className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-500"
                      >
                        <X className="h-3 w-3" /> Tolak
                      </button>
                      <button
                        onClick={() => { setReviewingId(null); setReviewNotes(''); }}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setReviewingId(app.id)}
                      className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-500"
                    >
                      <Eye className="h-3 w-3" /> Tinjau
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviewed Applications */}
      {reviewed.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Gift className="h-4 w-4 text-slate-400" />
            Sudah Ditinjau ({reviewed.length})
          </h4>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {reviewed.map(app => (
              <div key={app.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    app.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300'
                  }`}>
                    {app.userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{app.userName}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{app.userEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    app.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  }`}>
                    {app.status === 'approved' ? '✅ Disetujui' : '❌ Ditolak'}
                  </span>
                  {app.adminNotes && (
                    <span className="text-[10px] text-slate-400 italic max-w-[150px] truncate">
                      {app.adminNotes}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {applications.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
          <Users className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">Belum ada pengajuan seller</p>
          <p className="text-xs text-slate-400">Pengajuan dari user akan muncul di sini.</p>
        </div>
      )}
    </div>
  );
}
