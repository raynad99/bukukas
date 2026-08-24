import React from 'react';
import {
  Bot,
  Briefcase,
  CalendarClock,
  Cloud,
  Crown,
  FileSpreadsheet,
  Grid,
  HelpCircle,
  LayoutDashboard,
  Lock,
  Mail,
  Receipt,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateTrialStatus } from '../utils/trialHelper';

export const Sidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    t,
    bills,
    security,
    setIsOnboardingOpen,
    currentUser,
    businessMessages,
    setIsContactDevModalOpen,
  } = useApp();

  const unpaidBillsCount = bills.filter(b => !b.isPaid).length;
  const unreadMessagesCount = businessMessages.filter(m => !m.isRead).length;
  const trialInfo = calculateTrialStatus(currentUser);
  const isAdmin = currentUser?.role === 'admin';

  const navItems = [
    { id: 'dashboard', label: t('nav_dashboard'), icon: LayoutDashboard },
    { id: 'transactions', label: t('nav_transactions'), icon: Receipt },
    {
      id: 'ai',
      label: 'BukuKas AI Chat',
      icon: Sparkles,
      badge: 'GEMINI',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold',
    },
    {
      id: 'auth',
      label: 'Akun & Profil',
      icon: UserCheck,
      badge: currentUser ? (trialInfo.isLifetime ? 'VIP' : trialInfo.isPaid ? 'PRO' : `${trialInfo.daysRemaining}d`) : 'Masuk',
      badgeColor: trialInfo.badgeClass,
    },
    {
      id: 'bills',
      label: t('nav_bills'),
      icon: CalendarClock,
      badge: unpaidBillsCount > 0 ? `${unpaidBillsCount}` : undefined,
      badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    },
    { id: 'categories', label: t('nav_categories'), icon: Grid },
    { id: 'reports', label: t('nav_reports'), icon: FileSpreadsheet },
    {
      id: 'security',
      label: t('nav_security'),
      icon: ShieldCheck,
      badge: security.is2FAEnabled ? '2FA ON' : undefined,
      badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    },
    { id: 'cloud', label: t('nav_cloud'), icon: Cloud },
    ...(isAdmin
      ? [
          {
            id: 'dev',
            label: 'Portal Dev & Email',
            icon: Crown,
            badge: unreadMessagesCount > 0 ? `${unreadMessagesCount} baru` : 'admin',
            badgeColor:
              unreadMessagesCount > 0
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
            highlight: true,
          },
        ]
      : []),
    { id: 'settings', label: t('nav_settings'), icon: Settings },
  ];

  return (
    <aside className="hidden h-[calc(100vh-57px)] w-64 flex-col justify-between border-r border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/40 md:flex">
      <div className="space-y-1.5">
        <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          Menu Utama
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setActiveView(item.id)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? item.id === 'dev'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-sm shadow-amber-600/20'
                    : 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                  : item.id === 'dev'
                  ? 'text-amber-700 hover:bg-amber-100/60 dark:text-amber-400 dark:hover:bg-amber-950/40'
                  : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : item.id === 'dev' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`} />
                <span className={item.id === 'dev' && !isActive ? 'font-bold' : ''}>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    isActive ? 'bg-white/20 text-white' : item.badgeColor
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Contact Dev & Tutorial widget */}
      <div className="space-y-2 border-t border-slate-200/80 pt-3 dark:border-slate-800/80">
        <button
          onClick={() => setIsContactDevModalOpen(true)}
          className="flex w-full items-center justify-between rounded-xl border border-indigo-200/80 bg-indigo-50/70 px-3 py-2 text-xs font-semibold text-indigo-800 transition hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300"
          title="Kirim pesan langsung ke admin@bukukas.ai.studio"
        >
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Kirim Email Bisnis</span>
          </div>
          <span className="text-[10px] text-indigo-600 font-bold dark:text-indigo-400">Dev</span>
        </button>

        <button
          onClick={() => setIsOnboardingOpen(true)}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <HelpCircle className="h-4 w-4 text-emerald-600" />
          <span>{t('nav_tutorial')}</span>
        </button>

        <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                <Lock className="h-3 w-3" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-900 dark:text-white">Enkripsi AES-256</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Brankas Terlindungi</p>
              </div>
            </div>
            {currentUser?.role === 'admin' && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Dev Admin
              </span>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

