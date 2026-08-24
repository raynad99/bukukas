import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Clock,
  Cloud,
  Copy,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Upload,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateTOTPCode } from '../utils/crypto';

export const SecurityView: React.FC = () => {
  const {
    t,
    security,
    setMasterPassphrase,
    toggle2FA,
    cloudSync,
    setCloudProvider,
    downloadEncryptedBackup,
    restoreFromBackupJson,
    triggerManualCloudSync,
    lockApp,
    addNotification,
  } = useApp();

  const [copiedDevEmail, setCopiedDevEmail] = useState(false);

  const handleCopyDevEmail = () => {
    navigator.clipboard.writeText('admin@bukukas.ai.studio');
    setCopiedDevEmail(true);
    addNotification('success', 'Email Tersalin', 'Email bisnis developer (admin@bukukas.ai.studio) berhasil disalin.');
    setTimeout(() => setCopiedDevEmail(false), 2000);
  };

  // Encryption master key change states
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passError, setPassError] = useState('');

  // 2FA TOTP live code simulator
  const [currentTOTP, setCurrentTOTP] = useState('');
  const [totpCountdown, setTotpCountdown] = useState(30);

  // Restore file input ref
  const [restoreJsonString, setRestoreJsonString] = useState('');
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  // Update live TOTP code every second
  useEffect(() => {
    const updateCode = async () => {
      if (security.isTwoFactorEnabled && security.totpSecret) {
        const code = await generateTOTPCode(security.totpSecret);
        setCurrentTOTP(code);
      }
      const epochSec = Math.floor(Date.now() / 1000);
      const remaining = 30 - (epochSec % 30);
      setTotpCountdown(remaining);
    };

    updateCode();
    const interval = setInterval(updateCode, 1000);
    return () => clearInterval(interval);
  }, [security.isTwoFactorEnabled, security.totpSecret]);

  const handleUpdatePassphrase = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');

    if (newPass.length < 6) {
      setPassError('Kata sandi master minimal 6 karakter!');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('Konfirmasi kata sandi tidak cocok!');
      return;
    }

    try {
      await setMasterPassphrase(newPass);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      addNotification('success', 'Enkripsi Diperbarui', 'Kunci enkripsi master AES-256 berhasil diperbarui.');
    } catch (err) {
      setPassError('Gagal memperbarui kata sandi.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        const content = event.target?.result as string;
        setRestoreJsonString(content);
        setIsRestoreModalOpen(true);
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreJsonString || !restorePassphrase) {
      addNotification('error', 'Gagal', 'Masukkan kata sandi enkripsi file cadangan.');
      return;
    }

    const success = await restoreFromBackupJson(restoreJsonString, restorePassphrase);
    if (success) {
      setIsRestoreModalOpen(false);
      setRestoreJsonString('');
      setRestorePassphrase('');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* View Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t('security_title')} & {t('cloud_sync_title')}
            </h2>
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" /> AES-256 + 2FA
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('security_desc')}
          </p>
        </div>

        <button
          onClick={lockApp}
          className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 shadow-2xs transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
        >
          <Lock className="h-4 w-4" />
          <span>Kunci Aplikasi Sekarang</span>
        </button>
      </div>

      {/* Grid: E2E Encryption & 2FA */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Card 1: End-to-End Encryption */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {t('e2e_encryption_title')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Standar Militer AES-GCM 256-bit + PBKDF2 (100,000 iterasi)
                  </p>
                </div>
              </div>

              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {t('encryption_status_active')}
              </span>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              <p>
                Semua data transaksi, rekening perbankan, dan pengingat tagihan Anda dienkripsi secara lokal sebelum disimpan di memori dan saat disinkronisasi ke penyimpanan awan.
              </p>
            </div>

            {/* Set / Change Master Passphrase Form */}
            <form onSubmit={handleUpdatePassphrase} className="mt-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                {t('change_master_password')}
              </h4>

              {passError && (
                <div className="rounded-lg bg-rose-50 p-2 text-xs text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                  {passError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {t('new_master_password')}
                </label>
                <div className="relative mt-1">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    placeholder="Minimal 6 karakter"
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-9 pl-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute top-2.5 right-3 text-slate-400"
                  >
                    {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {t('confirm_new_password')}
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="Ulangi kata sandi baru"
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                Simpan Kunci Enkripsi Baru
              </button>
            </form>
          </div>
        </div>

        {/* Card 2: Two-Factor Authentication (2FA / TOTP) */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {t('two_factor_auth')} (2FA)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Otentikasi dinamis berbasis TOTP (Google Authenticator / Authy)
                  </p>
                </div>
              </div>

              <button
                onClick={() => toggle2FA(!security.isTwoFactorEnabled)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  security.isTwoFactorEnabled
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {security.isTwoFactorEnabled ? '2FA Aktif' : '2FA Nonaktif'}
              </button>
            </div>

            {security.isTwoFactorEnabled ? (
              <div className="mt-5 space-y-4">
                {/* Live TOTP Display Box */}
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-center dark:border-indigo-900/50 dark:bg-indigo-950/20">
                  <span className="text-[11px] font-bold text-indigo-800 uppercase dark:text-indigo-300">
                    KODE VERIFIKASI SAAT INI (TOTP)
                  </span>
                  <div className="my-2 font-mono text-3xl font-black tracking-widest text-indigo-900 dark:text-white">
                    {currentTOTP ? `${currentTOTP.slice(0, 3)} ${currentTOTP.slice(3)}` : '123 456'}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
                    <Clock className="h-3.5 w-3.5 animate-spin" />
                    <span>Berganti dalam <strong>{totpCountdown}s</strong></span>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Secret Key 2FA:</span>
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                      {security.totpSecret}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
                <ShieldAlert className="mb-2 h-8 w-8 text-amber-500" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  2FA Belum Diaktifkan
                </p>
                <p className="mt-1 max-w-xs text-xs text-slate-500">
                  Tingkatkan keamanan pembukuan Anda dengan mengaktifkan verifikasi 2 langkah untuk setiap pembukaan kunci.
                </p>
                <button
                  onClick={() => toggle2FA(true)}
                  className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500"
                >
                  Aktifkan 2FA Sekarang
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cloud Sync Section */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {t('cloud_sync_title')} (Penyimpanan Awan Pihak Ketiga)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('cloud_sync_desc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={triggerManualCloudSync}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-500"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{t('sync_now')}</span>
            </button>
          </div>
        </div>

        {/* Cloud Provider Selectors */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { id: 'google_drive', name: 'Google Drive', icon: 'HardDrive' },
            { id: 'dropbox', name: 'Dropbox Cloud', icon: 'Box' },
            { id: 'onedrive', name: 'MS OneDrive', icon: 'Cloud' },
            { id: 'webdav', name: 'Nextcloud / WebDAV', icon: 'Server' },
          ].map(prov => (
            <button
              key={prov.id}
              onClick={() => setCloudProvider(prov.id as any)}
              className={`flex flex-col items-center justify-center rounded-xl border p-3.5 text-center transition ${
                cloudSync.provider === prov.id
                  ? 'border-blue-500 bg-blue-50/50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200'
                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800'
              }`}
            >
              <Cloud className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <span className="mt-2 text-xs font-bold">{prov.name}</span>
              <span className="mt-0.5 text-[10px] text-slate-400">
                {cloudSync.provider === prov.id ? 'Terhubung' : 'Pilih'}
              </span>
            </button>
          ))}
        </div>

        {/* Backup & Restore Action Bars */}
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 dark:border-slate-800">
          {/* Download Encrypted Snapshot */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              {t('manual_backup_title')}
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Unduh salinan cadangan snapshot terenkripsi AES-256 ke perangkat Anda (.enc.json).
            </p>
            <button
              id="btn-download-backup"
              onClick={downloadEncryptedBackup}
              className="mt-3 flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t('download_encrypted_backup')}</span>
            </button>
          </div>

          {/* Restore Snapshot */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              {t('restore_data')}
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Pulihkan seluruh data pembukuan dari file snapshot terenkripsi.
            </p>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
              <Upload className="h-3.5 w-3.5 text-emerald-600" />
              <span>{t('choose_backup_file')}</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Developer & Security Support Business Email */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Email Bisnis Pengembang (Domain Resmi)
                </h3>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Resmi
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Untuk pertanyaan teknis, integrasi sistem, audit keamanan, atau kustomisasi bisnis, hubungi: <strong className="font-mono text-emerald-700 dark:text-emerald-300">admin@bukukas.ai.studio</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyDevEmail}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {copiedDevEmail ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              <span>{copiedDevEmail ? 'Email Tersalin!' : 'Salin Email'}</span>
            </button>

            <a
              href="mailto:admin@bukukas.ai.studio?subject=Business%20Security%20Inquiry%20-%20Financial%20App"
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-500"
            >
              <Mail className="h-4 w-4" />
              <span>Kirim Email</span>
            </a>
          </div>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Masukkan Kata Sandi Enkripsi Cadangan
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              File cadangan ini dilindungi enkripsi AES-256. Masukkan kata sandi yang digunakan saat mencadangkan data.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Kata Sandi Master Cadangan
              </label>
              <input
                type="password"
                required
                placeholder="Kata sandi enkripsi..."
                value={restorePassphrase}
                onChange={e => setRestorePassphrase(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                className="w-1/2 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="w-1/2 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
              >
                Dekripsi & Pulihkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
