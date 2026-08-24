import React, { useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Info,
  MessageSquare,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { AddTransactionModal } from './components/AddTransactionModal';
import { AiChatBot } from './components/AiChatBot';
import { AuthView } from './components/AuthView';
import { BillsView } from './components/BillsView';
import { BottomNav } from './components/BottomNav';
import { CategoriesView } from './components/CategoriesView';
import { ContactDevModal } from './components/ContactDevModal';
import { CryptoPaymentModal } from './components/CryptoPaymentModal';
import { CurrencyConverterModal } from './components/CurrencyConverterModal';
import { DashboardView } from './components/DashboardView';
import { DevPortalView } from './components/DevPortalView';
import { Header } from './components/Header';
import { LockScreen } from './components/LockScreen';
import { LoansView } from './components/LoansView';
import { OnboardingModal } from './components/OnboardingModal';
import { ReportsView } from './components/ReportsView';
import { SecurityView } from './components/SecurityView';
import { Sidebar } from './components/Sidebar';
import { TransactionsView } from './components/TransactionsView';
import { TrialBanner } from './components/TrialBanner';
import { AppProvider, useApp } from './context/AppContext';

const AppContent: React.FC = () => {
  const { activeView, setActiveView, security, notifications, removeNotification, currentUser } = useApp();
  const [isAiFloatingOpen, setIsAiFloatingOpen] = useState(false);

  // GATE AUTENTIKASI: tamu (belum login) hanya boleh melihat halaman login.
  // Seluruh navigasi fitur (sidebar, header, bottom nav) disembunyikan.
  const isGuest = !currentUser;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 transition-colors duration-200 antialiased dark:bg-slate-950 dark:text-slate-100">
      {/* Lock screen overlay if locked */}
      {security.isVaultLocked && <LockScreen />}

      {/* Main Layout Container */}
      <div className="flex min-h-screen w-full">
        {/* Desktop Left Sidebar (hanya untuk user yang sudah login) */}
        {!isGuest && <Sidebar />}

        {/* Right Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top Bar Header (disembunyikan di halaman login) */}
          {!isGuest && <Header />}

          {/* View Container */}
          <main className="flex-1 px-2.5 py-3 sm:px-4 md:px-6 lg:px-8 max-w-7xl w-full mx-auto pb-24 md:pb-12 overflow-y-auto">
            {/* Banner status lisensi / peringatan trial habis (user login) */}
            {!isGuest && activeView !== 'auth' && <TrialBanner />}

            {activeView === 'dashboard' && <DashboardView />}
            {activeView === 'transactions' && <TransactionsView />}
            {activeView === 'ai' && <AiChatBot isEmbedded={true} />}
            {/* TAMU: paksa selalu tampilkan halaman login apapun activeView-nya */}
            {isGuest && <AuthView />}
            {!isGuest && (activeView === 'auth' || activeView === 'account' || activeView === 'login' || activeView === 'register') && <AuthView />}
            {activeView === 'bills' && <BillsView />}
            {activeView === 'loans' && <LoansView />}
            {activeView === 'categories' && <CategoriesView />}
            {activeView === 'reports' && <ReportsView />}
            {activeView === 'dev' && (currentUser?.role === 'admin' ? <DevPortalView /> : <DashboardView />)}
            {(activeView === 'security' || activeView === 'cloud' || activeView === 'settings') && <SecurityView />}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (hanya untuk user yang sudah login) */}
      {!isGuest && <BottomNav />}

      {/* Floating AI Chatbot Assistant Widget (Desktop & Tablet, user login saja) */}
      {!isGuest && activeView !== 'ai' && (
        <div className="fixed right-6 bottom-6 z-40 hidden md:block">
          {isAiFloatingOpen ? (
            <div className="relative">
              <AiChatBot isEmbedded={false} onClose={() => setIsAiFloatingOpen(false)} />
            </div>
          ) : (
            <button
              onClick={() => setIsAiFloatingOpen(true)}
              className="group flex items-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 py-3 px-4.5 text-white shadow-xl shadow-emerald-900/30 transition-all hover:scale-105 hover:from-emerald-500 hover:to-teal-500 active:scale-95"
              title="Tanya AI Advisor Finansial"
            >
              <div className="relative flex h-6 w-6 items-center justify-center">
                <Sparkles className="h-5 w-5 text-white animate-pulse" />
              </div>
              <span className="text-xs font-bold tracking-tight">Tanya BukuKas AI</span>
              <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[9px] font-extrabold uppercase">
                0x Alpha
              </span>
            </button>
          )}
        </div>
      )}

      {/* Modals & Dialogs */}
      <AddTransactionModal />
      <ContactDevModal />
      <CryptoPaymentModal />
      <CurrencyConverterModal />
      <OnboardingModal />

      {/* Global Toast Notifications Stack */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 rounded-2xl border p-3.5 shadow-lg backdrop-blur-md transition-all ${
              n.type === 'success'
                ? 'border-emerald-200/80 bg-white/95 text-slate-900 dark:border-emerald-900/60 dark:bg-slate-900/95 dark:text-white'
                : n.type === 'error'
                ? 'border-rose-200/80 bg-white/95 text-slate-900 dark:border-rose-900/60 dark:bg-slate-900/95 dark:text-white'
                : 'border-blue-200/80 bg-white/95 text-slate-900 dark:border-blue-900/60 dark:bg-slate-900/95 dark:text-white'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {n.type === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : n.type === 'error' ? (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              ) : (
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              )}
              <div>
                <h5 className="text-xs font-bold">{n.title}</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{n.message}</p>
              </div>
            </div>

            <button
              onClick={() => removeNotification(n.id)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
