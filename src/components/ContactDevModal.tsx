import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  Mail,
  MessageSquare,
  Phone,
  Radio,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BusinessInboxMessage } from '../types';

export const ContactDevModal: React.FC = () => {
  const {
    isContactDevModalOpen,
    setIsContactDevModalOpen,
    sendBusinessMessage,
    simulateInboundEmail,
    currentUser,
    addNotification,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'form' | 'gmail' | 'simulator'>('form');

  // Form State
  const [senderName, setSenderName] = useState(currentUser?.name || '');
  const [senderEmail, setSenderEmail] = useState(currentUser?.email || '');
  const [senderPhone, setSenderPhone] = useState('');
  const [category, setCategory] = useState<BusinessInboxMessage['category']>('inquiry');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Simulator / Gmail State
  const [simEmail, setSimEmail] = useState(currentUser?.email?.includes('@gmail.com') ? currentUser.email : 'user.external@gmail.com');
  const [simName, setSimName] = useState(currentUser?.name || 'Pengguna Gmail Eksternal');
  const [simSubject, setSimSubject] = useState('Uji Coba Kirim Email dari Akun Gmail Eksternal');
  const [simMessage, setSimMessage] = useState(
    'Halo admin@bukukas.ai.studio, ini adalah email uji coba yang dikirimkan dari akun Gmail eksternal untuk memastikan sistem penerimaan email bisnis berjalan lancar.'
  );

  if (!isContactDevModalOpen) return null;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('admin@bukukas.ai.studio');
    setCopiedEmail(true);
    addNotification('success', 'Email Tersalin', 'admin@bukukas.ai.studio disalin ke papan klip.');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim() || !senderEmail.trim() || !subject.trim() || !message.trim()) {
      addNotification('error', 'Form Belum Lengkap', 'Silakan lengkapi nama, email, subjek, dan isi pesan Anda.');
      return;
    }

    setIsSubmitting(true);
    try {
      await sendBusinessMessage({
        senderName: senderName.trim(),
        senderEmail: senderEmail.trim(),
        senderPhone: senderPhone.trim() || undefined,
        category,
        subject: subject.trim(),
        message: message.trim(),
        source: 'in-app',
      });

      // Reset form & close
      setSubject('');
      setMessage('');
      setIsContactDevModalOpen(false);
    } catch {
      addNotification('error', 'Gagal Mengirim', 'Terjadi kendala saat mengirim pesan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await simulateInboundEmail({
        from: simEmail.trim(),
        senderName: simName.trim(),
        subject: simSubject.trim(),
        message: simMessage.trim(),
        category: 'inquiry',
      });
      setIsContactDevModalOpen(false);
    } catch {
      addNotification('error', 'Gagal', 'Terjadi kendala simulasi inbound email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGmailComposeUrl = () => {
    const sub = encodeURIComponent(subject || 'Pertanyaan Layanan BukuKas - Akun User');
    const body = encodeURIComponent(message || 'Halo Tim Developer BukuKas (admin@bukukas.ai.studio),\n\nSaya ingin berkonsultasi mengenai...');
    return `https://mail.google.com/mail/?view=cm&fs=1&to=admin@bukukas.ai.studio&su=${sub}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-7 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Hubungi Developer / Email Bisnis
                </h3>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  Aktif & Terhubung
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pesan akan langsung masuk ke Kotak Masuk Pengembang (<span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">admin@bukukas.ai.studio</span>)
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsContactDevModalOpen(false)}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Email Address Banner */}
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80 dark:bg-slate-950/60 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-[11px] font-bold text-slate-900 dark:text-white">Alamat Email Bisnis Developer:</p>
              <p className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">admin@bukukas.ai.studio</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyEmail}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {copiedEmail ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedEmail ? 'Tersalin' : 'Salin Email'}</span>
          </button>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="mt-4 flex gap-1.5 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
              activeTab === 'form'
                ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            ✉️ Formulir Langsung
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gmail')}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
              activeTab === 'gmail'
                ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            🔴 Buka Web Gmail
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
              activeTab === 'simulator'
                ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            ⚡ Uji Email Masuk
          </button>
        </div>

        {/* Tab 1: Direct In-App Form */}
        {activeTab === 'form' && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nama Pengirim <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap / Perusahaan"
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email Anda <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="email@anda.com"
                    value={senderEmail}
                    onChange={e => setSenderEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  No. WhatsApp / HP (Opsional)
                </label>
                <div className="relative">
                  <Phone className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="+62 812-xxxx-xxxx"
                    value={senderPhone}
                    onChange={e => setSenderPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Kategori Pesan
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="inquiry">Permintaan Lisensi Lifetime</option>
                  <option value="billing">Pertanyaan Pembayaran / Upgrade</option>
                  <option value="customization">Kustomisasi Khusus / Multi-User</option>
                  <option value="support">Dukungan Teknis & Fitur</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Subjek Pesan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Permintaan Aktivasi Lisensi Lifetime Akun"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Isi Pesan / Pertanyaan <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                placeholder="Tuliskan pesan, permohonan upgrade akun, atau kebutuhan kustomisasi Anda secara detail..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Quick presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-slate-400">Pintasan Pesan:</span>
              <button
                type="button"
                onClick={() => {
                  setSubject('Upgrade Akun ke Lisensi Lifetime');
                  setMessage('Halo Tim Pengembang, masa trial 7 hari saya sedang aktif. Saya ingin upgrade akun saya menjadi Lisensi Lifetime seumur hidup. Mohon petunjuk aktivasi.');
                  setCategory('inquiry');
                }}
                className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300"
              >
                👑 Request Lifetime
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubject('Perpanjangan Masa Uji Coba (Trial)');
                  setMessage('Halo Admin, apakah saya bisa mendapatkan perpanjangan masa trial untuk mengevaluasi fitur sinkronisasi dan kurs mata uang? Terima kasih.');
                  setCategory('support');
                }}
                className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300"
              >
                ⏱️ Perpanjang Trial
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsContactDevModalOpen(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSubmitting ? 'Mengirim...' : 'Kirim Pesan Sekarang'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: External Gmail Web Compose & Direct Mailto */}
        {activeTab === 'gmail' && (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-rose-200/80 bg-rose-50/50 p-4 dark:border-rose-900/60 dark:bg-rose-950/20">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-rose-100 p-2 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Kirim Langsung dari Akun Gmail Anda
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Anda dapat membuka web Gmail resmi untuk mengirim email langsung ke <strong className="font-mono text-indigo-600 dark:text-indigo-400">admin@bukukas.ai.studio</strong>. Pesan yang dikirim juga dapat disimulasikan ke server agar langsung terbaca di Kotak Masuk Pengembang.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <a
                href={getGmailComposeUrl()}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 font-bold dark:bg-rose-950">
                    M
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Buka Web Google Gmail (New Tab)</p>
                      <ArrowUpRight className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-500">Membuka jendela tulis pesan baru di mail.google.com</p>
                  </div>
                </div>
              </a>

              <a
                href={`mailto:admin@bukukas.ai.studio?subject=${encodeURIComponent(subject || 'Pertanyaan Layanan BukuKas')}`}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 font-bold dark:bg-indigo-950">
                    @
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Buka Aplikasi Email Default (Mailto)</p>
                      <ArrowUpRight className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-500">Membuka Thunderbird, Apple Mail, Outlook, dsb.</p>
                  </div>
                </div>
              </a>
            </div>
          </div>
        )}

        {/* Tab 3: Live Inbound Webhook Simulator */}
        {activeTab === 'simulator' && (
          <form onSubmit={handleSimulateInbound} className="mt-4 space-y-4">
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <div className="flex items-start gap-2.5">
                <Radio className="mt-0.5 h-4 w-4 text-emerald-600 shrink-0 dark:text-emerald-400" />
                <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                  <strong>Uji Real-Time Inbound Webhook:</strong> Mengirimkan muatan email dari alamat Gmail eksternal ke gateway server <code className="font-mono text-[11px] font-bold">/api/inbound-email</code>. Pesan akan langsung tersimpan dan dapat dilihat di Portal Pengembang.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email Gmail Pengirim Eksternal
                </label>
                <input
                  type="email"
                  required
                  value={simEmail}
                  onChange={e => setSimEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nama Pengirim
                </label>
                <input
                  type="text"
                  required
                  value={simName}
                  onChange={e => setSimName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Subjek Email
              </label>
              <input
                type="text"
                required
                value={simSubject}
                onChange={e => setSimSubject(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Isi Pesan Email Masuk
              </label>
              <textarea
                required
                rows={3}
                value={simMessage}
                onChange={e => setSimMessage(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsContactDevModalOpen(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{isSubmitting ? 'Mengirim Simulasi...' : 'Kirim & Masukkan ke admin@bukukas.ai.studio'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
