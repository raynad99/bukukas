import React, { useState, useEffect } from 'react';
import { X, Send, CheckCircle2, Clock, AlertCircle, Users, Gift, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SellerApplicationModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { currentUser, allRegisteredAccounts, addNotification } = useApp();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [adminNotes, setAdminNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Find upline (referrer) of current user
  const upline = currentUser?.referredBy
    ? allRegisteredAccounts.find(u => u.email === currentUser.referredBy || u.name === currentUser.referredBy)
    : null;

  useEffect(() => {
    if (!isOpen || !currentUser) return;
    // Check application status
    fetch(`/api/seller/status/${currentUser.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.hasApplied) {
          setStatus(data.status);
          setAdminNotes(data.adminNotes || '');
        } else {
          setStatus('none');
        }
      })
      .catch(() => {});
  }, [isOpen, currentUser]);

  const handleSubmit = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch('/api/seller/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          email: currentUser.email,
          name: currentUser.name,
          uplineUserId: upline?.id || null,
          uplineEmail: upline?.email || null,
          uplineName: upline?.name || null,
          reason: reason.trim() || 'Ingin menjadi seller dan mendapatkan link referral',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.status || 'pending');
        setSubmitted(true);
        addNotification('success', 'Pengajuan Terkirim ✅', data.message || 'Pengajuan seller berhasil dikirim.');
        setTimeout(() => onClose(), 2000);
      } else {
        addNotification('error', 'Gagal', data.error || 'Gagal mengirim pengajuan.');
      }
    } catch (err) {
      addNotification('error', 'Error', 'Gagal mengirim pengajuan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full bg-slate-100 p-1.5 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Menjadi Seller / Afiliasi</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Ajukan diri menjadi seller dan dapatkan link referral</p>
          </div>
        </div>

        {/* Status display */}
        {status === 'approved' && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200">✅ Disetujui!</span>
            </div>
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
              Selamat! Akun Anda sudah menjadi Lifetime VIP. Buka Dev Portal untuk melihat kode referral Anda.
            </p>
            {adminNotes && (
              <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 italic">Catatan admin: {adminNotes}</p>
            )}
          </div>
        )}

        {status === 'pending' && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-bold text-amber-800 dark:text-amber-200">⏳ Menunggu Persetujuan</span>
            </div>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Pengajuan Anda sedang ditinjau oleh admin. Biasanya proses ini memakan waktu 1-2 hari kerja.
            </p>
          </div>
        )}

        {status === 'rejected' && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/40">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <span className="text-sm font-bold text-rose-800 dark:text-rose-200">❌ Ditolak</span>
            </div>
            <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
              Pengajuan Anda ditolak oleh admin.
            </p>
            {adminNotes && (
              <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-400 italic">Alasan: {adminNotes}</p>
            )}
          </div>
        )}

        {/* Application form */}
        {status === 'none' && !submitted && (
          <>
            {/* How it works */}
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <h4 className="mb-2 text-xs font-bold text-slate-900 dark:text-white">Cara Menjadi Seller:</h4>
              <div className="space-y-2">
                {[
                  { step: '1', text: 'Ajukan permohonan menjadi seller', icon: '📝' },
                  { step: '2', text: 'Admin meninjau dan menyetujui', icon: '👀' },
                  { step: '3', text: 'Akun di-upgrade ke Lifetime VIP', icon: '👑' },
                  { step: '4', text: 'Dapatkan kode referral unik', icon: '🔗' },
                  { step: '5', text: 'Share link → Dapat Rp30.000 per conversion', icon: '💰' },
                ].map(item => (
                  <div key={item.step} className="flex items-center gap-2">
                    <span className="text-sm">{item.icon}</span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upline info */}
            {upline && (
              <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/40">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-800 dark:text-blue-200">
                    Upline Anda: {upline.name}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-blue-600 dark:text-blue-400">
                  Admin akan mengetahui bahwa Anda direkomendasikan oleh {upline.name}.
                </p>
              </div>
            )}

            {/* Reason textarea */}
            <div className="mb-4">
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Alasan Ingin Menjadi Seller (opsional)
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Ceritakan mengapa Anda ingin menjadi seller BukuKas Pro..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                rows={3}
              />
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {loading ? 'Mengirim...' : 'Ajukan Menjadi Seller'}
            </button>
          </>
        )}

        {/* Success state after submit */}
        {submitted && status === 'pending' && (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Pengajuan Terkirim! ✅</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Admin akan segera meninjau pengajuan Anda. Anda akan di-upgrade ke Lifetime VIP jika disetujui.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
