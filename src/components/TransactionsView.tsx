import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  Coins,
  Download,
  Edit2,
  FileText,
  Filter,
  Globe,
  Image as ImageIcon,
  Plus,
  Receipt,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { currencySymbols, formatCurrency } from '../i18n/translations';
import { Currency, Transaction, TransactionType } from '../types';
import { exportTransactionsToCSV } from '../utils/csvExport';
import { convertCurrency, convertToIdr } from '../utils/exchangeRates';
import { IconHelper } from './IconHelper';

export const TransactionsView: React.FC = () => {
  const {
    t,
    transactions,
    categories,
    accounts,
    deleteTransaction,
    setEditingTransaction,
    setIsAddTransactionOpen,
    currency,
    language,
    exchangeRates,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterCurrency, setFilterCurrency] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all'); // all, this_month, last_month
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, '0');

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchNotes = (t.notes || '').toLowerCase().includes(q);
        const matchAmount = t.amount.toString().includes(q);
        if (!matchTitle && !matchNotes && !matchAmount) return false;
      }

      // Type
      if (filterType !== 'all' && t.type !== filterType) return false;

      // Category
      if (filterCategory !== 'all' && t.categoryId !== filterCategory) return false;

      // Account
      if (filterAccount !== 'all' && t.accountId !== filterAccount && t.toAccountId !== filterAccount) return false;

      // Currency
      if (filterCurrency !== 'all') {
        const itemCurr = t.currency || currency;
        if (itemCurr !== filterCurrency) return false;
      }

      // Date Range
      if (filterDateRange === 'this_month') {
        if (!t.date.startsWith(`${currentYear}-${currentMonthStr}`)) return false;
      }

      return true;
    });
  }, [transactions, searchQuery, filterType, filterCategory, filterAccount, filterCurrency, filterDateRange, currentYear, currentMonthStr, currency]);

  // Summaries of filtered transactions converted to active currency and IDR
  const summary = useMemo(() => {
    let totalIncomeConverted = 0;
    let totalIncomeIdr = 0;
    let totalExpenseConverted = 0;
    let totalExpenseIdr = 0;

    filteredTransactions.forEach(t => {
      const itemCurr = t.currency || 'IDR';
      const convertedVal = convertCurrency(t.amount, itemCurr, currency, exchangeRates.rates);
      const idrVal = convertToIdr(t.amount, itemCurr, exchangeRates.rates);

      if (t.type === 'income') {
        totalIncomeConverted += convertedVal;
        totalIncomeIdr += idrVal;
      } else if (t.type === 'expense') {
        totalExpenseConverted += convertedVal;
        totalExpenseIdr += idrVal;
      }
    });

    return {
      incomeNative: totalIncomeConverted,
      incomeIdr: totalIncomeIdr,
      expenseNative: totalExpenseConverted,
      expenseIdr: totalExpenseIdr,
      netNative: totalIncomeConverted - totalExpenseConverted,
      netIdr: totalIncomeIdr - totalExpenseIdr,
    };
  }, [filteredTransactions, currency, exchangeRates.rates]);

  const handleExportCSV = () => {
    exportTransactionsToCSV(filteredTransactions, categories, accounts);
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsAddTransactionOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('confirm_delete_tx'))) {
      deleteTransaction(id);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('nav_transactions')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {filteredTransactions.length} transaksi tercatat | Multi-Mata Uang & Rincian Rupiah (IDR)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Download className="h-4 w-4" />
            <span>Ekspor CSV</span>
          </button>

          <button
            id="btn-add-tx-view"
            onClick={() => {
              setEditingTransaction(null);
              setIsAddTransactionOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            <span>{t('add_transaction')}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Mini-Bar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Income Card */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5 dark:border-emerald-950 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-800 dark:text-emerald-300">
            <span>Total Pemasukan</span>
            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1 font-bold text-emerald-600 text-base dark:text-emerald-400">
            + {formatCurrency(summary.incomeNative, currency, language)}
          </div>
          {currency !== 'IDR' && (
            <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              ({formatCurrency(summary.incomeIdr, 'IDR', language)})
            </div>
          )}
        </div>

        {/* Expense Card */}
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-3.5 dark:border-rose-950 dark:bg-rose-950/20">
          <div className="flex items-center justify-between text-xs font-medium text-rose-800 dark:text-rose-300">
            <span>Total Pengeluaran</span>
            <ArrowDownRight className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-1 font-bold text-rose-600 text-base dark:text-rose-400">
            - {formatCurrency(summary.expenseNative, currency, language)}
          </div>
          {currency !== 'IDR' && (
            <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
              ({formatCurrency(summary.expenseIdr, 'IDR', language)})
            </div>
          )}
        </div>

        {/* Net Flow */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Saldo Bersih (Net)</span>
            <Coins className="h-4 w-4 text-emerald-500" />
          </div>
          <div
            className={`mt-1 font-bold text-base ${
              summary.netNative >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {formatCurrency(summary.netNative, currency, language)}
          </div>
          {currency !== 'IDR' && (
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              ({formatCurrency(summary.netIdr, 'IDR', language)})
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
          {/* Search Input */}
          <div className="relative md:col-span-1">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pr-3 pl-9 text-xs text-slate-900 outline-hidden focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Filter Type */}
          <div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="all">Semua Tipe</option>
              <option value="income">Pemasukan (+)</option>
              <option value="expense">Pengeluaran (-)</option>
              <option value="transfer">Transfer (↔)</option>
            </select>
          </div>

          {/* Filter Category */}
          <div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="all">Semua Kategori</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Account */}
          <div>
            <select
              value={filterAccount}
              onChange={e => setFilterAccount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="all">Semua Rekening</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Currency */}
          <div>
            <select
              value={filterCurrency}
              onChange={e => setFilterCurrency(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="all">Semua Mata Uang</option>
              <option value="IDR">🇮🇩 Rupiah (IDR)</option>
              <option value="NZD">🇳🇿 New Zealand Dollar (NZD)</option>
              <option value="USD">🇺🇸 US Dollar (USD)</option>
              <option value="SGD">🇸🇬 Singapore Dollar (SGD)</option>
              <option value="AUD">🇦🇺 Australian Dollar (AUD)</option>
              <option value="EUR">🇪🇺 Euro (EUR)</option>
              <option value="GBP">🇬🇧 British Pound (GBP)</option>
              <option value="JPY">🇯🇵 Japanese Yen (JPY)</option>
              <option value="MYR">🇲🇾 Malaysian Ringgit (MYR)</option>
              <option value="HKD">🇭🇰 Hong Kong Dollar (HKD)</option>
              <option value="TWD">🇹🇼 New Taiwan Dollar (TWD)</option>
              <option value="BGN">🇧🇬 Bulgarian Lev (BGN)</option>
              <option value="KRW">🇰🇷 South Korean Won (KRW)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <Receipt className="mb-2 h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tidak ada transaksi ditemukan</p>
            <p className="mt-1 text-xs">Coba sesuaikan kata kunci pencarian atau filter Anda.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTransactions.map(tx => {
              const cat = categories.find(c => c.id === tx.categoryId);
              const acc = accounts.find(a => a.id === tx.accountId);
              const toAcc = tx.toAccountId ? accounts.find(a => a.id === tx.toAccountId) : null;
              const isIncome = tx.type === 'income';
              const isTransfer = tx.type === 'transfer';
              const txCurr = tx.currency || currency;
              const isTxIdr = txCurr === 'IDR';
              const idrVal = convertToIdr(tx.amount, txCurr, exchangeRates.rates);

              return (
                <div
                  key={tx.id}
                  className="flex flex-col justify-between gap-3 p-4 transition hover:bg-slate-50/70 sm:flex-row sm:items-center dark:hover:bg-slate-800/40"
                >
                  {/* Left info */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-2xs"
                      style={{ backgroundColor: cat?.color || '#10b981' }}
                    >
                      <IconHelper name={cat?.icon || 'DollarSign'} className="h-5 w-5 text-white" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {tx.title}
                        </span>
                        {/* Currency Pill */}
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {txCurr}
                        </span>
                        {tx.receiptUrl && (
                          <button
                            onClick={() => setPreviewReceiptUrl(tx.receiptUrl || null)}
                            className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                            title="Lihat Bukti Struk"
                          >
                            <ImageIcon className="h-3 w-3" />
                            <span>Struk</span>
                          </button>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>{tx.date} {tx.time || ''}</span>
                        <span>•</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {cat?.name || 'Kategori'}
                        </span>
                        <span>•</span>
                        <span>
                          {acc?.name || 'Rekening'}
                          {isTransfer && toAcc && ` ➔ ${toAcc.name}`}
                        </span>
                      </div>

                      {tx.notes && (
                        <p className="mt-1 text-xs text-slate-400 italic dark:text-slate-500">
                          "{tx.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Amount & Actions */}
                  <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-center">
                    <div className="text-right">
                      <div
                        className={`text-base font-extrabold tracking-tight ${
                          isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isTransfer
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isIncome ? '+ ' : isTransfer ? '↔ ' : '- '}
                        {formatCurrency(tx.amount, txCurr, language)}
                      </div>

                      {/* Explicit Rupiah Equivalent per item */}
                      {!isTxIdr && (
                        <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          ({formatCurrency(idrVal, 'IDR', language)})
                        </div>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(tx)}
                        className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        title={t('edit')}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                        title={t('delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Receipt Preview Modal */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-xs">
          <div className="relative max-w-lg rounded-2xl bg-white p-4 dark:bg-slate-900">
            <button
              onClick={() => setPreviewReceiptUrl(null)}
              className="absolute top-3 right-3 rounded-full bg-slate-100 p-1.5 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
            <h4 className="mb-2 text-sm font-bold text-slate-900 dark:text-white">Bukti Struk Transaksi</h4>
            <img src={previewReceiptUrl} alt="Receipt" className="max-h-96 w-full rounded-xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};
