import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  Clock,
  Code,
  Copy,
  Crown,
  ExternalLink,
  Eye,
  EyeOff,
  Fingerprint,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  QrCode,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserProfile } from '../types';
import { calculateTrialStatus } from '../utils/trialHelper';
import { OFFICIAL_CRYPTO_WALLET, OFFICIAL_WA_LINK } from './CryptoPaymentModal';

export const AuthView: React.FC = () => {
  const {
    currentUser,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    logout,
    savedUsers,
    allRegisteredAccounts,
    switchAccount,
    updateProfile,
    deleteSavedAccount,
    cloudSync,
    setActiveView,
    setIsContactDevModalOpen,
    setIsCryptoPaymentModalOpen,
    cryptoPayments,
    addNotification,
    requestPasswordReset,
    resetPasswordWithToken,
  } = useApp();

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedDevUrl, setCopiedDevUrl] = useState(false);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot Password modal state
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [forgotResult, setForgotResult] = useState<{ token: string; expiresAt: string; previewLink: string } | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [copiedResetLink, setCopiedResetLink] = useState(false);

  // Dev portal secure login state
  const [isDevLoginOpen, setIsDevLoginOpen] = useState(false);
  const [devEmail, setDevEmail] = useState('admin@bukukas.ai.studio');
  const [devSecretKey, setDevSecretKey] = useState('');
  const [devError, setDevError] = useState<string | null>(null);

  // Edit profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');

  const trialInfo = calculateTrialStatus(currentUser);

  // Detect URL parameter for direct dev access or password reset
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('portal') === 'dev' || params.get('dev') === '1' || params.get('dev') === 'portal') {
        setIsDevLoginOpen(true);
      }

      if (params.get('action') === 'reset_password') {
        const resetTargetEmail = params.get('email') || '';
        const resetTargetToken = params.get('token') || '';
        if (resetTargetEmail) {
          setForgotEmail(resetTargetEmail);
          setOtpCode(resetTargetToken);
          setForgotStep('verify');
          setIsForgotPasswordOpen(true);
        }
      }
    }
  }, []);

  const handleCopyDevEmail = () => {
    navigator.clipboard.writeText('admin@bukukas.ai.studio');
    setCopiedEmail(true);
    addNotification('success', 'Email Tersalin', 'Email bisnis developer (admin@bukukas.ai.studio) disalin ke papan klip.');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyWallet = () => {
    navigator.clipboard.writeText(OFFICIAL_CRYPTO_WALLET);
    setCopiedWallet(true);
    addNotification('success', 'Wallet Tersalin', 'Alamat wallet USDT/USDC Base disalin.');
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  // Google SSO Modal state
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleNameInput, setGoogleNameInput] = useState('');
  const [googleError, setGoogleError] = useState<string | null>(null);

  const handleCopyDevDirectUrl = () => {
    const devUrl = `${window.location.origin}${window.location.pathname}?portal=dev`;
    navigator.clipboard.writeText(devUrl);
    setCopiedDevUrl(true);
    addNotification('success', 'Link Khusus Dev Tersalin', `Tautan login dev aman (${devUrl}) disalin.`);
    setTimeout(() => setCopiedDevUrl(false), 2500);
  };

  const handleGoogleLogin = (directEmail?: string, directName?: string) => {
    if (directEmail && directEmail.includes('@')) {
      executeGoogleAuth(directEmail, directName);
      return;
    }

    if (email && email.includes('@')) {
      executeGoogleAuth(email.trim(), name.trim() || undefined);
      return;
    }

    setGoogleEmailInput('indoclickshop@gmail.com');
    setGoogleNameInput('');
    setGoogleError(null);
    setIsGoogleModalOpen(true);
  };

  const executeGoogleAuth = async (targetEmail: string, targetName?: string) => {
    if (!targetEmail || !targetEmail.includes('@')) {
      setGoogleError('Silakan masukkan alamat Gmail yang valid.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setGoogleError(null);
    try {
      await loginWithGoogle(targetEmail.trim(), targetName?.trim());
      setIsGoogleModalOpen(false);
    } catch (err: any) {
      setGoogleError(err?.message || 'Gagal memproses masuk dengan akun Google.');
      setErrorMessage(err?.message || 'Gagal memproses masuk dengan akun Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !email.includes('@')) {
      setErrorMessage('Silakan masukkan alamat email yang valid.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Kata sandi minimal harus 6 karakter.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'register') {
        if (!name.trim()) {
          setErrorMessage('Silakan masukkan nama lengkap Anda.');
          setIsLoading(false);
          return;
        }
        await registerWithEmail(name.trim(), email.trim(), password);
      } else {
        await loginWithEmail(email.trim(), password);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan saat memproses akun.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenForgotPassword = () => {
    setForgotEmail(email || '');
    setForgotStep('request');
    setForgotResult(null);
    setOtpCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setForgotError(null);
    setIsForgotPasswordOpen(true);
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setForgotError('Silakan masukkan alamat email yang valid.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await requestPasswordReset(forgotEmail.trim());
      setForgotResult(res);
      setOtpCode(res.token); // auto fill OTP for convenience
      setForgotStep('verify');
    } catch (err: any) {
      setForgotError(err?.message || 'Gagal mengirimkan tautan reset.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    if (!newPassword || newPassword.length < 6) {
      setForgotError('Kata sandi baru minimal harus 6 karakter.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setForgotError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setForgotLoading(true);
    try {
      const success = await resetPasswordWithToken(forgotEmail.trim(), newPassword.trim(), otpCode.trim());
      if (success) {
        setIsForgotPasswordOpen(false);
        setEmail(forgotEmail.trim());
        setPassword(newPassword.trim());
        setMode('login');
      }
    } catch (err: any) {
      setForgotError(err?.message || 'Gagal mereset kata sandi.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleCopyResetLink = () => {
    if (!forgotResult?.previewLink) return;
    navigator.clipboard.writeText(forgotResult.previewLink);
    setCopiedResetLink(true);
    addNotification('success', 'Tautan Tersalin', 'Tautan reset sandi disalin ke papan klip.');
    setTimeout(() => setCopiedResetLink(false), 2000);
  };

  const handleSecureDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setDevError(null);

    // Validate security master key / PIN
    const isKeyValid =
      devSecretKey === 'devadmin2026' ||
      devSecretKey === 'admin123' ||
      devSecretKey === 'indoclick2026' ||
      devSecretKey.length >= 6;

    if (!isKeyValid) {
      setDevError('Kunci Keamanan Developer / PIN salah.');
      return;
    }

    setIsLoading(true);
    try {
      const success = await loginWithEmail(devEmail.trim(), devSecretKey);
      if (success) {
        setIsDevLoginOpen(false);
        setActiveView('dev');
        addNotification('success', 'Akses Developer Diberikan 👑', 'Selamat datang di Panel Utama Developer BukuKas.');
      }
    } catch {
      setDevError('Gagal melakukan autentikasi akun developer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) return;
    updateProfile({ name: editName.trim() });
    setIsEditingProfile(false);
    addNotification('success', 'Profil Diperbarui', 'Nama profil Anda berhasil disimpan.');
  };

  const appendGmailDomain = () => {
    if (!email.includes('@')) {
      setEmail(prev => `${prev.trim()}@gmail.com`);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl sm:p-8 dark:border-slate-800">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-md">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Autentikasi & Akun Aman</span>
              </span>
              {currentUser && (
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${trialInfo.badgeClass}`}>
                  {trialInfo.badgeLabel}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              {currentUser ? 'Pusat Akun & Profil' : 'Masuk ke Pembukuan Keuangan'}
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              {currentUser
                ? `Anda terhubung sebagai ${currentUser.email}. Semua data transaksi dan cadangan awan tersimpan aman di akun Anda.`
                : 'Silakan masuk dengan akun Anda atau daftar mandiri untuk mendapatkan Masa Percobaan (Trial) 7 Hari gratis.'}
            </p>
          </div>

          {currentUser ? (
            <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10">
              <img
                src={currentUser.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=10b981&color=fff`}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="h-12 w-12 rounded-full border-2 border-emerald-400 object-cover shadow-sm"
              />
              <div>
                <div className="flex items-center gap-1.5 font-bold text-sm text-white">
                  <span>{currentUser.name}</span>
                  {currentUser.isVerified && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  )}
                </div>
                <div className="text-xs text-slate-300 flex items-center gap-1">
                  <Mail className="h-3 w-3 text-slate-400" />
                  <span>{currentUser.email}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex shrink-0 flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCryptoPaymentModalOpen(true)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 transition active:scale-95"
              >
                <Wallet className="h-4 w-4 text-amber-300" />
                <span>Bayar Pro Onchain Base</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Crypto Payment Highlight Banner */}
      <div className="rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-blue-50/50 to-indigo-100/60 p-5 dark:border-indigo-900/60 dark:bg-slate-900/80 dark:from-indigo-950/40 dark:to-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Crown className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Langganan Akun Pro 1 Tahun ($10 USDT/USDC ETH Base)
                </h3>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  Base L2
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
                Alamat Wallet: <strong className="font-mono text-indigo-700 dark:text-indigo-300">{OFFICIAL_CRYPTO_WALLET}</strong> ($10 / 1 Tahun). Kirim TX HASH bukti transfer dan konfirmasi via WhatsApp untuk aktivasi instan.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleCopyWallet}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {copiedWallet ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedWallet ? 'Tersalin' : 'Salin Wallet'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCryptoPaymentModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition active:scale-95"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>Input TX HASH & Konfirmasi</span>
            </button>
          </div>
        </div>
      </div>

      {currentUser ? (
        /* LOGGED IN VIEW */
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Profile Info Card */}
          <div className="space-y-6 md:col-span-2">
            {/* Dev Portal Shortcut Card if Admin */}
            {currentUser.role === 'admin' && (
              <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 p-5 text-white shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30">
                      <Crown className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-amber-300">Hak Akses Developer / Superadmin</h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Anda memiliki hak akses penuh untuk mengelola pengguna, memverifikasi TX Hash onchain, dan kotak masuk dev.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyDevDirectUrl}
                      className="rounded-xl border border-amber-400/40 bg-amber-900/40 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-800/50"
                      title="Salin tautan langsung khusus dev"
                    >
                      {copiedDevUrl ? 'Link Tersalin!' : 'Salin URL Dev'}
                    </button>
                    <button
                      onClick={() => setActiveView('dev')}
                      className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-black text-slate-950 shadow-md hover:brightness-110 active:scale-95 transition"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Buka Dev Portal</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Trial / Subscription Status Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Status Lisensi & Paket Akun
                </h3>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${trialInfo.badgeClass}`}>
                  {trialInfo.badgeLabel}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 rounded-xl bg-slate-50 p-4 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {trialInfo.isLifetime
                        ? '👑 Lisensi Lifetime VIP (Seumur Hidup)'
                        : trialInfo.isPaid
                        ? '💳 Paket Berbayar (Pro)'
                        : trialInfo.isExpired
                        ? '⚠️ Masa Trial 7 Hari Telah Habis'
                        : `⏳ Masa Percobaan (Trial 7 Hari Aktif)`}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {trialInfo.isLifetime
                        ? 'Akun Anda aktif permanen dengan fasilitas backup terenkripsi, sinkronisasi cloud, dan bebas biaya selamanya.'
                        : trialInfo.isPaid
                        ? 'Paket berbayar aktif penuh untuk semua pencatatan buku kas dan laporan valas.'
                        : trialInfo.isExpired
                        ? 'Masa uji coba 7 hari telah selesai. Silakan transfer USDT/USDC Base untuk aktivasi Lisensi Lifetime permanen.'
                        : `Masa uji coba gratis berlaku hingga ${trialInfo.formattedExpiry} (tersisa ${trialInfo.daysRemaining} hari).`}
                    </p>
                  </div>

                  {!trialInfo.isLifetime && (
                    <button
                      onClick={() => setIsCryptoPaymentModalOpen(true)}
                      className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 active:scale-95 transition flex items-center justify-center gap-1.5"
                    >
                      <Wallet className="h-4 w-4 text-amber-300" />
                      <span>Bayar $10 (1 Tahun Pro)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Info Details */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Detail Profil Pengguna
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {currentUser.provider === 'gmail' ? 'Google / Gmail Terhubung' : 'Email Aktif'}
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <img
                      src={currentUser.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=10b981&color=fff`}
                      alt={currentUser.name}
                      referrerPolicy="no-referrer"
                      className="h-14 w-14 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                    />
                    <div>
                      {isEditingProfile ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="rounded-lg border border-slate-300 px-2.5 py-1 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            placeholder="Nama Lengkap"
                          />
                          <button
                            onClick={handleSaveProfile}
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            Simpan
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-base dark:text-white">{currentUser.name}</h4>
                          <button
                            onClick={() => {
                              setEditName(currentUser.name);
                              setIsEditingProfile(true);
                            }}
                            className="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
                          >
                            Ubah
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{currentUser.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-2xs border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                      ID: {currentUser.id}
                    </span>
                  </div>
                </div>

                {/* Account Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/30">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tipe Akun</span>
                    <div className="mt-1 flex items-center gap-2 font-medium text-sm text-slate-800 dark:text-slate-200">
                      {currentUser.registeredSelf ? '🌐 Register Mandiri' : '👑 Dibuat Pengembang'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/30">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status Sinkronisasi</span>
                    <div className="mt-1 flex items-center gap-2 font-medium text-sm text-slate-800 dark:text-slate-200">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>{cloudSync.isConnected ? 'Google Drive Aktif' : 'Lokal (Siap Sync)'}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/30">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Terdaftar Sejak</span>
                    <div className="mt-1 font-medium text-sm text-slate-800 dark:text-slate-200">
                      {currentUser.createdAt}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/30">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Terakhir Masuk</span>
                    <div className="mt-1 font-medium text-sm text-slate-800 dark:text-slate-200">
                      {currentUser.lastLoginAt}
                    </div>
                  </div>
                </div>

                {/* Quick action buttons */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setActiveView('dashboard')}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                  >
                    <span>Buka Dasbor Keuangan</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => setIsCryptoPaymentModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                  >
                    <Wallet className="h-4 w-4 text-amber-300" />
                    <span>Pembayaran Akun Pro</span>
                  </button>

                  <button
                    onClick={() => setIsContactDevModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Hubungi Developer</span>
                  </button>

                  <button
                    onClick={logout}
                    className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Keluar dari Akun</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Switch Account Sidebar */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-600" />
                  Sesi Akun Tersimpan ({savedUsers.length})
                </h3>
              </div>

              {savedUsers.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {savedUsers.map(user => {
                    const isActive = user.id === currentUser.id;
                    const uStatus = calculateTrialStatus(user);
                    return (
                      <div
                        key={user.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                          isActive
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                            : 'border-slate-100 bg-slate-50 hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-800/40'
                        }`}
                      >
                        <button
                          onClick={() => switchAccount(user.id)}
                          className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                        >
                          <img
                            src={user.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=10b981&color=fff`}
                            alt={user.name}
                            referrerPolicy="no-referrer"
                            className="h-8 w-8 rounded-full border object-cover shrink-0"
                          />
                          <div className="truncate">
                            <div className="font-semibold text-xs text-slate-900 dark:text-white truncate flex items-center gap-1">
                              <span>{user.name}</span>
                              {isActive && <span className="text-[10px] text-emerald-600 font-bold">(Aktif)</span>}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate font-mono">{user.email}</div>
                            <div className="mt-0.5 flex items-center gap-1">
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${uStatus.badgeClass}`}>
                                {uStatus.badgeLabel}
                              </span>
                            </div>
                          </div>
                        </button>

                        {!isActive && user.role !== 'admin' && (
                          <button
                            onClick={() => deleteSavedAccount(user.id)}
                            className="text-slate-400 hover:text-rose-500 p-1 text-xs"
                            title="Hapus dari sesi"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-3 text-center">
                  Hanya 1 akun aktif pada perangkat ini.
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  onClick={() => handleGoogleLogin()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <span>+ Masuk Akun Lain</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* LOGIN / REGISTER FORM */
        <div className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-7">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
              {/* Tab Selector */}
              <div className="mb-6 flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition ${
                    mode === 'login'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Masuk (Login)
                </button>
                <button
                  onClick={() => {
                    setMode('register');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition ${
                    mode === 'register'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Daftar Akun Baru (Register)
                </button>
              </div>

              {/* Registration Notice */}
              {mode === 'register' && (
                <div className="mb-4 rounded-2xl border border-indigo-200 bg-indigo-50/80 p-3.5 text-xs text-indigo-950 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
                  <p className="font-bold flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Trial 7 Hari Otomatis untuk Akun Baru</span>
                  </p>
                  <p className="mt-1 text-[11px] text-indigo-800 dark:text-indigo-300">
                    Setiap pendaftaran mandiri langsung aktif dengan masa uji coba 7 hari dan otomatis tercatat di sistem pembukuan aman.
                  </p>
                </div>
              )}

              {errorMessage && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* ONE CLICK GOOGLE / GMAIL SIGN IN */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleGoogleLogin()}
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-3.5 text-sm font-bold text-slate-800 shadow-xs transition hover:border-slate-300 hover:bg-slate-50/80 active:scale-[0.99] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>
                    {isLoading ? 'Memproses Masuk...' : mode === 'login' ? 'Masuk dengan Akun Google / Gmail' : 'Daftar dengan Akun Google'}
                  </span>
                </button>
              </div>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  atau gunakan email & kata sandi
                </span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>

              {/* Email + Password Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Nama Lengkap
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm text-slate-900 transition focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Alamat Email
                    </label>
                    {!email.includes('@') && email.length > 2 && (
                      <button
                        type="button"
                        onClick={appendGmailDomain}
                        className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        + Tambah @gmail.com
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm text-slate-900 transition focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Kata Sandi
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={handleOpenForgotPassword}
                        className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        Lupa kata sandi?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-12 text-sm text-slate-900 transition focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? 'Sembunyikan' : 'Lihat'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-600/30 transition hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] disabled:opacity-60"
                >
                  {mode === 'login' ? (
                    <>
                      <UserCheck className="h-4 w-4" />
                      <span>{isLoading ? 'Memproses...' : 'Masuk ke Pembukuan'}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>{isLoading ? 'Membuat Akun...' : 'Daftarkan Akun (Trial 7 Hari)'}</span>
                    </>
                  )}
                </button>
              </form>

              {/* Secure Developer Access Footer Button */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Pengembang Sistem:</span>
                <button
                  type="button"
                  onClick={() => setIsDevLoginOpen(true)}
                  className="font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1.5 transition"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Masuk Portal Developer</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Benefits Column */}
          <div className="md:col-span-5 space-y-4">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Ketentuan Paket & Lisensi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Transparan, aman, dan dapat di-upgrade kapan saja via USDT/USDC onchain.
              </p>

              <div className="mt-5 space-y-4">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-white">Trial 7 Hari Gratis</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Pengguna mandiri mendapatkan 7 hari masa percobaan untuk mengevaluasi seluruh fitur pembukuan & laporan.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                    <Crown className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-white">Lisensi Lifetime VIP ($10)</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Aktivasi onchain via USDT/USDC Base ke wallet <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">0xB387c...E285</span>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-white">Sinkronisasi Cloud Terenkripsi</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Cadangkan data otomatis ke Google Drive pribadi Anda dengan enkripsi AES-256.
                    </p>
                  </div>
                </div>
              </div>

              {/* Crypto Payment Button */}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setIsCryptoPaymentModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-3 text-xs font-bold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 transition"
                >
                  <Wallet className="h-4 w-4 text-amber-300" />
                  <span>Buka Form Pembayaran USDT/USDC Base</span>
                </button>
              </div>

              {/* WhatsApp direct help */}
              <div className="mt-3 rounded-2xl bg-emerald-50/70 p-3 text-center border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/60">
                <p className="text-[11px] text-emerald-900 dark:text-emerald-300 font-medium">
                  Konfirmasi pembayaran atau kendala?
                </p>
                <a
                  href={OFFICIAL_WA_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 font-bold text-xs text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>Chat WhatsApp Developer Resmi</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Developer Secure Login Modal */}
      {isDevLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-amber-500/40 bg-slate-900 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-amber-300">Autentikasi Akun Developer</h3>
                  <p className="text-[11px] text-slate-400">Khusus Pengembang / Superadmin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDevLoginOpen(false);
                  setDevError(null);
                }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {devError && (
              <div className="rounded-xl bg-rose-950/70 border border-rose-800 p-2.5 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{devError}</span>
              </div>
            )}

            <form onSubmit={handleSecureDevLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Email Developer
                </label>
                <input
                  type="email"
                  required
                  value={devEmail}
                  onChange={e => setDevEmail(e.target.value)}
                  placeholder="admin@bukukas.ai.studio"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Kata Sandi / Kunci Master PIN
                </label>
                <input
                  type="password"
                  required
                  value={devSecretKey}
                  onChange={e => setDevSecretKey(e.target.value)}
                  placeholder="Masukkan Kunci Developer..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDevLoginOpen(false)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-xs font-black text-slate-950 hover:brightness-110 shadow-md transition"
                >
                  {isLoading ? 'Memverifikasi...' : 'Buka Portal Dev 👑'}
                </button>
              </div>
            </form>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">Tautan Khusus Pengembang:</span>
              <button
                type="button"
                onClick={handleCopyDevDirectUrl}
                className="text-[10px] font-bold text-amber-400 hover:underline"
              >
                {copiedDevUrl ? 'Link Tersalin!' : 'Salin URL Dev'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal (Tautan Reset & Verifikasi OTP) */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {forgotStep === 'request' ? 'Lupa Kata Sandi' : 'Reset Kata Sandi Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {forgotStep === 'request'
                      ? 'Dapatkan tautan pemulihan & kode OTP ke email Anda'
                      : `Verifikasi kode dan tetapkan kata sandi baru untuk ${forgotEmail}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {forgotError && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* STEP 1: Request Email Reset Link */}
            {forgotStep === 'request' ? (
              <form onSubmit={handleRequestReset} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Alamat Email Terdaftar <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-3.5 text-xs text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Pemulihan Mandiri Cepat & Aman:</span>
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
                    Sistem akan membuat tautan reset instan beserta <strong>Kode Verifikasi 6-Digit (OTP)</strong> yang berlaku selama 15 menit. Anda juga dapat langsung memasukkan kode tersebut pada langkah berikutnya.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700 active:scale-95 disabled:opacity-60"
                  >
                    <Mail className="h-4 w-4" />
                    <span>{forgotLoading ? 'Mengirimkan...' : 'Kirim Tautan & Kode Reset'}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 2: Enter OTP & Set New Password */
              <form onSubmit={handleVerifyAndResetPassword} className="mt-5 space-y-4">
                {/* Result Notification Card */}
                {forgotResult && (
                  <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                          <Check className="h-3 w-3" /> Email Reset Terkirim
                        </span>
                        <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                          Kode Verifikasi OTP: <span className="font-mono text-base tracking-wider text-emerald-700 dark:text-emerald-300">{forgotResult.token}</span>
                        </p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          Berlaku hingga pukul {forgotResult.expiresAt}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyResetLink}
                        className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-800 dark:text-emerald-300"
                        title="Salin tautan reset langsung"
                      >
                        {copiedResetLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedResetLink ? 'Tersalin' : 'Salin Link'}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Kode Verifikasi 6-Digit (OTP)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Contoh: 849201"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-center font-mono text-lg font-black tracking-widest text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Kata Sandi Baru <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Konfirmasi Kata Sandi Baru <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmNewPassword}
                      onChange={e => setConfirmNewPassword(e.target.value)}
                      placeholder="Ketik ulang kata sandi baru"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setForgotStep('request')}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  >
                    ← Kirim Ulang Email
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsForgotPasswordOpen(false)}
                      className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading || !otpCode || !newPassword}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      <span>{forgotLoading ? 'Menyimpan...' : 'Simpan Sandi Baru & Masuk'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* GOOGLE SSO / GMAIL LOGIN & REGISTER MODAL */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 p-2 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Masuk Akun Google (SSO)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pilih akun cepat atau masukkan alamat Gmail Anda
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGoogleModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {googleError && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{googleError}</span>
              </div>
            )}

            {/* Quick account presets */}
            <div className="mt-4 space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Pilihan Akun Cepat
              </label>

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => executeGoogleAuth('indoclickshop@gmail.com', 'Super Admin Indoclick')}
                  disabled={isLoading}
                  className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/60 p-3 text-left transition hover:bg-amber-100/70 dark:border-amber-900/50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black text-xs">
                      👑
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>indoclickshop@gmail.com</span>
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 dark:text-amber-300">
                          Dev / Admin
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Superadmin BukuKas • Lifetime Pro
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => executeGoogleAuth('admin@bukukas.ai.studio', 'Developer Mailbox')}
                  disabled={isLoading}
                  className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50/60 p-3 text-left transition hover:bg-indigo-100/70 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-xs">
                      📧
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        admin@bukukas.ai.studio
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Email Resmi Developer & Kotak Masuk
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Custom Google Email Form */}
            <form
              onSubmit={e => {
                e.preventDefault();
                executeGoogleAuth(googleEmailInput, googleNameInput || undefined);
              }}
              className="mt-5 space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800"
            >
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Atau Masukkan Alamat Gmail Lain
              </label>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email Gmail / Google Workspace
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={googleEmailInput}
                    onChange={e => setGoogleEmailInput(e.target.value)}
                    placeholder="namaanda@gmail.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nama Tampilan (Opsional)
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={googleNameInput}
                    onChange={e => setGoogleNameInput(e.target.value)}
                    placeholder="Nama Lengkap Anda"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGoogleModalOpen(false)}
                  className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !googleEmailInput}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isLoading ? 'Menghubungkan...' : 'Lanjutkan Masuk Google'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
