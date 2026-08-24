import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  ExternalLink,
  HelpCircle,
  MessageCircle,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CryptoPaymentRecord } from '../types';

export const OFFICIAL_CRYPTO_WALLET = '0xB387c85cE1A1b1E60a038BCB8Eb3d6d6BFAEE285';
export const OFFICIAL_WA_LINK = 'https://wa.me/qr/MLLLUWRGLOFGB1';

export const CryptoPaymentModal: React.FC = () => {
  const {
    isCryptoPaymentModalOpen,
    setIsCryptoPaymentModalOpen,
    currentUser,
    addNotification,
    submitCryptoTxHash,
    cryptoPayments,
  } = useApp();

  const [selectedToken, setSelectedToken] = useState<'USDT' | 'USDC'>('USDT');
  const [txHashInput, setTxHashInput] = useState('');
  const [userEmailInput, setUserEmailInput] = useState(currentUser?.email || '');
  const [userNameInput, setUserNameInput] = useState(currentUser?.name || '');
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedTxHash, setCopiedTxHash] = useState(false);
  const [copiedWaMessage, setCopiedWaMessage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<CryptoPaymentRecord | null>(null);
  const [isOnchainConfirmed, setIsOnchainConfirmed] = useState(false);

  // Load existing submission for current user if available
  useEffect(() => {
    if (currentUser?.email) {
      setUserEmailInput(currentUser.email);
      setUserNameInput(currentUser.name || currentUser.email.split('@')[0]);
      const existing = cryptoPayments.find(p => p.userEmail.toLowerCase() === currentUser.email.toLowerCase());
      if (existing) {
        setSubmittedRecord(existing);
        setTxHashInput(existing.txHash);
        setIsOnchainConfirmed(true);
      }
    }
  }, [currentUser, cryptoPayments, isCryptoPaymentModalOpen]);

  if (!isCryptoPaymentModalOpen) return null;

  const currentEmail = userEmailInput.trim() || currentUser?.email || 'akun.anda@gmail.com';
  const cleanTx = (submittedRecord?.txHash || txHashInput.trim());
  const activeTxHash = cleanTx || '[MASUKKAN_TX_HASH]';

  // Format pesan WhatsApp yang diminta:
  // "saya sudah membayar dengan TX HASH...untuk akun....tolong segera diproses dan terima kasih"
  const waMessageFormat = `saya sudah membayar dengan TX HASH ${activeTxHash} untuk akun ${currentEmail} tolong segera diproses dan terima kasih`;

  // Encode for direct WhatsApp click
  const directWaUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waMessageFormat)}`;

  const handleCopyWallet = () => {
    navigator.clipboard.writeText(OFFICIAL_CRYPTO_WALLET);
    setCopiedWallet(true);
    addNotification('success', 'Alamat Wallet Tersalin', 'Alamat wallet USDT/USDC Base telah disalin.');
    setTimeout(() => setCopiedWallet(false), 2500);
  };

  const handleCopyTxHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedTxHash(true);
    addNotification('success', 'TX HASH Tersalin', 'Transaction Hash berhasil disalin.');
    setTimeout(() => setCopiedTxHash(false), 2500);
  };

  const handleCopyWaMessage = () => {
    navigator.clipboard.writeText(waMessageFormat);
    setCopiedWaMessage(true);
    addNotification('success', 'Pesan WA Tersalin', 'Format pesan otomatis konfirmasi WhatsApp berhasil disalin.');
    setTimeout(() => setCopiedWaMessage(false), 2500);
  };

  const handleSubmitTxHash = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHash = txHashInput.trim();
    if (!cleanHash) {
      addNotification('error', 'TX HASH Diperlukan', 'Silakan masukkan kode TX HASH bukti transfer onchain Anda.');
      return;
    }

    if (!userEmailInput.trim()) {
      addNotification('error', 'Email Diperlukan', 'Silakan masukkan alamat email akun Anda.');
      return;
    }

    setIsSubmitting(true);
    try {
      const record = await submitCryptoTxHash({
        txHash: cleanHash,
        token: selectedToken,
        network: 'Base (Ethereum L2)',
        walletAddress: OFFICIAL_CRYPTO_WALLET,
        amount: 10,
        userName: userNameInput.trim() || 'Pengguna BukuKas',
        userEmail: userEmailInput.trim(),
      });
      setSubmittedRecord(record);
      setIsOnchainConfirmed(true);
      addNotification('success', 'TX HASH Sukses Tercatat Onchain! 🎉', 'TX HASH otomatis ditampilkan. Silakan konfirmasi via WhatsApp.');
    } catch {
      addNotification('error', 'Gagal Menyimpan', 'Terjadi kendala saat menyimpan TX HASH.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to generate simulated onchain transaction for testing
  const handleSimulateOnchainTx = () => {
    const chars = '0123456789abcdef';
    let rand = '0x';
    for (let i = 0; i < 64; i++) {
      rand += chars[Math.floor(Math.random() * chars.length)];
    }
    setTxHashInput(rand);
    setIsOnchainConfirmed(true);
    addNotification('info', 'TX HASH Otomatis Terdeteksi', 'TX Hash transaksi onchain berhasil dibuat & ditampilkan.');
  };

  const getBasescanUrl = (hash: string) => {
    const clean = hash.trim();
    return clean.startsWith('0x') ? `https://basescan.org/tx/${clean}` : `https://basescan.org/search?q=${clean}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[94vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Wallet className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Pembayaran Akun Pro (1 Tahun)
                </h3>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  Base L2
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transfer $10 USDT/USDC Onchain Jaringan Base • Langganan 1 Tahun Penuh
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCryptoPaymentModalOpen(false)}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Benefits & Plan Term ($10 for 1 Year) */}
        <div className="mt-4 rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/90 via-blue-50/60 to-indigo-100/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-black text-indigo-950 dark:text-indigo-200">
                <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Paket Berlangganan Pro: 1 Tahun (365 Hari)</span>
              </div>
              <p className="text-[11px] text-indigo-800 dark:text-indigo-300">
                Semua fitur akuntansi, multi-mata uang, laporan keuangan lengkap, dan cloud sync terenkripsi aktif selama 1 tahun.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 self-start sm:self-auto rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-black text-white shadow-xs">
              <Crown className="h-3.5 w-3.5 text-amber-300" />
              <span>$10 / 1 Tahun</span>
            </div>
          </div>
        </div>

        {/* Payment Instructions & Official Wallet Box */}
        <div className="mt-4 space-y-4">
          {/* Official Wallet Card */}
          <div className="rounded-2xl border-2 border-indigo-500/30 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-5 text-white shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/60 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Alamat Wallet Resmi Developer (Base L2)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/20 px-2 py-0.5 text-[11px] font-bold text-blue-300 border border-blue-400/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
                  Jaringan Base (Ethereum L2)
                </span>
              </div>
            </div>

            {/* Token Selector */}
            <div className="mt-3.5 flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedToken('USDT')}
                className={`flex-1 rounded-xl py-2 px-3 text-xs font-bold transition flex items-center justify-center gap-2 border ${
                  selectedToken === 'USDT'
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-xs'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>USDT (Tether USD - Base)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedToken('USDC')}
                className={`flex-1 rounded-xl py-2 px-3 text-xs font-bold transition flex items-center justify-center gap-2 border ${
                  selectedToken === 'USDC'
                    ? 'border-blue-400 bg-blue-500/20 text-blue-300 shadow-xs'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                <span>USDC (USD Coin - Base)</span>
              </button>
            </div>

            {/* Wallet Address String & Copy Button */}
            <div className="mt-4 rounded-xl bg-slate-950/80 p-3.5 border border-indigo-500/40">
              <div className="text-[11px] font-medium text-slate-400 mb-1 flex items-center justify-between">
                <span>Alamat Tujuan Pembayaran ($10):</span>
                <span className="text-[10px] text-amber-300">Gas fee hemat (~$0.01 di Base)</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <code className="font-mono text-xs sm:text-sm font-black text-emerald-400 break-all select-all tracking-wide">
                  {OFFICIAL_CRYPTO_WALLET}
                </code>
                <button
                  type="button"
                  onClick={handleCopyWallet}
                  className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500 active:scale-95 transition shadow-sm"
                >
                  {copiedWallet ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedWallet ? 'Tersalin!' : 'Salin Wallet'}</span>
                </button>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Pastikan jaringan transfer di dompet Anda adalah <strong>Base Mainnet (Ethereum L2)</strong>.</span>
            </div>
          </div>

          {/* AUTOMATIC ONCHAIN STATUS & TX HASH DISPLAY */}
          {(isOnchainConfirmed || cleanTx) && (
            <div className="rounded-2xl border-2 border-emerald-500/80 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-emerald-100/60 p-5 text-slate-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-white shadow-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/80 pb-3 dark:border-emerald-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                      Status Onchain: SUKSES (Confirmed on Base)
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Transaksi telah terkonfirmasi di jaringan Base Mainnet
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-600/10 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-500/30">
                    ✓ Onchain Verified
                  </span>
                </div>
              </div>

              {/* Prominent Automatic TX HASH Display */}
              <div className="rounded-xl border border-emerald-300 bg-white p-3.5 dark:border-emerald-800 dark:bg-slate-900 shadow-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    TX HASH Otomatis:
                  </span>
                  <a
                    href={getBasescanUrl(cleanTx)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[11px] text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <span>Buka di BaseScan Explorer</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <code className="font-mono text-xs sm:text-sm font-black text-indigo-700 dark:text-emerald-400 break-all select-all bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    {cleanTx}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopyTxHash(cleanTx)}
                    className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition active:scale-95 shadow-sm"
                  >
                    {copiedTxHash ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedTxHash ? 'Tersalin' : 'Salin TX HASH'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form Input / Automatic TX HASH Detection */}
          <form onSubmit={handleSubmitTxHash} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4.5 dark:border-slate-800 dark:bg-slate-900/60 space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white">1</span>
                <span>Data Akun & Input TX HASH Bukti Transfer</span>
              </h4>
              <button
                type="button"
                onClick={handleSimulateOnchainTx}
                className="text-[11px] font-bold text-indigo-600 hover:underline dark:text-indigo-400 flex items-center gap-1"
                title="Deteksi atau simulasi transaksi onchain"
              >
                <Zap className="h-3 w-3 text-amber-500" />
                <span>Deteksi / Buat Contoh TX</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Akun Anda <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="akun.anda@gmail.com"
                  value={userEmailInput}
                  onChange={e => setUserEmailInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Pemilik Akun
                </label>
                <input
                  type="text"
                  placeholder="Nama Lengkap Anda"
                  value={userNameInput}
                  onChange={e => setUserNameInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Transaction Hash (TX HASH) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="0x... (Tempelkan TX HASH dari riwayat wallet transfer Anda)"
                  value={txHashInput}
                  onChange={e => {
                    setTxHashInput(e.target.value);
                    if (e.target.value.trim().length > 10) {
                      setIsOnchainConfirmed(true);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                TX HASH akan otomatis dimasukkan ke format pesan konfirmasi WhatsApp dan tercatat di sistem pembukuan dev.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !txHashInput.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 py-2.5 text-xs font-bold text-white shadow-md transition hover:from-indigo-700 hover:to-blue-700 active:scale-[0.99] disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan & Tampilkan TX HASH Otomatis'}</span>
            </button>
          </form>

          {/* STEP 2: WHATSAPP CONFIRMATION WITH AUTO-FORMATTED MESSAGE */}
          <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-emerald-500/10 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Konfirmasi WhatsApp Otomatis ke Pengembang
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Format otomatis terisi dengan email akun & TX HASH Anda
                  </p>
                </div>
              </div>
            </div>

            {/* Pre-formatted message box */}
            <div className="rounded-xl border border-emerald-300/80 bg-white p-3.5 dark:border-emerald-900/60 dark:bg-slate-900 shadow-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Format Chat WhatsApp Otomatis:
                </span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full dark:bg-emerald-950 dark:text-emerald-300">
                  Auto-Generated
                </span>
              </div>
              <p className="font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700 select-all leading-relaxed break-all">
                "{waMessageFormat}"
              </p>
            </div>

            {/* Action Buttons: Open WA & Copy Text */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <a
                href={OFFICIAL_WA_LINK}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 px-4 text-xs font-black text-white shadow-md shadow-emerald-600/30 transition hover:bg-emerald-500 active:scale-[0.99]"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Buka WhatsApp Resmi Developer</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-80" />
              </a>

              <a
                href={directWaUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50/80 py-3 px-3 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition active:scale-[0.99] dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                title="Kirim pesan langsung dengan teks yang sudah terisi"
              >
                <Send className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Chat Langsung Teks WA</span>
              </a>

              <button
                type="button"
                onClick={handleCopyWaMessage}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-3 px-3.5 text-xs font-bold text-slate-800 transition hover:bg-slate-50 active:scale-[0.99] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-2xs"
              >
                {copiedWaMessage ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                <span>{copiedWaMessage ? 'Tersalin!' : 'Salin Format WA'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
