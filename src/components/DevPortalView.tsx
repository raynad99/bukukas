import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  ExternalLink,
  Filter,
  Inbox,
  KeyRound,
  LogOut,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
  Zap,
  Eye,
  EyeOff,
  Edit2,
  Lock,
  Gift,
  Link2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BusinessInboxMessage, SubscriptionPlan, UserProfile, UserRole } from '../types';
import { calculateTrialStatus } from '../utils/trialHelper';
import ReferralDashboard from "./ReferralDashboard";
import SellerApplicationsTab from "./SellerApplicationsTab";

export const DevPortalView: React.FC = () => {
  const {
    currentUser,
    allRegisteredAccounts,
    addNewLifetimeAccountByDev,
    updateAccountPlanByDev,
    updateAccountByDev,
    deleteAccountByDev,
    resetUserTrialByDev,
    switchAccount,
    businessMessages,
    markBusinessMessageRead,
    replyBusinessMessage,
    deleteBusinessMessage,
    sendBusinessMessage,
    syncBusinessMessagesWithServer,
    simulateInboundEmail,
    setActiveView,
    addNotification,
    cryptoPayments,
    verifyCryptoPaymentByDev,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'crypto' | 'mailbox' | 'referral' | 'sellers'>('overview');
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);
  const [userFilter, setUserFilter] = useState<'all' | 'trial' | 'expired' | 'lifetime' | 'paid' | 'self'>('all');
  const [userSearch, setUserSearch] = useState('');
  const [isSyncingMail, setIsSyncingMail] = useState(false);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);

  // Add Lifetime User Modal state
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('Median1986');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');
  const [newUserPlan, setNewUserPlan] = useState<SubscriptionPlan>('lifetime');
  const [newUserNotes, setNewUserNotes] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Edit User Modal state
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('user');
  const [editUserPlan, setEditUserPlan] = useState<SubscriptionPlan>('lifetime');
  const [editUserNotes, setEditUserNotes] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Copy password indicator state
  const [copiedPassUserId, setCopiedPassUserId] = useState<string | null>(null);

  // Mailbox state
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    businessMessages.length > 0 ? businessMessages[0].id : null
  );
  const [mailFilter, setMailFilter] = useState<'all' | 'unread' | 'replied' | 'inquiry'>('all');
  const [mailSearch, setMailSearch] = useState('');
  const [replyText, setReplyText] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(false);

  const selectedMessage = businessMessages.find(m => m.id === selectedMessageId);
  const unreadCount = businessMessages.filter(m => !m.isRead).length;
  const pendingCryptoCount = cryptoPayments.filter(p => p.status === 'pending').length;

  // Fetch system health on mount and when overview tab is active
  useEffect(() => {
    const fetchHealth = async () => {
      setIsHealthLoading(true);
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setSystemHealth(data);
        }
      } catch { /* ignore */ }
      setIsHealthLoading(false);
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('admin@bukukas.ai.studio');
    setCopiedEmail(true);
    addNotification('success', 'Email Tersalin', 'admin@bukukas.ai.studio berhasil disalin.');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyPassword = (userId: string, pass: string) => {
    navigator.clipboard.writeText(pass);
    setCopiedPassUserId(userId);
    addNotification('success', 'Kata Sandi Tersalin 🔑', `Kata sandi (${pass}) berhasil disalin.`);
    setTimeout(() => setCopiedPassUserId(null), 2000);
  };

  const handleOpenEditUser = (user: UserProfile) => {
    setEditingUserId(user.id);
    setEditUserName(user.name);
    setEditUserEmail(user.email);
    setEditUserPassword(user.password || 'Median1986');
    setEditUserRole(user.role || 'user');
    setEditUserPlan(user.plan || 'lifetime');
    setEditUserNotes(user.customNotes || '');
    setShowEditPassword(false);
    setIsEditUserModalOpen(true);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;

    updateAccountByDev(editingUserId, {
      name: editUserName.trim(),
      email: editUserEmail.trim(),
      password: editUserPassword.trim() || 'Median1986',
      role: editUserRole,
      plan: editUserPlan,
      customNotes: editUserNotes.trim(),
    });

    setIsEditUserModalOpen(false);
  };

  const handleGenerateRandomPassword = (target: 'new' | 'edit') => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (target === 'new') {
      setNewUserPassword(pass);
    } else {
      setEditUserPassword(pass);
    }
    addNotification('info', 'Sandi Acak Dibuat', `Kata sandi otomatis: ${pass}`);
  };

  // Filtered Users
  const filteredUsers = allRegisteredAccounts.filter(u => {
    // Search match
    const searchMatch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.customNotes && u.customNotes.toLowerCase().includes(userSearch.toLowerCase()));

    if (!searchMatch) return false;

    const status = calculateTrialStatus(u);

    if (userFilter === 'trial') return status.isTrial && !status.isExpired;
    if (userFilter === 'expired') return status.isExpired;
    if (userFilter === 'lifetime') return status.isLifetime;
    if (userFilter === 'paid') return status.isPaid;
    if (userFilter === 'self') return u.registeredSelf;
    return true;
  });

  // Filtered Messages
  const filteredMessages = businessMessages.filter(m => {
    const searchMatch =
      m.senderName.toLowerCase().includes(mailSearch.toLowerCase()) ||
      m.senderEmail.toLowerCase().includes(mailSearch.toLowerCase()) ||
      m.subject.toLowerCase().includes(mailSearch.toLowerCase()) ||
      m.message.toLowerCase().includes(mailSearch.toLowerCase());

    if (!searchMatch) return false;

    if (mailFilter === 'unread') return !m.isRead;
    if (mailFilter === 'replied') return !!m.reply;
    if (mailFilter === 'inquiry') return m.category === 'inquiry';
    return true;
  });

  // Handle Add Lifetime User
  const handleAddLifetimeUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      addNotification('error', 'Form Belum Lengkap', 'Nama dan Email wajib diisi.');
      return;
    }

    addNewLifetimeAccountByDev({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      password: newUserPassword.trim() || 'Median1986',
      role: newUserRole,
      plan: newUserPlan,
      customNotes: newUserNotes.trim() || `Akun ${newUserPlan.toUpperCase()} ditambahkan oleh Pengembang`,
    });

    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('Median1986');
    setNewUserRole('user');
    setNewUserPlan('lifetime');
    setNewUserNotes('');
    setIsAddUserModalOpen(false);
  };

  // Handle Reply Message
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage || !replyText.trim()) return;

    replyBusinessMessage(selectedMessage.id, replyText.trim());
    setReplyText('');
  };

  // Metrics summary
  const totalUsersCount = allRegisteredAccounts.length;
  const selfRegisteredCount = allRegisteredAccounts.filter(u => u.registeredSelf).length;
  const trialActiveCount = allRegisteredAccounts.filter(u => {
    const s = calculateTrialStatus(u);
    return s.isTrial && !s.isExpired;
  }).length;
  const trialExpiredCount = allRegisteredAccounts.filter(u => calculateTrialStatus(u).isExpired).length;
  const lifetimeVipCount = allRegisteredAccounts.filter(u => calculateTrialStatus(u).isLifetime).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-24 md:pb-12">
      {/* Dev Header Banner */}
      <div className="rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl sm:p-8 dark:border-slate-800">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-extrabold text-amber-300 border border-amber-500/30 backdrop-blur-md">
                <Crown className="h-3.5 w-3.5" />
                <span>SUPERADMIN CONSOLE</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                <Mail className="h-3.5 w-3.5" />
                <span>Inbox Bisnis: admin@bukukas.ai.studio</span>
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Panel Pengembang (Developer Portal)
            </h1>

            <p className="text-xs text-slate-300 max-w-2xl sm:text-sm">
              Kelola seluruh pengguna mandiri, tambahkan lisensi <strong className="text-amber-300">Lifetime seumur hidup</strong>, atur masa trial 7 hari, dan akses pusat pesan email bisnis <span className="font-mono text-emerald-400">admin@bukukas.ai.studio</span> langsung di dalam aplikasi.
            </p>
          </div>

          {/* Quick Dev Action & Domain Status */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="rounded-2xl bg-white/10 p-3.5 border border-white/10 backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold text-slate-300">Email Bisnis Resmi</p>
                  <p className="text-xs font-mono font-bold text-emerald-300">admin@bukukas.ai.studio</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="rounded-lg bg-white/10 p-2 text-slate-200 hover:bg-white/20"
                  title="Salin Email"
                >
                  {copiedEmail ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={() => setIsAddUserModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Tambah Akun Lifetime</span>
            </button>
          </div>
        </div>

        {/* Quick Navigation Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'overview'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Zap className="h-4 w-4 text-emerald-400" />
            <span>System Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'users'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Manajemen Akun & Lisensi ({totalUsersCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('crypto')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition relative ${
              activeTab === 'crypto'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Wallet className="h-4 w-4 text-amber-400" />
            <span>Verifikasi USDT/USDC Base</span>
            {pendingCryptoCount > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-slate-950">
                {pendingCryptoCount} Menunggu
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('mailbox')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition relative ${
              activeTab === 'mailbox'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Inbox className="h-4 w-4" />
            <span>Kotak Masuk Email Bisnis</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
                {unreadCount} Baru
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('referral')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'referral'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Gift className="h-4 w-4 text-amber-400" />
            <span>Referral & Undangan</span>
          </button>
        </div>
      </div>
          <button
            onClick={() => setActiveTab('sellers')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'sellers'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4 text-emerald-400" />
            <span>Pengajuan Seller</span>
          </button>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Akun</span>
            <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{totalUsersCount}</p>
          <p className="text-[10px] text-slate-500">{selfRegisteredCount} register mandiri</p>
        </div>

        <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-4 shadow-xs dark:border-indigo-900/40 dark:bg-slate-900">
          <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Trial 7 Hari Aktif</span>
            <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-indigo-900 dark:text-indigo-200">{trialActiveCount}</p>
          <p className="text-[10px] text-indigo-700/80 dark:text-indigo-400">Masa percobaan berjalan</p>
        </div>

        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-4 shadow-xs dark:border-rose-900/40 dark:bg-slate-900">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Trial Habis</span>
            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-900 dark:text-rose-200">{trialExpiredCount}</p>
          <p className="text-[10px] text-rose-700/80 dark:text-rose-400">Perlu upgrade lisensi</p>
        </div>

        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-xs dark:border-amber-900/40 dark:bg-slate-900">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Lifetime VIP</span>
            <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-900 dark:text-amber-200">{lifetimeVipCount}</p>
          <p className="text-[10px] text-amber-700/80 dark:text-amber-400">Akses tanpa batas</p>
        </div>

        <div className="col-span-2 sm:col-span-4 lg:col-span-1 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-xs dark:border-emerald-900/40 dark:bg-slate-900">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pesan Masuk</span>
            <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-900 dark:text-emerald-200">{businessMessages.length}</p>
          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400">{unreadCount} belum dibaca</p>
        </div>
      </div>

      {/* TAB 0: SYSTEM OVERVIEW / cPANEL */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* System Health Status */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">System Health Monitor</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Status server, database, dan layanan integrasi</p>
                </div>
              </div>
              <button
                onClick={async () => { setIsHealthLoading(true); try { const r = await fetch('/api/health'); if (r.ok) setSystemHealth(await r.json()); } catch {} setIsHealthLoading(false); }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isHealthLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Server Status */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${systemHealth?.status === 'ok' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Server Status</span>
                </div>
                <p className="mt-2 text-lg font-black text-emerald-900 dark:text-emerald-200">{systemHealth?.status === 'ok' ? 'ONLINE' : 'OFFLINE'}</p>
                <p className="text-[10px] text-emerald-700/70 dark:text-emerald-400">Express.js v0.0.0.0:3000</p>
              </div>

              {/* Database Status */}
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${systemHealth?.database === 'neon-postgres' ? 'bg-indigo-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">Database</span>
                </div>
                <p className="mt-2 text-lg font-black text-indigo-900 dark:text-indigo-200">{systemHealth?.database === 'neon-postgres' ? 'Neon Postgres' : 'JSON File'}</p>
                <p className="text-[10px] text-indigo-700/70 dark:text-indigo-400">Serverless PostgreSQL</p>
              </div>

              {/* Email Service */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${systemHealth?.emailConfigured ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span className="text-xs font-bold text-rose-800 dark:text-rose-300">Email (Resend)</span>
                </div>
                <p className="mt-2 text-lg font-black text-rose-900 dark:text-rose-200">{systemHealth?.emailConfigured ? 'ACTIVE' : 'INACTIVE'}</p>
                <p className="text-[10px] text-rose-700/70 dark:text-rose-400">onboarding@resend.dev</p>
              </div>

              {/* AI Engine */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${systemHealth?.alphaKeyConfigured ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300">AI (0x Alpha)</span>
                </div>
                <p className="mt-2 text-lg font-black text-amber-900 dark:text-amber-200">{systemHealth?.alphaKeyConfigured ? 'ACTIVE' : 'FALLBACK'}</p>
                <p className="text-[10px] text-amber-700/70 dark:text-amber-400">OpenRouter Model</p>
              </div>
            </div>

            {/* Capabilities & Info */}
            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">Server Capabilities</h4>
              <div className="flex flex-wrap gap-2">
                {(systemHealth?.capabilities || []).map((cap: string) => (
                  <span key={cap} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <Check className="h-3 w-3" />
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <button
                onClick={() => setActiveTab('users')}
                className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-center transition hover:border-indigo-200 hover:bg-indigo-50/30 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:border-indigo-900"
              >
                <UserPlus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Tambah Akun</span>
              </button>
              <button
                onClick={() => setActiveTab('mailbox')}
                className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-center transition hover:border-emerald-200 hover:bg-emerald-50/30 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:border-emerald-900"
              >
                <Mail className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Kotak Masuk ({unreadCount} baru)</span>
              </button>
              <button
                onClick={() => setActiveTab('crypto')}
                className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-center transition hover:border-amber-200 hover:bg-amber-50/30 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:border-amber-900"
              >
                <Wallet className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Crypto ({pendingCryptoCount})</span>
              </button>
              <button
                onClick={() => { window.open('https://console.cloud.google.com/apis/credentials', '_blank'); }}
                className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-center transition hover:border-rose-200 hover:bg-rose-50/30 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:border-rose-900"
              >
                <KeyRound className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Google Cloud Console</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: USERS & LICENSE MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 flex items-center gap-1 text-xs font-bold text-slate-400">
                <Filter className="h-3.5 w-3.5" />
                <span>Filter:</span>
              </span>

              {[
                { id: 'all', label: 'Semua Akun' },
                { id: 'self', label: '🌐 Register Mandiri' },
                { id: 'trial', label: '⏳ Trial Aktif' },
                { id: 'expired', label: '⚠️ Trial Expired' },
                { id: 'lifetime', label: '👑 Lifetime VIP' },
                { id: 'paid', label: '💳 Berbayar' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setUserFilter(tab.id as any)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    userFilter === tab.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama, email, catatan..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* User List Table / Cards */}
          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider dark:border-slate-800 dark:bg-slate-950/40">
              Daftar Seluruh Akun Pengguna Terdaftar ({filteredUsers.length})
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center">
                  <User className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">Tidak ada akun ditemukan</p>
                  <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau filter lisensi.</p>
                </div>
              ) : (
                filteredUsers.map(user => {
                  const status = calculateTrialStatus(user);
                  const isCurrent = currentUser?.id === user.id;

                  return (
                    <div
                      key={user.id}
                      className={`flex flex-col gap-4 p-4 sm:p-5 transition hover:bg-slate-50/80 lg:flex-row lg:items-center lg:justify-between dark:hover:bg-slate-800/40 ${
                        isCurrent ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      {/* User Info */}
                      <div className="flex items-start gap-3.5">
                        <img
                          src={
                            user.photoUrl ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`
                          }
                          alt={user.name}
                          className="h-11 w-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{user.name}</h4>
                            {isCurrent && (
                              <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                Sesi Anda Saat Ini
                              </span>
                            )}
                            {user.role === 'admin' && (
                              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                Developer
                              </span>
                            )}
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                user.registeredSelf
                                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                                  : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              }`}
                            >
                              {user.registeredSelf ? '🌐 Register Mandiri' : '👑 Dibuat Dev'}
                            </span>
                            {user.referredBy && (
                              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                🔗 Referral: {user.referredBy}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{user.email}</p>

                          {user.customNotes && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-1">
                              💬 {user.customNotes}
                            </p>
                          )}

                          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                            <span>Daftar: {user.createdAt || '-'}</span>
                            <span>•</span>
                            <span>Login: {user.lastLoginAt || '-'}</span>
                          </div>

                          {/* Account Password & Copy Bar for Developer */}
                          <div className="mt-2.5 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              <Lock className="h-3 w-3 text-slate-400" />
                              <span>Sandi: {user.password || 'Median1986'}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyPassword(user.id, user.password || 'Median1986')}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              title="Salin kata sandi akun ini"
                            >
                              {copiedPassUserId === user.id ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-500" />
                                  <span className="text-emerald-600 dark:text-emerald-400">Tersalin!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3 text-slate-400" />
                                  <span>Salin</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* License Status & Action Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
                        {/* Status Badge */}
                        <div className="flex flex-col items-start lg:items-end">
                          <span className={`rounded-xl px-3 py-1 text-xs font-bold ${status.badgeClass}`}>
                            {status.badgeLabel}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1">
                            {status.isLifetime
                              ? 'Akses Seumur Hidup'
                              : status.isExpired
                              ? `Expired (${status.formattedExpiry})`
                              : `Hingga ${status.formattedExpiry}`}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Edit User Account Details */}
                          <button
                            onClick={() => handleOpenEditUser(user)}
                            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                            title="Edit akun / ganti kata sandi"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-indigo-500" />
                            <span>Edit Sandi</span>
                          </button>

                          {/* Upgrade to Lifetime Button */}
                          {!status.isLifetime && (
                            <button
                              onClick={() => updateAccountPlanByDev(user.id, 'lifetime')}
                              className="flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-xs hover:bg-amber-400 active:scale-95 transition"
                              title="Jadikan Akun Lifetime Seumur Hidup"
                            >
                              <Crown className="h-3.5 w-3.5" />
                              <span>Jadikan Lifetime</span>
                            </button>
                          )}

                          {/* Set Paid Button */}
                          {user.plan !== 'paid' && !status.isLifetime && (
                            <button
                              onClick={() => updateAccountPlanByDev(user.id, 'paid')}
                              className="flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 active:scale-95 transition"
                              title="Aktifkan Status Berbayar Pro"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Set Paid</span>
                            </button>
                          )}

                          {/* Extend / Reset Trial Button */}
                          {user.plan === 'trial' && (
                            <button
                              onClick={() => resetUserTrialByDev(user.id)}
                              className="flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                              title="Reset / Beri +7 Hari Trial"
                            >
                              <Clock className="h-3.5 w-3.5" />
                              <span>+7 Hari</span>
                            </button>
                          )}

                          {/* Switch Account */}
                          {!isCurrent && (
                            <button
                              onClick={() => switchAccount(user.id)}
                              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                              title="Uji coba masuk sebagai pengguna ini"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>Masuk</span>
                            </button>
                          )}

                          {/* Delete */}
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => {
                                if (confirm(`Hapus akun ${user.name} (${user.email})?`)) {
                                  deleteAccountByDev(user.id);
                                }
                              }}
                              className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-400"
                              title="Hapus Akun"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CRYPTO PAYMENTS & ONCHAIN TX HASH VERIFICATION */}
      {activeTab === 'crypto' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-300">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Verifikasi Pembayaran USDT / USDC Jaringan ETH Base
                  </h4>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    Base L2
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Wallet Developer: <code className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-300">0xB387c85cE1A1b1E60a038BCB8Eb3d6d6BFAEE285</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('0xB387c85cE1A1b1E60a038BCB8Eb3d6d6BFAEE285');
                  addNotification('success', 'Wallet Disalin', 'Alamat wallet 0xB387...E285 disalin.');
                }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Salin Wallet Dev</span>
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider dark:border-slate-800 dark:bg-slate-950/40">
              Daftar Bukti TX HASH Onchain Masuk ({cryptoPayments.length})
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {cryptoPayments.length === 0 ? (
                <div className="p-12 text-center">
                  <Wallet className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Transaksi Onchain</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Ketika pengguna mentransfer USDT/USDC ke wallet Anda dan mengirim TX HASH, daftarnya akan muncul di sini.
                  </p>
                </div>
              ) : (
                cryptoPayments.map(payment => (
                  <div key={payment.id} className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {payment.userName}
                        </span>
                        <span className="font-mono text-xs text-slate-500">({payment.userEmail})</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                            payment.status === 'verified'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : payment.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                          }`}
                        >
                          {payment.status === 'verified' ? '✓ Disetujui (VIP Aktif)' : payment.status === 'rejected' ? '✗ Ditolak' : '⏳ Menunggu Verifikasi Dev'}
                        </span>
                        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {payment.token} ({payment.network}) • ${payment.amount}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-xs font-semibold text-slate-500">TX HASH:</span>
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 break-all">
                          {payment.txHash}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(payment.txHash);
                            addNotification('success', 'TX Hash Tersalin', 'TX Hash berhasil disalin ke papan klip.');
                          }}
                          className="rounded p-1 text-slate-400 hover:text-indigo-600"
                          title="Salin TX Hash"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <a
                          href={`https://basescan.org/tx/${payment.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          <span>Cek BaseScan</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      {payment.whatsappMessage && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl mt-1 border border-slate-100 dark:border-slate-800">
                          "{payment.whatsappMessage}"
                        </p>
                      )}

                      <p className="text-[10px] text-slate-400">
                        Diajukan: {new Date(payment.submittedAt || payment.createdAt || Date.now()).toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {payment.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => verifyCryptoPaymentByDev(payment.id, true)}
                            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-black text-white shadow-md hover:brightness-110 active:scale-95 transition"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Setujui & Aktifkan Pro 1 Tahun 💳</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => verifyCryptoPaymentByDev(payment.id, false)}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                          >
                            Tolak
                          </button>
                        </>
                      )}
                      {payment.status === 'verified' && (
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Akun Telah Di-upgrade</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: IN-APP BUSINESS MAILBOX (admin@bukukas.ai.studio) */}
      {activeTab === 'mailbox' && (
        <div className="space-y-4">
          {/* Server Gateway Status & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-300">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Gateway Email Bisnis: <span className="font-mono text-indigo-600 dark:text-indigo-400">admin@bukukas.ai.studio</span>
                  </h4>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online & Siap Terima
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Menerima email inbound dari Gmail eksternal via webhook <code className="font-mono text-[10px] font-bold">/api/inbound-email</code> & pesan in-app.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  setIsSyncingMail(true);
                  await syncBusinessMessagesWithServer();
                  setIsSyncingMail(false);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncingMail ? 'animate-spin text-indigo-600' : ''}`} />
                <span>{isSyncingMail ? 'Sinkron...' : 'Sync Server'}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await simulateInboundEmail({
                    from: 'client.gmail@gmail.com',
                    senderName: 'Uji Coba Pengguna Gmail',
                    subject: 'Halo Dev BukuKas - Uji Pengiriman Email Eksternal',
                    message: 'Halo Admin! Ini adalah email uji coba langsung dari klien Gmail eksternal untuk memverifikasi fungsionalitas email bisnis admin@bukukas.ai.studio.',
                    category: 'inquiry',
                  });
                }}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 active:scale-95 transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Simulasi Email Gmail</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column: Messages List */}
            <div className="lg:col-span-5 space-y-3">
              {/* Mail Filters */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'all', label: 'Semua' },
                    { id: 'unread', label: `Belum Dibaca (${unreadCount})` },
                    { id: 'replied', label: 'Dibalas' },
                    { id: 'inquiry', label: 'Lifetime' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setMailFilter(f.id as any)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                        mailFilter === f.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Cards */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredMessages.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                    <Mail className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-400">Tidak ada pesan</p>
                  </div>
                ) : (
                  filteredMessages.map(msg => {
                    const isSelected = selectedMessageId === msg.id;

                    return (
                      <div
                        key={msg.id}
                        onClick={() => {
                          setSelectedMessageId(msg.id);
                          if (!msg.isRead) markBusinessMessageRead(msg.id);
                        }}
                        className={`cursor-pointer rounded-2xl border p-4 transition ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/40 dark:border-indigo-500 dark:bg-indigo-950/30'
                            : msg.isRead
                            ? 'border-slate-200/80 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-850'
                            : 'border-indigo-300 bg-indigo-50/80 shadow-xs hover:bg-indigo-100/50 dark:border-indigo-800 dark:bg-indigo-950/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {!msg.isRead && (
                              <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                            )}
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                              {msg.senderName}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(msg.sentAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>

                        <p className="mt-1 text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {msg.subject}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                          {msg.message}
                        </p>

                        <div className="mt-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {msg.category === 'inquiry'
                                ? '👑 Permintaan Lifetime'
                                : msg.category === 'billing'
                                ? '💳 Pembayaran'
                                : msg.category === 'customization'
                                ? '⚙️ Kustomisasi'
                                : '🛠️ Dukungan'}
                            </span>
                            {msg.source === 'inbound-webhook' && (
                              <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                🌐 Gmail Inbound
                              </span>
                            )}
                          </div>

                          {msg.reply && (
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Dibalas</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Message Detail & Reply Box */}
            <div className="lg:col-span-7">
            {selectedMessage ? (
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
                {/* Message Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {selectedMessage.category.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(selectedMessage.sentAt).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <h3 className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                      {selectedMessage.subject}
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-bold text-slate-900 dark:text-white">{selectedMessage.senderName}</span>
                      <span>•</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">{selectedMessage.senderEmail}</span>
                      {selectedMessage.senderPhone && (
                        <>
                          <span>•</span>
                          <span>{selectedMessage.senderPhone}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Grant Lifetime button directly from message */}
                    <button
                      onClick={() => {
                        const target = allRegisteredAccounts.find(
                          u => u.email.toLowerCase() === selectedMessage.senderEmail.toLowerCase()
                        );
                        if (target) {
                          updateAccountPlanByDev(target.id, 'lifetime');
                        } else {
                          addNewLifetimeAccountByDev({
                            name: selectedMessage.senderName,
                            email: selectedMessage.senderEmail,
                            customNotes: `Diaktivasi Lifetime dari permohonan pesan: ${selectedMessage.subject}`,
                          });
                        }
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 active:scale-95 transition"
                      title="Aktifkan Lisensi Lifetime untuk pengirim pesan ini"
                    >
                      <Crown className="h-3.5 w-3.5" />
                      <span>Beri Lisensi Lifetime</span>
                    </button>

                    <button
                      onClick={() => {
                        deleteBusinessMessage(selectedMessage.id);
                        setSelectedMessageId(null);
                      }}
                      className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                      title="Hapus Pesan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Message Body */}
                <div className="rounded-2xl bg-slate-50/70 p-4.5 text-sm text-slate-800 leading-relaxed border border-slate-200/60 dark:bg-slate-950/60 dark:border-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {selectedMessage.message}
                </div>

                {/* Previous Reply if any */}
                {selectedMessage.reply && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Balasan Pengembang (Tersimpan)</span>
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        {selectedMessage.repliedAt && new Date(selectedMessage.repliedAt).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
                      {selectedMessage.reply}
                    </p>
                  </div>
                )}

                {/* AI Draft Suggestion if available */}
                {selectedMessage.aiSuggestedReply && !selectedMessage.reply && (
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/40">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Saran Draf Balasan Cerdas (0x Alpha Developer)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setReplyText(selectedMessage.aiSuggestedReply || '')}
                        className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-indigo-500"
                      >
                        Gunakan Draf AI Ini
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-indigo-950/90 dark:text-indigo-200 leading-relaxed italic">
                      "{selectedMessage.aiSuggestedReply}"
                    </p>
                  </div>
                )}

                {/* Reply Form */}
                <form onSubmit={handleSendReply} className="pt-2 space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tulis Balasan / Tanggapan Developer:
                  </label>
                  <textarea
                    rows={3}
                    placeholder={`Tulis balasan untuk ${selectedMessage.senderName} (${selectedMessage.senderEmail})...`}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setReplyText(
                            `Halo ${selectedMessage.senderName}, terima kasih atas pesan Anda ke admin@bukukas.ai.studio. Akun Anda telah kami aktifkan dengan Lisensi Lifetime seumur hidup. Selamat menggunakan BukuKas!`
                          )
                        }
                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300"
                      >
                        👑 Template: Konfirmasi Lifetime
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={!replyText.trim()}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 active:scale-95 disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Kirim Balasan</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
                <Mail className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">Pilih Pesan</p>
                <p className="text-xs text-slate-400">Pilih salah satu pesan di kolom kiri untuk membaca dan membalas.</p>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* TAB 5: REFERRAL & INVITE SYSTEM */}
      {activeTab === 'referral' && (
        <div className="space-y-4">
          <ReferralDashboard />
        </div>
      )}

      {/* TAB 6: SELLER APPLICATIONS */}
      {activeTab === 'sellers' && (
        <SellerApplicationsTab />
      )}

      {/* Modal: Tambah Akun Lifetime Baru */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-7 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    Tambah Akun Baru
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Buat akun klien langsung dengan hak akses & kata sandi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddLifetimeUserSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nama Pengguna / Klien <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Surya Abadi / Budi Finance"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Alamat Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="email@perusahaan.com"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Password Input Field with Generator & Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Kata Sandi Akun <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGenerateRandomPassword('new')}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    ⚡ Acak Sandi
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Contoh: Median1986"
                    value={newUserPassword}
                    onChange={e => setNewUserPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-12 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  Password bawaan: <code className="font-bold text-slate-600 dark:text-slate-300">Median1986</code>
                </p>
              </div>

              {/* Plan & Role Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Jenis Lisensi
                  </label>
                  <select
                    value={newUserPlan}
                    onChange={e => setNewUserPlan(e.target.value as SubscriptionPlan)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="lifetime">👑 Lifetime VIP (Selamanya)</option>
                    <option value="paid">💳 Pro Berbayar</option>
                    <option value="trial">⏳ Trial (7 Hari)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Peran / Role
                  </label>
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value as UserRole)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="user">👤 User Klien</option>
                    <option value="admin">👑 Developer / Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Catatan / Keterangan Khusus
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Akun Lifetime untuk Klien Utama / Tim Finance"
                  value={newUserNotes}
                  onChange={e => setNewUserNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200/80 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  <span>Manfaat Lisensi Lifetime:</span>
                </p>
                <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300">
                  Akun ini tidak akan dibatasi oleh masa trial 7 hari, dapat login selamanya menggunakan email & kata sandi di atas, dan menikmati seluruh fitur pembukuan penuh.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 active:scale-95 transition"
                >
                  <Crown className="h-3.5 w-3.5" />
                  <span>Simpan Akun Baru</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Akun Pengguna / Ganti Kata Sandi */}
      {isEditUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-7 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    Edit Akun & Kata Sandi
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ubah data login, reset sandi, atau atur lisensi pengguna
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditUserModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nama Pengguna <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editUserName}
                  onChange={e => setEditUserName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Alamat Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editUserEmail}
                  onChange={e => setEditUserEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Password Edit with Generator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Kata Sandi Akun <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGenerateRandomPassword('edit')}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    ⚡ Acak Sandi Baru
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={editUserPassword}
                    onChange={e => setEditUserPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-12 text-sm font-mono text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3.5 top-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Plan & Role Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Jenis Lisensi
                  </label>
                  <select
                    value={editUserPlan}
                    onChange={e => setEditUserPlan(e.target.value as SubscriptionPlan)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="lifetime">👑 Lifetime VIP</option>
                    <option value="paid">💳 Pro Berbayar</option>
                    <option value="trial">⏳ Trial (7 Hari)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Peran / Role
                  </label>
                  <select
                    value={editUserRole}
                    onChange={e => setEditUserRole(e.target.value as UserRole)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="user">👤 User Klien</option>
                    <option value="admin">👑 Developer / Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Catatan / Keterangan Khusus
                </label>
                <input
                  type="text"
                  value={editUserNotes}
                  onChange={e => setEditUserNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 transition"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
