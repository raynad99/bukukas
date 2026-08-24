import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Lock,
  ShieldCheck,
  Smartphone,
  Unlock,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { verifyTOTPCode } from '../utils/crypto';

export const LockScreen: React.FC = () => {
  const { t, unlockApp, security, addNotification } = useApp();
  const [passphrase, setPassphrase] = useState('');
  const [totpInput, setTotpInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      // 1. Verify master passphrase
      const isPassValid = await unlockApp(passphrase);
      if (!isPassValid) {
        setErrorMsg('Kata sandi master salah! Silakan coba lagi.');
        setIsLoading(false);
        return;
      }

      // 2. If 2FA enabled, verify TOTP code
      if (security.isTwoFactorEnabled) {
        if (!totpInput || totpInput.trim().length !== 6) {
          setErrorMsg('Masukkan 6 digit kode 2FA (TOTP) yang valid.');
          setIsLoading(false);
          return;
        }

        const is2FAValid = await verifyTOTPCode(security.totpSecret, totpInput.trim());
        if (!is2FAValid) {
          setErrorMsg('Kode 2FA tidak valid atau sudah kedaluwarsa.');
          setIsLoading(false);
          return;
        }
      }

      addNotification('success', 'Aplikasi Terbuka', 'Selamat datang kembali!');
    } catch (err) {
      setErrorMsg('Gagal membuka kunci aplikasi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
            <Lock className="h-7 w-7 animate-pulse" />
          </div>

          <h2 className="mt-4 text-xl font-black tracking-tight text-white">
            BukuKas Pro
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {t('unlock_app_desc')}
          </p>
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-950/50 border border-rose-900/50 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleUnlock} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300">
              {t('enter_master_password')}
            </label>
            <div className="relative mt-1">
              <input
                type="password"
                required
                autoFocus
                placeholder="Kata sandi master..."
                value={passphrase}
                onChange={e => setPassphrase(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Kata sandi bawaan default:{' '}
              <strong className="font-mono text-emerald-400">Median1986</strong>
            </p>
          </div>

          {security.isTwoFactorEnabled && (
            <div>
              <label className="block text-xs font-semibold text-slate-300">
                {t('enter_2fa_code')} (6 Digit TOTP)
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="Contoh: 123456"
                value={totpInput}
                onChange={e => setTotpInput(e.target.value.replace(/\D/g, ''))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-center font-mono text-lg font-bold tracking-widest text-emerald-400 placeholder-slate-500 outline-hidden focus:border-emerald-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
          >
            <Unlock className="h-4 w-4" />
            <span>{isLoading ? 'Memverifikasi...' : t('unlock_button')}</span>
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Dilindungi Enkripsi Kriptografi AES-GCM 256-Bit</span>
        </div>
      </div>
    </div>
  );
};
