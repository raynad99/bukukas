import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../i18n/translations';
import { BillReminder } from '../types';
import { convertCurrency } from '../utils/exchangeRates';
import { IconHelper } from './IconHelper';
import { ThousandAmountInput } from './ThousandAmountInput';

export const BillsView: React.FC = () => {
  const {
    t,
    bills,
    categories,
    accounts,
    addBill,
    updateBill,
    deleteBill,
    toggleBillPaid,
    currency,
    language,
    exchangeRates,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillReminder | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [recurrence, setRecurrence] = useState<'once' | 'monthly' | 'weekly' | 'yearly'>('monthly');
  const [autoDebit, setAutoDebit] = useState(false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(3);
  const [providerName, setProviderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [notes, setNotes] = useState('');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate bill due status
  const getDueStatus = (dueDateStr: string, isPaid: boolean) => {
    if (isPaid) return { text: t('paid_status'), color: 'emerald', days: 0 };
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { text: t('due_today'), color: 'rose', days: 0 };
    if (diffDays < 0) return { text: t('overdue_by', { days: Math.abs(diffDays) }), color: 'rose', days: diffDays };
    if (diffDays <= 3) return { text: t('due_in_days', { days: diffDays }), color: 'amber', days: diffDays };
    return { text: t('due_in_days', { days: diffDays }), color: 'blue', days: diffDays };
  };

  const unpaidTotal = useMemo(() => {
    return bills
      .filter(b => !b.isPaid)
      .reduce((sum, b) => {
        const itemCurr = (b as any).currency || 'IDR';
        return sum + convertCurrency(b.amount, itemCurr, currency, exchangeRates.rates);
      }, 0);
  }, [bills, currency, exchangeRates.rates]);

  const paidThisMonthTotal = useMemo(() => {
    return bills
      .filter(b => b.isPaid)
      .reduce((sum, b) => {
        const itemCurr = (b as any).currency || 'IDR';
        return sum + convertCurrency(b.amount, itemCurr, currency, exchangeRates.rates);
      }, 0);
  }, [bills, currency, exchangeRates.rates]);

  const handleOpenAdd = () => {
    setEditingBill(null);
    setTitle('');
    setAmount('');
    setDueDate(new Date().toISOString().slice(0, 10));
    setCategoryId(categories.find(c => c.type === 'expense')?.id || '');
    setAccountId(accounts[0]?.id || '');
    setRecurrence('monthly');
    setAutoDebit(false);
    setReminderDaysBefore(3);
    setProviderName('');
    setAccountNumber('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (bill: BillReminder) => {
    setEditingBill(bill);
    setTitle(bill.title);
    setAmount(bill.amount.toString());
    setDueDate(bill.dueDate);
    setCategoryId(bill.categoryId);
    setAccountId(bill.accountId || accounts[0]?.id || '');
    setRecurrence(bill.recurrence);
    setAutoDebit(bill.autoDebit);
    setReminderDaysBefore(bill.reminderDaysBefore);
    setProviderName(bill.providerName || '');
    setAccountNumber(bill.accountNumber || '');
    setNotes(bill.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!title.trim() || isNaN(numAmount) || numAmount <= 0) return;

    if (editingBill) {
      updateBill({
        ...editingBill,
        title: title.trim(),
        amount: numAmount,
        dueDate,
        categoryId: categoryId || categories[0]?.id || 'cat-bills',
        accountId: accountId || accounts[0]?.id,
        recurrence,
        autoDebit,
        reminderDaysBefore,
        providerName: providerName.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      addBill({
        title: title.trim(),
        amount: numAmount,
        dueDate,
        categoryId: categoryId || categories[0]?.id || 'cat-bills',
        accountId: accountId || accounts[0]?.id,
        recurrence,
        isPaid: false,
        autoDebit,
        reminderDaysBefore,
        providerName: providerName.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    }

    setIsModalOpen(false);
    setEditingBill(null);
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12">
      {/* View Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('bills_title')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('bills_desc')}
          </p>
        </div>

        <button
          id="btn-add-bill"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          <span>{t('add_bill')}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4.5 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              {t('total_unpaid_bills')}
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white">
              <CalendarClock className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-amber-900 dark:text-amber-200">
            {formatCurrency(unpaidTotal, currency, language)}
          </div>
          <div className="mt-1 text-xs text-amber-700/80 dark:text-amber-400/80">
            {bills.filter(b => !b.isPaid).length} tagihan belum dibayar
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              {t('paid_this_month')}
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-900 dark:text-emerald-200">
            {formatCurrency(paidThisMonthTotal, currency, language)}
          </div>
          <div className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400/80">
            {bills.filter(b => b.isPaid).length} tagihan sudah lunas
          </div>
        </div>
      </div>

      {/* Bills Cards List */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">
          Daftar Tagihan & Langganan Rutin
        </h3>

        {bills.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <CalendarClock className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-xs">Belum ada pengingat tagihan. Tambahkan tagihan WiFi, listrik, atau sewa Anda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
            {bills.map(bill => {
              const status = getDueStatus(bill.dueDate, bill.isPaid);
              const cat = categories.find(c => c.id === bill.categoryId);
              const acc = accounts.find(a => a.id === bill.accountId);

              return (
                <div
                  key={bill.id}
                  className={`flex flex-col justify-between rounded-xl border p-4 transition ${
                    bill.isPaid
                      ? 'border-slate-200/60 bg-slate-50/60 dark:border-slate-800/60 dark:bg-slate-850/40 opacity-80'
                      : status.color === 'rose'
                      ? 'border-rose-200 bg-rose-50/30 dark:border-rose-900/50 dark:bg-rose-950/20'
                      : 'border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div>
                    {/* Header: Title & Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs"
                          style={{ backgroundColor: cat?.color || '#3b82f6' }}
                        >
                          <IconHelper name={cat?.icon || 'Zap'} className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {bill.title}
                          </h4>
                          {bill.providerName && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {bill.providerName} {bill.accountNumber ? `(${bill.accountNumber})` : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          bill.isPaid
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : status.color === 'rose'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : status.color === 'amber'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {status.text}
                      </span>
                    </div>

                    {/* Amount & Due Date */}
                    <div className="my-3 flex items-center justify-between rounded-xl bg-slate-50/80 p-3 dark:bg-slate-800/60">
                      <div>
                        <span className="text-[11px] text-slate-400">Nominal:</span>
                        <div className="text-base font-extrabold text-slate-900 dark:text-white">
                          {formatCurrency(
                            convertCurrency(bill.amount, (bill as any).currency || 'IDR', currency, exchangeRates.rates),
                            currency,
                            language
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-slate-400">Jatuh Tempo:</span>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {bill.dueDate}
                        </div>
                      </div>
                    </div>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium dark:bg-slate-800">
                        {bill.recurrence === 'monthly'
                          ? 'Bulanan'
                          : bill.recurrence === 'weekly'
                          ? 'Mingguan'
                          : bill.recurrence === 'yearly'
                          ? 'Tahunan'
                          : 'Sekali Bayar'}
                      </span>
                      {bill.autoDebit && (
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          Auto-Debit {acc?.name ? `(${acc.name})` : ''}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Bell className="h-3 w-3 text-slate-400" />
                        <span>H-{bill.reminderDaysBefore}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(bill)}
                        className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                        title={t('edit')}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteBill(bill.id)}
                        className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                        title={t('delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Mark as paid button */}
                    <button
                      onClick={() => toggleBillPaid(bill.id, !bill.isPaid)}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        bill.isPaid
                          ? 'border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300'
                          : 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-500'
                      }`}
                    >
                      {bill.isPaid ? (
                        <>
                          <RefreshCw className="h-3 w-3" />
                          <span>{t('mark_as_unpaid')}</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>{t('mark_as_paid')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Bill Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingBill ? 'Ubah Pengingat Tagihan' : t('add_bill')}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('bill_name')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: WiFi IndiHome, Listrik PLN, BPJS"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-hidden focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('bill_amount')}
                </label>
                <ThousandAmountInput
                  id="bill-amount-input"
                  value={amount}
                  onChange={(val) => setAmount(val)}
                  currency={currency}
                  placeholder="0"
                  required
                  showQuickChips={true}
                  showSpelledOut={true}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('bill_due_date')}
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-hidden focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('bill_recurrence')}
                  </label>
                  <select
                    value={recurrence}
                    onChange={e => setRecurrence(e.target.value as 'monthly')}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="monthly">{t('recurrence_monthly')}</option>
                    <option value="weekly">{t('recurrence_weekly')}</option>
                    <option value="yearly">{t('recurrence_yearly')}</option>
                    <option value="once">{t('recurrence_once')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('reminder_lead_time')}
                  </label>
                  <select
                    value={reminderDaysBefore}
                    onChange={e => setReminderDaysBefore(parseInt(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="1">1 hari sebelumnya</option>
                    <option value="2">2 hari sebelumnya</option>
                    <option value="3">3 hari sebelumnya</option>
                    <option value="5">5 hari sebelumnya</option>
                    <option value="7">7 hari sebelumnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('transaction_category')}
                </label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Penyedia / Vendor (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Telkom, PLN"
                    value={providerName}
                    onChange={e => setProviderName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No. Pelanggan / Tagihan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 1229381923"
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoDebitCheck"
                  checked={autoDebit}
                  onChange={e => setAutoDebit(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="autoDebitCheck" className="text-xs text-slate-700 dark:text-slate-300">
                  {t('auto_debit')} (Debet otomatis dari rekening)
                </label>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
