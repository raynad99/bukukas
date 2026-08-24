import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Bell,
  CheckCircle2,
  Globe,
  HelpCircle,
  Lock,
  LogIn,
  Moon,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  TrendingUp,
  Unlock,
  User,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { currencySymbols, formatCurrency } from '../i18n/translations';
import { Currency, Language } from '../types';

export const Header: React.FC = () => {
  const {
    t,
    theme,
    setTheme,
    language,
    setLanguage,
    currency,
    setCurrency,
    exchangeRates,
    isRatesLoading,
    fetchRates,
    setIsCurrencyConverterOpen,
    security,
    lockVault,
    setIsAddTransactionOpen,
    setIsOnboardingOpen,
    notifications,
    currentUser,
    setActiveView,
  } = useApp();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'en', label: 'English (US)', flag: '🇺🇸' },
    { code: 'ja', label: '日本語 (Japanese)', flag: '🇯🇵' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'ar', label: 'العربية (Arabic)', flag: '🇸🇦' },
  ];

  const currencies: Currency[] = [
    'IDR',
    'NZD',
    'USD',
    'EUR',
    'JPY',
    'SGD',
    'GBP',
    'AUD',
    'MYR',
    'HKD',
    'TWD',
    'BGN',
    'KRW',
  ];

  // Current NZD exchange rate relative to IDR
  const nzdRateToIdr = exchangeRates.rates['IDR'] ? Math.round(exchangeRates.rates['IDR']) : 9540;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 sm:px-6">
      {/* Left section: App Brand & Live Rates */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveView('dashboard')}
          className="flex items-center gap-2.5 text-left transition hover:opacity-90"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-sm shadow-emerald-500/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              {t('app_name')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('app_tagline')}
            </p>
          </div>
        </button>

        {/* Real-time NZD Exchange Rate Ticker Badge */}
        <button
          id="btn-live-nzd-rate-ticker"
          onClick={() => setIsCurrencyConverterOpen(true)}
          title="Klik untuk melihat konversi kurs real-time & multi-mata uang"
          className="hidden md:flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/90 px-3 py-1 text-xs font-semibold text-blue-800 transition hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-300"
        >
          <span>🇳🇿 1 NZD =</span>
          <span className="font-bold text-blue-900 dark:text-blue-200">
            {formatCurrency(nzdRateToIdr, 'IDR', language)}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Live
          </span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* User Account / Login Button */}
        <button
          id="btn-header-user-account"
          onClick={() => setActiveView('auth')}
          title="Kelola Akun & Autentikasi Gmail"
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {currentUser ? (
            <>
              <img
                src={currentUser.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=10b981&color=fff`}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="h-5 w-5 rounded-full object-cover border border-emerald-400"
              />
              <span className="hidden md:inline font-semibold text-slate-900 dark:text-white max-w-[120px] truncate">
                {currentUser.name}
              </span>
              <span className="rounded bg-emerald-100 px-1 py-0.2 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Gmail
              </span>
            </>
          ) : (
            <>
              <LogIn className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Masuk / Daftar</span>
            </>
          )}
        </button>

        {/* Real-Time Exchange Rate & Converter Button */}
        <button
          id="btn-open-currency-converter"
          onClick={() => setIsCurrencyConverterOpen(true)}
          title="Buka Kalkulator Kurs Real-Time (NZD, IDR, USD, dll.)"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowRightLeft className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span className="hidden sm:inline">Kurs Real-Time</span>
          <span className="rounded bg-blue-100 px-1 py-0.2 text-[9px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            NZD 🇳🇿
          </span>
        </button>

        {/* Vault Lock Button */}
        <button
          id="btn-lock-vault"
          onClick={lockVault}
          title={security.isVaultLocked ? t('unlock_vault') : t('lock_vault')}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
            security.hasPassphrase
              ? 'border-indigo-200 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300'
              : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300'
          }`}
        >
          {security.isVaultLocked ? (
            <>
              <Lock className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden sm:inline">{t('vault_status_locked')}</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span className="hidden sm:inline">{t('vault_status_secure')}</span>
            </>
          )}
        </button>

        {/* Language & Currency Menu */}
        <div className="relative">
          <button
            id="btn-lang-dropdown"
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:h-9"
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="uppercase">{language}</span>
            <span className="text-slate-400">|</span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{currency}</span>
          </button>

          {isLangOpen && (
            <div className="absolute right-0 mt-2 w-64 max-h-[85vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2.5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="px-2 py-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                {t('select_language')}
              </div>
              <div className="space-y-0.5">
                {languages.map(item => (
                  <button
                    key={item.code}
                    onClick={() => {
                      setLanguage(item.code);
                      setIsLangOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                      language === item.code
                        ? 'bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>
                      {item.flag} {item.label}
                    </span>
                    {language === item.code && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                  </button>
                ))}
              </div>

              <div className="my-1.5 border-t border-slate-100 dark:border-slate-800"></div>

              <div className="px-2 py-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                {t('select_currency')}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {currencies.map(curr => {
                  const meta = currencySymbols[curr] || { flag: '', symbol: curr, name: curr };
                  const isSelected = currency === curr;
                  return (
                    <button
                      key={curr}
                      onClick={() => {
                        setCurrency(curr);
                        setIsLangOpen(false);
                      }}
                      className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span>{meta.flag}</span>
                        <span>{curr}</span>
                      </span>
                      <span className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                        {meta.symbol}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Theme Switcher */}
        <button
          id="btn-theme-toggle"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:h-9 sm:w-9"
          title="Ganti Mode Gelap/Terang"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Tutorial / Help Icon */}
        <button
          id="btn-open-tutorial"
          onClick={() => setIsOnboardingOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:h-9 sm:w-9"
          title={t('nav_tutorial')}
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            id="btn-notifications"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:h-9 sm:w-9"
          >
            <Bell className="h-4 w-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {t('notifications')}
                </span>
                <span className="text-[10px] text-slate-400">{notifications.length} item</span>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">Tidak ada notifikasi baru</p>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className="rounded-lg border border-slate-100 bg-slate-50/80 p-2.5 text-xs dark:border-slate-800/80 dark:bg-slate-800/50"
                    >
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{n.title}</div>
                      <div className="mt-0.5 text-slate-600 dark:text-slate-400">{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add Transaction Primary CTA */}
        <button
          id="btn-header-add-tx"
          onClick={() => setIsAddTransactionOpen(true)}
          className="hidden items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-500 sm:flex"
        >
          <Plus className="h-4 w-4" />
          <span>{t('add_transaction')}</span>
        </button>
      </div>
    </header>
  );
};
