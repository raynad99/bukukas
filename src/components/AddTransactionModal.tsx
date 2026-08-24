import React, { useEffect, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  Calendar,
  Clock,
  Coins,
  FileText,
  Globe,
  Image,
  RefreshCw,
  Sparkles,
  Tag,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { currencySymbols, formatCurrency } from '../i18n/translations';
import { Currency, TransactionType } from '../types';
import { convertToIdr } from '../utils/exchangeRates';
import { IconHelper } from './IconHelper';
import { ThousandAmountInput } from './ThousandAmountInput';

// Helper to get exact local date in YYYY-MM-DD format
const getLocalNowDate = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to get exact local time in HH:mm 24h format
const getLocalNowTime = (): string => {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const AddTransactionModal: React.FC = () => {
  const {
    t,
    currency,
    language,
    exchangeRates,
    isAddTransactionOpen,
    setIsAddTransactionOpen,
    editingTransaction,
    setEditingTransaction,
    addTransaction,
    updateTransaction,
    categories,
    accounts,
  } = useApp();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [txCurrency, setTxCurrency] = useState<Currency>(currency);
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [date, setDate] = useState(getLocalNowDate());
  const [time, setTime] = useState(getLocalNowTime());
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(undefined);

  const selectedCurrencyMeta = currencySymbols[txCurrency] || { symbol: 'Rp', name: 'IDR' };

  // Sync when opening or editing - ALWAYS fresh real-time date/time when creating new
  useEffect(() => {
    if (editingTransaction) {
      setTitle(editingTransaction.title);
      setAmount(editingTransaction.amount.toString());
      setTxCurrency(editingTransaction.currency || currency);
      setType(editingTransaction.type);
      setCategoryId(editingTransaction.categoryId);
      setAccountId(editingTransaction.accountId);
      setToAccountId(editingTransaction.toAccountId || '');
      setDate(editingTransaction.date);
      setTime(editingTransaction.time || getLocalNowTime());
      setNotes(editingTransaction.notes || '');
      setReceiptUrl(editingTransaction.receiptUrl);
    } else {
      setTitle('');
      setAmount('');
      setTxCurrency(currency);
      setType('expense');
      // REAL-TIME LOCAL DATE & TIME BY DEFAULT
      setDate(getLocalNowDate());
      setTime(getLocalNowTime());
      setNotes('');
      setReceiptUrl(undefined);
      if (categories.length > 0) {
        const defaultCat = categories.find(c => c.type === 'expense') || categories[0];
        setCategoryId(defaultCat.id);
      }
      if (accounts.length > 0) {
        setAccountId(accounts[0].id);
        if (accounts.length > 1) setToAccountId(accounts[1].id);
      }
    }
  }, [editingTransaction, isAddTransactionOpen, categories, accounts, currency]);

  // Adjust default category when type changes
  useEffect(() => {
    if (!editingTransaction) {
      const matchCat = categories.find(c => c.type === type);
      if (matchCat) setCategoryId(matchCat.id);
    }
  }, [type, categories, editingTransaction]);

  if (!isAddTransactionOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const idrEquivalent = numAmount > 0 ? convertToIdr(numAmount, txCurrency, exchangeRates.rates) : 0;
  const rateToIdr = exchangeRates.rates['IDR'] / (exchangeRates.rates[txCurrency] || 1);

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSetToRealTimeNow = () => {
    setDate(getLocalNowDate());
    setTime(getLocalNowTime());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isNaN(numAmount) || numAmount <= 0) return;

    if (editingTransaction) {
      updateTransaction({
        ...editingTransaction,
        title: title.trim(),
        amount: numAmount,
        currency: txCurrency,
        type,
        categoryId: type === 'transfer' ? categories[0]?.id || 'cat-transfer' : categoryId,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        date,
        time,
        notes: notes.trim() || undefined,
        receiptUrl,
      });
    } else {
      addTransaction({
        title: title.trim(),
        amount: numAmount,
        currency: txCurrency,
        type,
        categoryId: type === 'transfer' ? categories[0]?.id || 'cat-transfer' : categoryId,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        date,
        time,
        notes: notes.trim() || undefined,
        receiptUrl,
      });
    }

    setIsAddTransactionOpen(false);
    setEditingTransaction(null);
  };

  const filteredCategories = categories.filter(c => c.type === type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingTransaction ? t('edit_transaction') : t('add_transaction')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dukungan multi-mata uang dengan konversi Rupiah real-time
            </p>
          </div>
          <button
            onClick={() => {
              setIsAddTransactionOpen(false);
              setEditingTransaction(null);
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Type Segment Control */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                type === 'expense'
                  ? 'bg-white text-rose-600 shadow-xs dark:bg-slate-900 dark:text-rose-400'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <ArrowDownRight className="h-3.5 w-3.5" />
              <span>{t('expense')}</span>
            </button>

            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                type === 'income'
                  ? 'bg-white text-emerald-600 shadow-xs dark:bg-slate-900 dark:text-emerald-400'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>{t('income')}</span>
            </button>

          </div>

          {/* Multi-Currency & Amount Input Row */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('transaction_amount')}
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-400">Mata Uang:</span>
                <select
                  value={txCurrency}
                  onChange={e => setTxCurrency(e.target.value as Currency)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-400"
                >
                  <option value="IDR">🇮🇩 IDR (Rp)</option>
                  <option value="NZD">🇳🇿 NZD (NZ$)</option>
                  <option value="USD">🇺🇸 USD ($)</option>
                  <option value="SGD">🇸🇬 SGD (S$)</option>
                  <option value="AUD">🇦🇺 AUD (A$)</option>
                  <option value="EUR">🇪🇺 EUR (€)</option>
                  <option value="GBP">🇬🇧 GBP (£)</option>
                  <option value="JPY">🇯🇵 JPY (¥)</option>
                  <option value="MYR">🇲🇾 MYR (RM)</option>
                  <option value="HKD">🇭🇰 HKD (HK$)</option>
                  <option value="TWD">🇹🇼 TWD (NT$)</option>
                  <option value="BGN">🇧🇬 BGN (лв)</option>
                  <option value="KRW">🇰🇷 KRW (₩)</option>            </select>
          </div>

            <ThousandAmountInput
              id="transaction-amount-input"
              value={amount}
              onChange={(val) => setAmount(val)}
              currency={txCurrency}
              placeholder="0"
              required
              showQuickChips={true}
              showSpelledOut={true}
            />

            {/* Live Real-time Rupiah preview */}
            {txCurrency !== 'IDR' && numAmount > 0 && (
              <div className="mt-2 flex items-center justify-between rounded-xl bg-emerald-50/80 px-3 py-2 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                <span className="flex items-center gap-1 font-medium">
                  <Coins className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Nilai Rupiah:</span>
                </span>
                <span className="font-extrabold text-sm">
                  {formatCurrency(idrEquivalent, 'IDR', language)}
                </span>
              </div>
            )}
            {txCurrency !== 'IDR' && (
              <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                Kurs Acuan: 1 {txCurrency} = {formatCurrency(rateToIdr, 'IDR', language)}
              </p>
            )}
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('transaction_title')}
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Belanja Bulanan, Gaji NZ, Makan Siang"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-hidden focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Category Picker (if not transfer) */}
          {type !== 'transfer' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('transaction_category')}
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                {filteredCategories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex items-center gap-2 rounded-xl border p-2 text-left text-xs transition ${
                      categoryId === cat.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-white"
                      style={{ backgroundColor: cat.color }}
                    >
                      <IconHelper name={cat.icon} className="h-3 w-3 text-white" />
                    </div>
                    <span className="truncate font-medium">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Account Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Dompet / Rekening Simpanan
            </label>
            <select
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
          </div>

          {/* Date & Time (Real-Time Default) */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Clock className="h-3.5 w-3.5 text-emerald-500" />
                <span>Tanggal & Waktu Transaksi</span>
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Real-Time
                </span>
              </div>
              <button
                type="button"
                onClick={handleSetToRealTimeNow}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Set ke Sekarang</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {t('transaction_date')}
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {t('transaction_time')} (24 Jam)
                </label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Notes & Receipt */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('transaction_notes')}
            </label>
            <input
              type="text"
              placeholder="Catatan tambahan..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Receipt Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('transaction_receipt')}
            </label>
            <div className="mt-1 flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                <Upload className="h-4 w-4 text-emerald-600" />
                <span>{receiptUrl ? 'Ganti Bukti Struk' : t('upload_receipt')}</span>
                <input type="file" accept="image/*" onChange={handleReceiptUpload} className="hidden" />
              </label>
              {receiptUrl && (
                <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-slate-200">
                  <img src={receiptUrl} alt="Receipt Preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setReceiptUrl(undefined)}
                    className="absolute top-0 right-0 bg-rose-500 p-0.5 text-white"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsAddTransactionOpen(false);
                setEditingTransaction(null);
              }}
              className="w-1/2 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="w-1/2 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
            >
              {editingTransaction ? t('edit_transaction') : t('save_transaction')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
