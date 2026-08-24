import React, { useState } from 'react';
import {
  CalendarClock,
  Cloud,
  Crown,
  FileSpreadsheet,
  Grid,
  HandCoins,
  LayoutDashboard,
  Mail,
  MoreHorizontal,
  Plus,
  Receipt,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const BottomNav: React.FC = () => {
  const { activeView, setActiveView, t, bills, loans, setIsAddTransactionOpen, currentUser, businessMessages } = useApp();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const unpaidCount = bills.filter(b => !b.isPaid).length;
  const activeLoansCount = loans ? loans.filter(l => l.status !== 'paid').length : 0;
  const unreadMessagesCount = businessMessages.filter(m => !m.isRead).length;
  const isAdmin = currentUser?.role === 'admin';
  const isLifetime = currentUser?.plan === 'lifetime';

  const moreItems = [
    { id: 'loans', label: t('nav_loans') || 'Hutang & Piutang', icon: HandCoins, badge: activeLoansCount > 0 ? `${activeLoansCount}` : undefined },
    { id: 'ai', label: 'BukuKas AI', icon: Sparkles, badge: 'AI' },
    ...((isAdmin || isLifetime)
      ? [{ id: 'dev', label: isAdmin ? 'Portal Dev' : 'Portal Referral', icon: Crown, badge: unreadMessagesCount > 0 && isAdmin ? `${unreadMessagesCount}` : undefined }]
      : []),
    { id: 'categories', label: t('nav_categories'), icon: Grid },
    { id: 'reports', label: t('nav_reports'), icon: FileSpreadsheet },
    { id: 'security', label: t('nav_security'), icon: ShieldCheck },
    { id: 'cloud', label: t('nav_cloud'), icon: Cloud },
    { id: 'settings', label: t('nav_settings'), icon: Settings },
  ];

  return (
    <>
      {/* More Menu Drawer Sheet */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden" onClick={() => setIsMoreOpen(false)}>
          <div
            className="absolute right-0 bottom-16 left-0 rounded-t-2xl border-t border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
            <p className="mb-2 px-2 text-xs font-bold tracking-wider text-slate-400 uppercase">Menu Lainnya</p>
            <div className="grid grid-cols-3 gap-2">
              {moreItems.map(item => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      setIsMoreOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 text-center transition ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[11px] font-medium leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) on Mobile */}
      <button
        id="btn-mobile-fab-add"
        onClick={() => setIsAddTransactionOpen(true)}
        className="fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/40 transition hover:scale-105 active:scale-95 md:hidden"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px) + 12px)' }}
        title={t('add_transaction')}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed right-0 bottom-0 left-0 z-30 flex items-center justify-around border-t border-slate-200/90 bg-white/95 px-2 backdrop-blur-md dark:border-slate-800/90 dark:bg-slate-900/95 md:hidden" style={{ height: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <button
          onClick={() => {
            setActiveView('dashboard');
            setIsMoreOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 transition ${
            activeView === 'dashboard' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="mt-0.5 text-[10px]">{t('nav_dashboard')}</span>
        </button>

        <button
          onClick={() => {
            setActiveView('transactions');
            setIsMoreOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 transition ${
            activeView === 'transactions' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Receipt className="h-5 w-5" />
          <span className="mt-0.5 text-[10px]">{t('nav_transactions')}</span>
        </button>

        <button
          onClick={() => {
            setActiveView('auth');
            setIsMoreOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 transition ${
            activeView === 'auth' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <UserCheck className="h-5 w-5" />
          <span className="mt-0.5 text-[10px]">{currentUser ? 'Akun' : 'Masuk'}</span>
        </button>

        <button
          onClick={() => {
            setActiveView('bills');
            setIsMoreOpen(false);
          }}
          className={`relative flex flex-col items-center justify-center py-1 transition ${
            activeView === 'bills' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <CalendarClock className="h-5 w-5" />
          <span className="mt-0.5 text-[10px]">{t('nav_bills')}</span>
          {unpaidCount > 0 && (
            <span className="absolute -top-0.5 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
              {unpaidCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className={`flex flex-col items-center justify-center py-1 transition ${
            isMoreOpen || ['categories', 'reports', 'security', 'cloud', 'settings'].includes(activeView)
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="mt-0.5 text-[10px]">Lainnya</span>
        </button>
      </nav>
    </>
  );
};
