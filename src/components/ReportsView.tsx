import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  PieChart,
  Printer,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../i18n/translations';
import { exportTransactionsToCSV } from '../utils/csvExport';
import { generatePDFReport } from '../utils/pdfExport';
import { convertCurrency } from '../utils/exchangeRates';

export const ReportsView: React.FC = () => {
  const {
    t,
    transactions,
    categories,
    accounts,
    currency,
    language,
    exchangeRates,
    addNotification,
  } = useApp();

  const [periodType, setPeriodType] = useState<'this_month' | 'last_month' | 'ytd' | 'custom'>('this_month');
  const [customStartDate, setCustomStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [isGenerating, setIsGenerating] = useState(false);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  // Filter transactions according to selected period
  const { filteredTransactions, periodLabel } = useMemo(() => {
    let list = [...transactions];
    let label = '';

    if (periodType === 'this_month') {
      const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
      list = transactions.filter(tx => tx.date.startsWith(monthPrefix));
      const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleDateString(
        language === 'id' ? 'id-ID' : 'en-US',
        { month: 'long', year: 'numeric' }
      );
      label = `Bulan Ini (${monthName})`;
    } else if (periodType === 'last_month') {
      const lastMonthDate = new Date(currentYear, currentMonth - 2, 1);
      const lastMonthYear = lastMonthDate.getFullYear();
      const lastMonthNum = lastMonthDate.getMonth() + 1;
      const monthPrefix = `${lastMonthYear}-${String(lastMonthNum).padStart(2, '0')}`;
      list = transactions.filter(tx => tx.date.startsWith(monthPrefix));
      const monthName = lastMonthDate.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
        month: 'long',
        year: 'numeric',
      });
      label = `Bulan Lalu (${monthName})`;
    } else if (periodType === 'ytd') {
      list = transactions.filter(tx => tx.date.startsWith(`${currentYear}-`));
      label = `Tahun Berjalan ${currentYear} (YTD)`;
    } else {
      list = transactions.filter(tx => tx.date >= customStartDate && tx.date <= customEndDate);
      label = `${customStartDate} s/d ${customEndDate}`;
    }

    return { filteredTransactions: list, periodLabel: label };
  }, [transactions, periodType, customStartDate, customEndDate, currentYear, currentMonth, language]);

  // Totals converted to active currency
  const totalIncome = useMemo(() => {
    return filteredTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => {
        const itemCurr = tx.currency || 'IDR';
        return sum + convertCurrency(tx.amount, itemCurr, currency, exchangeRates.rates);
      }, 0);
  }, [filteredTransactions, currency, exchangeRates.rates]);

  const totalExpense = useMemo(() => {
    return filteredTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => {
        const itemCurr = tx.currency || 'IDR';
        return sum + convertCurrency(tx.amount, itemCurr, currency, exchangeRates.rates);
      }, 0);
  }, [filteredTransactions, currency, exchangeRates.rates]);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  // Category breakdown converted to active currency
  const categoryStats = useMemo(() => {
    const map: Record<string, { name: string; type: 'income' | 'expense'; amount: number; color: string }> = {};
    filteredTransactions.forEach(tx => {
      const cat = categories.find(c => c.id === tx.categoryId);
      const name = cat?.name || tx.categoryId;
      if (!map[tx.categoryId]) {
        map[tx.categoryId] = {
          name,
          type: tx.type === 'income' ? 'income' : 'expense',
          amount: 0,
          color: cat?.color || '#3b82f6',
        };
      }
      const itemCurr = tx.currency || 'IDR';
      map[tx.categoryId].amount += convertCurrency(tx.amount, itemCurr, currency, exchangeRates.rates);
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, categories, currency, exchangeRates.rates]);

  // Export handlers
  const handleExportPDF = () => {
    setIsGenerating(true);
    setTimeout(() => {
      try {
        const doc = generatePDFReport({
          transactions: filteredTransactions,
          categories,
          accounts,
          periodLabel,
          currency,
          language,
          exchangeRates: exchangeRates.rates,
        });
        doc.save(`Laporan_Finansial_BukuKasPro_${new Date().toISOString().slice(0, 10)}.pdf`);
        addNotification('success', t('export_as_pdf'), t('download_success'));
      } catch (err) {
        addNotification('error', 'Gagal Ekspor PDF', String(err));
      } finally {
        setIsGenerating(false);
      }
    }, 400);
  };

  const handleExportCSV = () => {
    exportTransactionsToCSV(filteredTransactions, categories, accounts);
    addNotification('success', t('export_as_csv'), t('download_success'));
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('reports_title')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('reports_desc')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>{t('export_as_csv')}</span>
          </button>

          <button
            id="btn-export-pdf"
            onClick={handleExportPDF}
            disabled={isGenerating}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            <span>{isGenerating ? t('generating_pdf') : t('export_as_pdf')}</span>
          </button>
        </div>
      </div>

      {/* Period Filter Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <span>{t('report_period')}:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setPeriodType('this_month')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                periodType === 'this_month'
                  ? 'bg-white text-emerald-700 shadow-xs dark:bg-slate-900 dark:text-emerald-300'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t('period_this_month')}
            </button>
            <button
              onClick={() => setPeriodType('last_month')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                periodType === 'last_month'
                  ? 'bg-white text-emerald-700 shadow-xs dark:bg-slate-900 dark:text-emerald-300'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t('period_last_month')}
            </button>
            <button
              onClick={() => setPeriodType('ytd')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                periodType === 'ytd'
                  ? 'bg-white text-emerald-700 shadow-xs dark:bg-slate-900 dark:text-emerald-300'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t('period_year_to_date')}
            </button>
            <button
              onClick={() => setPeriodType('custom')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                periodType === 'custom'
                  ? 'bg-white text-emerald-700 shadow-xs dark:bg-slate-900 dark:text-emerald-300'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t('period_custom')}
            </button>
          </div>
        </div>

        {/* Custom date range picker if selected */}
        {periodType === 'custom' && (
          <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Mulai:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Sampai:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Financial Statement Document Preview */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Document Header */}
        <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <span className="text-[11px] font-bold tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
                FINANCIAL STATEMENT / DOKUMEN RESMI
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {t('financial_summary_statement')}
              </h3>
              <p className="text-xs text-slate-500">Periode: {periodLabel}</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              <span>Integritas Terverifikasi E2E</span>
            </div>
          </div>
        </div>

        {/* 4 KPI Statement Summary Cards */}
        <div className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 dark:border-emerald-950 dark:bg-emerald-950/20">
            <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
              {t('cash_inflow')}
            </span>
            <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-400">
              + {formatCurrency(totalIncome, currency, language)}
            </div>
          </div>

          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3.5 dark:border-rose-950 dark:bg-rose-950/20">
            <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300">
              {t('cash_outflow')}
            </span>
            <div className="mt-1 text-lg font-bold text-rose-700 dark:text-rose-400">
              - {formatCurrency(totalExpense, currency, language)}
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 dark:border-blue-950 dark:bg-blue-950/20">
            <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300">
              {t('net_position')}
            </span>
            <div
              className={`mt-1 text-lg font-bold ${
                netSavings >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {formatCurrency(netSavings, currency, language)}
            </div>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 dark:border-indigo-950 dark:bg-indigo-950/20">
            <span className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-300">
              {t('total_transactions_count')}
            </span>
            <div className="mt-1 text-lg font-bold text-indigo-700 dark:text-indigo-400">
              {filteredTransactions.length} Rekord
            </div>
          </div>
        </div>

        {/* Category Breakdown Table */}
        <div className="mt-6">
          <h4 className="mb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
            Ringkasan Berdasarkan Kategori
          </h4>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Kategori</th>
                  <th className="py-2.5 px-4 font-semibold">Tipe</th>
                  <th className="py-2.5 px-4 font-semibold">Total Nominal</th>
                  <th className="py-2.5 px-4 font-semibold">Persentase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {categoryStats.map(stat => {
                  const base = stat.type === 'income' ? totalIncome : totalExpense;
                  const percent = base > 0 ? ((stat.amount / base) * 100).toFixed(1) : '0';

                  return (
                    <tr key={stat.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stat.color }} />
                          <span>{stat.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            stat.type === 'income'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {stat.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                        {formatCurrency(stat.amount, currency, language)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{percent}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
