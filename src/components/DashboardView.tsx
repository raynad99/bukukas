import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  Award,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Globe2,
  HeartPulse,
  Landmark,
  Layers,
  PieChart as PieIcon,
  Plus,
  RefreshCw,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { currencySymbols, formatCurrency } from '../i18n/translations';
import { Currency } from '../types';
import { convertCurrency, convertToIdr } from '../utils/exchangeRates';
import { IconHelper } from './IconHelper';

export const DashboardView: React.FC = () => {
  const {
    t,
    transactions,
    accounts,
    categories,
    bills,
    currency,
    setCurrency,
    language,
    setActiveView,
    setIsAddTransactionOpen,
    toggleBillPaid,
    exchangeRates,
    fetchRates,
    setIsCurrencyConverterOpen,
  } = useApp();

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12

  // Month navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const monthString = String(selectedMonth).padStart(2, '0');
  const periodPrefix = `${selectedYear}-${monthString}`;

  // Month Name Formatter
  const monthLabel = useMemo(() => {
    const d = new Date(selectedYear, selectedMonth - 1, 1);
    return d.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' });
  }, [selectedYear, selectedMonth, language]);

  // Filter transactions for this month
  const monthlyTransactions = useMemo(() => {
    return transactions.filter(tx => tx.date.startsWith(periodPrefix));
  }, [transactions, periodPrefix]);

  // Calculate Balances & Totals converted to active currency
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, a) => {
      const converted = convertCurrency(a.balance, a.currency || 'IDR', currency, exchangeRates.rates);
      return sum + converted;
    }, 0);
  }, [accounts, currency, exchangeRates.rates]);

  const totalBalanceIdr = useMemo(() => {
    return accounts.reduce((sum, a) => {
      return sum + convertToIdr(a.balance, a.currency || 'IDR', exchangeRates.rates);
    }, 0);
  }, [accounts, exchangeRates.rates]);

  const monthlyIncome = useMemo(() => {
    return monthlyTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => {
        const itemCurr = tx.currency || 'IDR';
        return sum + convertCurrency(tx.amount, itemCurr, currency, exchangeRates.rates);
      }, 0);
  }, [monthlyTransactions, currency, exchangeRates.rates]);

  const monthlyIncomeIdr = useMemo(() => {
    return monthlyTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => {
        const itemCurr = tx.currency || 'IDR';
        return sum + convertToIdr(tx.amount, itemCurr, exchangeRates.rates);
      }, 0);
  }, [monthlyTransactions, exchangeRates.rates]);

  const monthlyExpense = useMemo(() => {
    return monthlyTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => {
        const itemCurr = tx.currency || 'IDR';
        return sum + convertCurrency(tx.amount, itemCurr, currency, exchangeRates.rates);
      }, 0);
  }, [monthlyTransactions, currency, exchangeRates.rates]);

  const monthlyExpenseIdr = useMemo(() => {
    return monthlyTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => {
        const itemCurr = tx.currency || 'IDR';
        return sum + convertToIdr(tx.amount, itemCurr, exchangeRates.rates);
      }, 0);
  }, [monthlyTransactions, exchangeRates.rates]);

  const netSavings = monthlyIncome - monthlyExpense;
  const savingsRate = monthlyIncome > 0 ? Math.max(0, Math.round((netSavings / monthlyIncome) * 100)) : 0;

  // Financial Health Score Calculation (0-100)
  const healthScore = useMemo(() => {
    let score = 50;
    if (monthlyIncome > 0) {
      if (savingsRate >= 30) score += 30;
      else if (savingsRate >= 15) score += 20;
      else if (savingsRate > 0) score += 10;
      else score -= 20;
    }
    // Check overdue bills
    const overdueBills = bills.filter(b => !b.isPaid && new Date(b.dueDate) < new Date()).length;
    score -= overdueBills * 15;

    // Check account balances
    if (totalBalance > monthlyExpense * 3) score += 20;
    else if (totalBalance > monthlyExpense) score += 10;

    return Math.max(10, Math.min(100, score));
  }, [monthlyIncome, savingsRate, bills, totalBalance, monthlyExpense]);

  // Category Expense Breakdown Data for Donut Chart (converted to active currency)
  const categoryPieData = useMemo(() => {
    const expenseMap: Record<string, number> = {};
    monthlyTransactions
      .filter(tx => tx.type === 'expense')
      .forEach(tx => {
        const itemCurr = tx.currency || 'IDR';
        const converted = convertCurrency(tx.amount, itemCurr, currency, exchangeRates.rates);
        expenseMap[tx.categoryId] = (expenseMap[tx.categoryId] || 0) + converted;
      });

    return Object.entries(expenseMap)
      .map(([catId, amount]) => {
        const cat = categories.find(c => c.id === catId);
        return {
          name: cat?.name || catId,
          value: amount,
          color: cat?.color || '#3b82f6',
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [monthlyTransactions, categories, currency, exchangeRates.rates]);

  // Daily Cash Flow Trend Data (converted to active currency)
  const dailyCashFlowData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const result = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${periodPrefix}-${dayStr}`;

      const dayIncome = transactions
        .filter(tx => tx.date === dateStr && tx.type === 'income')
        .reduce((sum, tx) => {
          const itemCurr = tx.currency || 'IDR';
          return sum + convertCurrency(tx.amount, itemCurr, currency, exchangeRates.rates);
        }, 0);

      const dayExpense = transactions
        .filter(tx => tx.date === dateStr && tx.type === 'expense')
        .reduce((sum, tx) => {
          const itemCurr = tx.currency || 'IDR';
          return sum + convertCurrency(tx.amount, itemCurr, currency, exchangeRates.rates);
        }, 0);

      result.push({
        day: `${day}`,
        income: dayIncome,
        expense: dayExpense,
      });
    }
    return result;
  }, [transactions, periodPrefix, selectedYear, selectedMonth, currency, exchangeRates.rates]);

  // Urgent upcoming bills
  const upcomingBills = useMemo(() => {
    return bills
      .filter(b => !b.isPaid)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 3);
  }, [bills]);

  return (
    <div className="space-y-6 pb-12">
      {/* Month Picker Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('nav_dashboard')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ringkasan pembukuan, grafik arus kas, dan kesehatan finansial Anda.
          </p>
        </div>

        {/* Month Selector Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={handlePrevMonth}
              className="rounded-lg p-1.5 text-slate-600 transition hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 px-3 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{monthLabel}</span>
            </div>
            <button
              onClick={handleNextMonth}
              className="rounded-lg p-1.5 text-slate-600 transition hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => setIsAddTransactionOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('add_transaction')}</span>
          </button>
        </div>
      </div>

      {/* Kurs Real-Time (Live) Full Multi-Currency Dashboard Panel */}
      <div className="rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-slate-50/80 p-4 shadow-xs dark:border-blue-900/40 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900">
        {/* Panel Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-blue-100 pb-3 dark:border-blue-950">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Kurs Real-Time (Live) & Multi-Mata Uang
                </h3>
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Nilai tukar benchmark global diperbarui otomatis • Terakhir: <strong className="text-slate-700 dark:text-slate-200">{exchangeRates.lastUpdated}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => fetchRates()}
              title="Perbarui kurs sekarang"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Segarkan</span>
            </button>
            <button
              onClick={() => setIsCurrencyConverterOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-500"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>Kalkulator Kurs</span>
            </button>
          </div>
        </div>

        {/* Currency Rates Grid - Visible in full across all screens */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-13">
          {([
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
          ] as Currency[]).map((currCode) => {
            const meta = currencySymbols[currCode];
            const isCurrentActive = currency === currCode;
            const rateInIdr = convertCurrency(1, currCode, 'IDR', exchangeRates.rates);

            return (
              <button
                key={currCode}
                onClick={() => setCurrency(currCode)}
                title={`Klik untuk mengatur ${currCode} sebagai mata uang aktif aplikasi`}
                className={`group flex flex-col justify-between rounded-2xl border p-2.5 text-left transition-all hover:scale-[1.02] ${
                  isCurrentActive
                    ? 'border-blue-500 bg-blue-600 text-white shadow-md'
                    : 'border-slate-200/80 bg-white/90 text-slate-800 hover:border-blue-300 hover:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-blue-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base leading-none">{meta.flag}</span>
                    <span className={`text-xs font-black tracking-wide ${isCurrentActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                      {currCode}
                    </span>
                  </div>
                  {isCurrentActive ? (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-blue-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400 opacity-0 transition group-hover:opacity-100 dark:text-slate-500">
                      Pakai
                    </span>
                  )}
                </div>

                <div className="mt-2">
                  <span className={`block text-[10px] ${isCurrentActive ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    1 {currCode} =
                  </span>
                  <span className={`block text-xs font-bold truncate ${isCurrentActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                    Rp {Math.round(rateInIdr).toLocaleString(language === 'id' ? 'id-ID' : 'en-US')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Saldo */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('total_balance')}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {formatCurrency(totalBalance, currency, language)}
          </div>
          {currency !== 'IDR' && (
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              ({formatCurrency(totalBalanceIdr, 'IDR', language)})
            </div>
          )}
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <Landmark className="h-3 w-3 text-emerald-500" />
            <span>{accounts.length} dompet & rekening aktif</span>
          </div>
        </div>

        {/* Card 2: Pemasukan Bulan Ini */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('monthly_income')}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            + {formatCurrency(monthlyIncome, currency, language)}
          </div>
          {currency !== 'IDR' && (
            <div className="text-xs font-bold text-teal-600 dark:text-teal-400">
              ({formatCurrency(monthlyIncomeIdr, 'IDR', language)})
            </div>
          )}
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Periode: {monthLabel}
          </div>
        </div>

        {/* Card 3: Pengeluaran Bulan Ini */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('monthly_expense')}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            - {formatCurrency(monthlyExpense, currency, language)}
          </div>
          {currency !== 'IDR' && (
            <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
              ({formatCurrency(monthlyExpenseIdr, 'IDR', language)})
            </div>
          )}
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {monthlyTransactions.filter(t => t.type === 'expense').length} transaksi keluar
          </div>
        </div>

        {/* Card 4: Net Savings & Health Score */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('net_savings')}</span>
            <div className="flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <HeartPulse className="h-3 w-3" />
              <span>Skor {healthScore}/100</span>
            </div>
          </div>
          <div
            className={`mt-2 text-xl font-bold tracking-tight ${
              netSavings >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {formatCurrency(netSavings, currency, language)}
          </div>
          {currency !== 'IDR' && (
            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              ({formatCurrency(convertToIdr(netSavings, currency, exchangeRates.rates), 'IDR', language)})
            </div>
          )}
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">{t('savings_rate')}:</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{savingsRate}%</span>
          </div>
        </div>
      </div>

      {/* Urgent Bills Due Alert Banner */}
      {upcomingBills.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  {t('upcoming_bills_alert')} ({upcomingBills.length} tagihan menunggu)
                </h3>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                  Jangan lewatkan jatuh tempo tagihan penting Anda untuk menjaga skor keuangan.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveView('bills')}
              className="self-start rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-500 sm:self-auto"
            >
              Lihat Tagihan
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {upcomingBills.map(b => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl bg-white/90 p-2.5 text-xs shadow-2xs dark:bg-slate-900/90"
              >
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{b.title}</div>
                  <div className="text-[11px] text-slate-500">
                    Jatuh tempo: {b.dueDate} | {formatCurrency(b.amount, currency, language)}
                  </div>
                </div>
                <button
                  onClick={() => toggleBillPaid(b.id, true)}
                  className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                >
                  Bayar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Visual Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Cash Flow Trend Chart (2 Columns) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('cashflow_trend')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Fluktuasi pemasukan dan pengeluaran harian</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Pemasukan
              </span>
              <span className="flex items-center gap-1 font-medium text-rose-500">
                <span className="h-2 w-2 rounded-full bg-rose-500"></span> Pengeluaran
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyCashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={val => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}jt` : `${val / 1000}k`)}
                />
                <Tooltip
                  formatter={(val: number) => [formatCurrency(val, currency, language), '']}
                  labelFormatter={label => `Tanggal ${label} ${monthLabel}`}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Pemasukan"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorIncome)"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Pengeluaran"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorExpense)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Expense Donut Chart (1 Column) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('expense_breakdown')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Proporsi per kategori</p>
            </div>
            <PieIcon className="h-4 w-4 text-slate-400" />
          </div>

          {categoryPieData.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-xs text-slate-400">
              <Layers className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <span>{t('no_transactions_month')}</span>
            </div>
          ) : (
            <>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [formatCurrency(val, currency, language), 'Nominal']}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '0.5rem',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legends */}
              <div className="mt-2 max-h-28 space-y-1.5 overflow-y-auto pr-1">
                {categoryPieData.slice(0, 5).map(cat => {
                  const percentage = monthlyExpense > 0 ? ((cat.value / monthlyExpense) * 100).toFixed(1) : 0;
                  return (
                    <div key={cat.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="truncate text-slate-700 dark:text-slate-300">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                        <span>{formatCurrency(cat.value, currency, language)}</span>
                        <span className="text-[11px] text-slate-400">({percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Category Budgets Tracking & Recent Transactions Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category Budget Progress */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('budget_overview')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Realisasi pengeluaran terhadap batas anggaran</p>
            </div>
            <button
              onClick={() => setActiveView('categories')}
              className="text-xs font-semibold text-emerald-600 transition hover:underline dark:text-emerald-400"
            >
              Kelola Kategori
            </button>
          </div>

          <div className="space-y-4">
            {categories
              .filter(c => c.type === 'expense' && c.budgetLimit && c.budgetLimit > 0)
              .map(cat => {
                const spent = monthlyTransactions
                  .filter(tx => tx.categoryId === cat.id && tx.type === 'expense')
                  .reduce((sum, tx) => {
                    const itemCurr = tx.currency || 'IDR';
                    return sum + convertCurrency(tx.amount, itemCurr, currency, exchangeRates.rates);
                  }, 0);

                const rawLimit = cat.budgetLimit || 1;
                const limit = convertCurrency(rawLimit, 'IDR', currency, exchangeRates.rates);
                const percent = Math.min(100, Math.round((spent / limit) * 100));
                const isOver = spent > limit;

                return (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-6 w-6 items-center justify-center rounded-md text-white"
                          style={{ backgroundColor: cat.color }}
                        >
                          <IconHelper name={cat.icon} className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${isOver ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
                          {formatCurrency(spent, currency, language)}
                        </span>
                        <span className="text-slate-400"> / {formatCurrency(limit, currency, language)}</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOver ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    {isOver && (
                      <p className="text-[10px] font-semibold text-rose-500">
                        ⚠️ Melebihi anggaran sebesar {formatCurrency(spent - limit, currency, language)}!
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('recent_transactions')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Mutasi terbaru di buku kas</p>
            </div>
            <button
              onClick={() => setActiveView('transactions')}
              className="text-xs font-semibold text-emerald-600 transition hover:underline dark:text-emerald-400"
            >
              {t('view_all')}
            </button>
          </div>

          <div className="space-y-2.5">
            {transactions.slice(0, 5).map(tx => {
              const cat = categories.find(c => c.id === tx.categoryId);
              const acc = accounts.find(a => a.id === tx.accountId);
              const isIncome = tx.type === 'income';

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition hover:bg-slate-100/70 dark:border-slate-800/60 dark:bg-slate-800/40 dark:hover:bg-slate-800/80"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-2xs"
                      style={{ backgroundColor: cat?.color || '#10b981' }}
                    >
                      <IconHelper name={cat?.icon || 'DollarSign'} className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-xs sm:text-sm dark:text-slate-200">
                        {tx.title}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{tx.date}</span>
                        <span>•</span>
                        <span>{acc?.name || 'Rekening'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`font-bold text-xs sm:text-sm ${
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {isIncome ? '+' : '-'} {formatCurrency(convertCurrency(tx.amount, tx.currency || 'IDR', currency, exchangeRates.rates), currency, language)}
                    </div>
                    {tx.currency && tx.currency !== currency && (
                      <div className="text-[10px] font-medium text-slate-400">
                        (Asli: {formatCurrency(tx.amount, tx.currency, language)})
                      </div>
                    )}
                    {currency !== 'IDR' && (
                      <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        ({formatCurrency(convertToIdr(tx.amount, tx.currency || 'IDR', exchangeRates.rates), 'IDR', language)})
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
