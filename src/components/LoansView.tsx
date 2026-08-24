import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Edit2,
  Filter,
  HandCoins,
  History,
  Info,
  Layers,
  MoreVertical,
  Phone,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Tag,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../i18n/translations';
import { Loan, LoanPayment, LoanStatus, LoanType } from '../types';
import { ThousandAmountInput } from './ThousandAmountInput';

export const LoansView: React.FC = () => {
  const {
    loans,
    accounts,
    currency,
    language,
    t,
    addLoan,
    updateLoan,
    deleteLoan,
    addLoanPayment,
    settleLoanInFull,
    deleteLoanPayment,
  } = useApp();

  // Filters & Search State
  const [activeTab, setActiveTab] = useState<'all' | 'payable' | 'receivable'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid' | 'active'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'dueDate' | 'amount' | 'createdAt'>('dueDate');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [paymentModalLoan, setPaymentModalLoan] = useState<Loan | null>(null);
  const [historyModalLoan, setHistoryModalLoan] = useState<Loan | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    title: '',
    type: 'payable' as LoanType,
    personName: '',
    contactPhone: '',
    amount: '',
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    startDate: new Date().toISOString().slice(0, 10),
    notes: '',
    accountId: accounts[0]?.id || '',
    reminderDays: 3,
  });

  // Payment Form State
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    accountId: accounts[0]?.id || '',
    notes: '',
    recordTransaction: true,
  });

  // Metrics Calculations
  const metrics = useMemo(() => {
    const safeLoans = loans || [];
    const payables = safeLoans.filter(l => l.type === 'payable');
    const receivables = safeLoans.filter(l => l.type === 'receivable');

    const totalPayableAmount = payables.reduce((sum, l) => sum + l.amount, 0);
    const totalPayablePaid = payables.reduce((sum, l) => sum + l.paidAmount, 0);
    const remainingPayables = payables.reduce((sum, l) => sum + l.remainingAmount, 0);

    const totalReceivableAmount = receivables.reduce((sum, l) => sum + l.amount, 0);
    const totalReceivablePaid = receivables.reduce((sum, l) => sum + l.paidAmount, 0);
    const remainingReceivables = receivables.reduce((sum, l) => sum + l.remainingAmount, 0);

    // Net Position = What people owe me (Receivables) - What I owe people (Payables)
    const netPosition = remainingReceivables - remainingPayables;

    const overdueCount = safeLoans.filter(l => {
      if (l.status === 'paid') return false;
      const due = new Date(l.dueDate).getTime();
      return due < new Date().setHours(0, 0, 0, 0);
    }).length;

    return {
      totalPayableAmount,
      totalPayablePaid,
      remainingPayables,
      totalReceivableAmount,
      totalReceivablePaid,
      remainingReceivables,
      netPosition,
      overdueCount,
      activePayablesCount: payables.filter(l => l.status !== 'paid').length,
      activeReceivablesCount: receivables.filter(l => l.status !== 'paid').length,
    };
  }, [loans]);

  // Filtered & Sorted Loans List
  const filteredLoans = useMemo(() => {
    let list = [...(loans || [])];

    // Filter Type
    if (activeTab !== 'all') {
      list = list.filter(l => l.type === activeTab);
    }

    // Filter Status
    if (statusFilter === 'active') {
      list = list.filter(l => l.status !== 'paid');
    } else if (statusFilter !== 'all') {
      list = list.filter(l => l.status === statusFilter);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        l =>
          l.title.toLowerCase().includes(q) ||
          l.personName.toLowerCase().includes(q) ||
          (l.contactPhone && l.contactPhone.toLowerCase().includes(q)) ||
          (l.notes && l.notes.toLowerCase().includes(q))
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'dueDate') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === 'amount') {
        return b.remainingAmount - a.remainingAmount;
      }
      return b.createdAt - a.createdAt;
    });

    return list;
  }, [loans, activeTab, statusFilter, searchQuery, sortBy]);

  // Handle Open Create Modal
  const openAddModal = (defaultType: LoanType = 'payable') => {
    setFormData({
      title: '',
      type: defaultType,
      personName: '',
      contactPhone: '',
      amount: '',
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      startDate: new Date().toISOString().slice(0, 10),
      notes: '',
      accountId: accounts[0]?.id || '',
      reminderDays: 3,
    });
    setEditingLoan(null);
    setIsAddModalOpen(true);
  };

  // Handle Open Edit Modal
  const openEditModal = (loan: Loan) => {
    setFormData({
      title: loan.title,
      type: loan.type,
      personName: loan.personName,
      contactPhone: loan.contactPhone || '',
      amount: loan.amount.toString(),
      dueDate: loan.dueDate,
      startDate: loan.startDate || new Date(loan.createdAt).toISOString().slice(0, 10),
      notes: loan.notes || '',
      accountId: loan.accountId || accounts[0]?.id || '',
      reminderDays: loan.reminderDaysBefore || 3,
    });
    setEditingLoan(loan);
    setIsAddModalOpen(true);
  };

  // Submit Add / Edit
  const handleSubmitLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(formData.amount);
    if (!formData.title.trim() || !formData.personName.trim() || isNaN(numAmount) || numAmount <= 0) {
      alert('Mohon lengkapi judul, nama pihak peminjam/pemberi, dan nominal pinjaman yang valid.');
      return;
    }

    if (editingLoan) {
      const updatedRemaining = Math.max(0, numAmount - editingLoan.paidAmount);
      const newStatus: LoanStatus =
        updatedRemaining === 0 ? 'paid' : editingLoan.paidAmount > 0 ? 'partial' : 'unpaid';

      updateLoan({
        ...editingLoan,
        title: formData.title.trim(),
        type: formData.type,
        personName: formData.personName.trim(),
        contactPhone: formData.contactPhone.trim() || undefined,
        amount: numAmount,
        remainingAmount: updatedRemaining,
        status: newStatus,
        dueDate: formData.dueDate,
        startDate: formData.startDate,
        notes: formData.notes.trim() || undefined,
        accountId: formData.accountId || undefined,
        reminderDaysBefore: formData.reminderDays,
      });
    } else {
      addLoan({
        title: formData.title.trim(),
        type: formData.type,
        personName: formData.personName.trim(),
        contactPhone: formData.contactPhone.trim() || undefined,
        amount: numAmount,
        dueDate: formData.dueDate,
        startDate: formData.startDate,
        notes: formData.notes.trim() || undefined,
        accountId: formData.accountId || undefined,
        reminderDaysBefore: formData.reminderDays,
      });
    }

    setIsAddModalOpen(false);
    setEditingLoan(null);
  };

  // Handle Open Payment Modal
  const openPaymentModal = (loan: Loan, isFull = false) => {
    setPaymentModalLoan(loan);
    setPaymentFormData({
      amount: isFull ? loan.remainingAmount.toString() : '',
      paymentDate: new Date().toISOString().slice(0, 10),
      accountId: accounts[0]?.id || '',
      notes: isFull
        ? `Pelunasan 100% (${loan.type === 'payable' ? 'Hutang' : 'Piutang'})`
        : `Cicilan angsuran ke-${(loan.payments?.length || 0) + 1}`,
      recordTransaction: true,
    });
  };

  // Submit Payment
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalLoan) return;

    const numAmount = parseFloat(paymentFormData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Masukkan nominal pembayaran yang valid.');
      return;
    }

    if (numAmount > paymentModalLoan.remainingAmount) {
      alert(
        `Nominal pembayaran (${formatCurrency(numAmount, currency, language)}) tidak boleh melebihi sisa tagihan (${formatCurrency(
          paymentModalLoan.remainingAmount,
          currency,
          language
        )}).`
      );
      return;
    }

    addLoanPayment(paymentModalLoan.id, {
      amount: numAmount,
      paymentDate: paymentFormData.paymentDate,
      accountId: paymentFormData.accountId,
      notes: paymentFormData.notes,
      recordTransaction: paymentFormData.recordTransaction,
    });

    setPaymentModalLoan(null);
  };

  // Helper for due date calculation
  const getDueStatus = (dueDate: string, isPaid: boolean) => {
    if (isPaid) {
      return { label: 'Lunas 100%', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `Lewat ${Math.abs(diffDays)} Hari!`,
        color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-semibold animate-pulse',
      };
    }
    if (diffDays === 0) {
      return {
        label: 'Jatuh Tempo Hari Ini!',
        color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold',
      };
    }
    if (diffDays <= 7) {
      return {
        label: `${diffDays} hari lagi`,
        color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-900',
      };
    }
    return {
      label: `${diffDays} hari lagi`,
      color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    };
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 md:pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white shadow-md shadow-rose-500/20">
              <HandCoins className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {t('loans_title') || 'Manajemen Hutang & Piutang'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Pencatatan kewajiban hutang, hak piutang, pelunasan sebagian & lunas dengan verifikasi sisa saldo.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-add-payable"
            onClick={() => openAddModal('payable')}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-rose-600/20 transition hover:bg-rose-700 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Catat Hutang Baru</span>
          </button>
          <button
            id="btn-add-receivable"
            onClick={() => openAddModal('receivable')}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Catat Piutang Baru</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Total Hutang (Liabilities) */}
        <div className="relative overflow-hidden rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50/70 via-white to-white p-5 shadow-xs dark:border-rose-900/40 dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Kewajiban Hutang (Liabilities)
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
              <ArrowDownLeft className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Sisa Saldo Wajib Dibayar</p>
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {formatCurrency(metrics.remainingPayables, currency, language)}
            </h3>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-rose-100 pt-3 text-xs text-slate-500 dark:border-rose-900/30 dark:text-slate-400">
            <span>Total Pokok: {formatCurrency(metrics.totalPayableAmount, currency, language)}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Terbayar: {formatCurrency(metrics.totalPayablePaid, currency, language)}
            </span>
          </div>
        </div>

        {/* Card 2: Total Piutang (Assets / Receivables) */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-white p-5 shadow-xs dark:border-emerald-900/40 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Hak Piutang (Assets)
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Sisa Saldo Belum Ditagih</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(metrics.remainingReceivables, currency, language)}
            </h3>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-emerald-100 pt-3 text-xs text-slate-500 dark:border-emerald-900/30 dark:text-slate-400">
            <span>Total Pokok: {formatCurrency(metrics.totalReceivableAmount, currency, language)}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Diterima: {formatCurrency(metrics.totalReceivablePaid, currency, language)}
            </span>
          </div>
        </div>

        {/* Card 3: Net Loan Position */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:col-span-2 lg:col-span-1 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Posisi Bersih (Net Position)
            </span>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                metrics.netPosition >= 0
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
              }`}
            >
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Piutang - Hutang Sisa</p>
            <h3
              className={`text-2xl font-black ${
                metrics.netPosition >= 0
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {metrics.netPosition >= 0 ? '+' : ''}
              {formatCurrency(metrics.netPosition, currency, language)}
            </h3>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>
              {metrics.activePayablesCount} Hutang Aktif | {metrics.activeReceivablesCount} Piutang Aktif
            </span>
            {metrics.overdueCount > 0 && (
              <span className="font-bold text-rose-600 dark:text-rose-400">
                {metrics.overdueCount} Lewat Tempo!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Type Filter Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab('all')}
              className={`rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              Semua ({loans?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('payable')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition ${
                activeTab === 'payable'
                  ? 'bg-rose-600 text-white'
                  : 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40'
              }`}
            >
              <ArrowDownLeft className="h-3.5 w-3.5" />
              <span>Hutang ({loans?.filter(l => l.type === 'payable').length || 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('receivable')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition ${
                activeTab === 'receivable'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Piutang ({loans?.filter(l => l.type === 'receivable').length || 0})</span>
            </button>
          </div>

          {/* Status Quick Filters */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif (Belum Lunas & Parsial)</option>
              <option value="unpaid">Belum Dibayar (0%)</option>
              <option value="partial">Cicilan Parsial</option>
              <option value="paid">Lunas (100%)</option>
            </select>
          </div>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama orang, judul, atau kontak..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-slate-400">Urutkan:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="dueDate">Jatuh Tempo Terdekat</option>
              <option value="amount">Sisa Saldo Terbesar</option>
              <option value="createdAt">Tanggal Catat Terbaru</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loans List Grid */}
      {filteredLoans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
          <HandCoins className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
          <h3 className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">
            Tidak ada catatan hutang / piutang
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {searchQuery || statusFilter !== 'all' || activeTab !== 'all'
              ? 'Tidak ada data yang cocok dengan filter pencarian Anda.'
              : 'Mulai catat hutang kepada pihak lain atau tagihan piutang dari rekan/klien.'}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={() => openAddModal('payable')}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-rose-700"
            >
              + Catat Hutang
            </button>
            <button
              onClick={() => openAddModal('receivable')}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-emerald-700"
            >
              + Catat Piutang
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredLoans.map(loan => {
            const isPayable = loan.type === 'payable';
            const progressPercent = Math.min(100, Math.round((loan.paidAmount / loan.amount) * 100));
            const isPaid = loan.status === 'paid' || loan.remainingAmount === 0;
            const dueStatus = getDueStatus(loan.dueDate, isPaid);

            return (
              <div
                key={loan.id}
                id={`loan-card-${loan.id}`}
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 transition-all hover:shadow-md ${
                  isPaid
                    ? 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40 opacity-90'
                    : isPayable
                    ? 'border-rose-200/90 bg-white dark:border-rose-900/30 dark:bg-slate-900'
                    : 'border-emerald-200/90 bg-white dark:border-emerald-900/30 dark:bg-slate-900'
                }`}
              >
                <div>
                  {/* Top Bar: Type Badge, Due Badge, and Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${
                          isPayable
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {isPayable ? (
                          <>
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                            <span>HUTANG (Kewajiban)</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            <span>PIUTANG (Hak Tagih)</span>
                          </>
                        )}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-medium ${dueStatus.color}`}
                      >
                        <Clock className="h-3 w-3" />
                        <span>{dueStatus.label}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(loan)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        title="Ubah data pinjaman"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(loan.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                        title="Hapus data pinjaman"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Person Details */}
                  <div className="mt-3">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                      {loan.title}
                    </h4>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <User className="h-3.5 w-3.5 text-indigo-500" />
                        {isPayable ? 'Pemberi Pinjaman:' : 'Peminjam:'} {loan.personName}
                      </span>
                      {loan.contactPhone && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Phone className="h-3.5 w-3.5" />
                          {loan.contactPhone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Balance & Progress Bar */}
                  <div className="mt-4 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          Sisa Saldo
                        </span>
                        <p
                          className={`text-xl font-black ${
                            isPaid
                              ? 'text-slate-500 line-through dark:text-slate-400'
                              : isPayable
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {formatCurrency(loan.remainingAmount, currency, language)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          Total Pokok
                        </span>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {formatCurrency(loan.amount, currency, language)}
                        </p>
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] font-medium text-slate-500 mb-1">
                        <span>Terbayar: {formatCurrency(loan.paidAmount, currency, language)}</span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isPaid
                              ? 'bg-emerald-500'
                              : isPayable
                              ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                              : 'bg-gradient-to-r from-teal-500 to-emerald-500'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dates & Notes */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Jatuh Tempo: <strong className="text-slate-700 dark:text-slate-300">{loan.dueDate}</strong>
                    </span>
                    {loan.payments && loan.payments.length > 0 && (
                      <button
                        onClick={() => setHistoryModalLoan(loan)}
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
                      >
                        <History className="h-3.5 w-3.5" />
                        <span>{loan.payments.length}x Riwayat Bayar</span>
                      </button>
                    )}
                  </div>

                  {loan.notes && (
                    <p className="mt-2 text-xs text-slate-500 italic dark:text-slate-400 bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      "{loan.notes}"
                    </p>
                  )}
                </div>

                {/* Card Bottom Actions */}
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  {isPaid ? (
                    <div className="flex w-full items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Lunas Sepenuhnya (Rp 0)
                      </span>
                      {loan.payments && loan.payments.length > 0 && (
                        <button
                          onClick={() => setHistoryModalLoan(loan)}
                          className="text-xs text-indigo-600 hover:underline dark:text-indigo-400 font-medium"
                        >
                          Lihat Riwayat Pelunasan
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Partial Payment Button */}
                      <button
                        onClick={() => openPaymentModal(loan, false)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
                      >
                        <Receipt className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Bayar Cicilan</span>
                      </button>

                      {/* Full Settlement Button */}
                      <button
                        onClick={() => openPaymentModal(loan, true)}
                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-semibold text-white shadow-xs transition active:scale-95 ${
                          isPayable
                            ? 'bg-rose-600 hover:bg-rose-700'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Lunasi 100%</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT LOAN */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    formData.type === 'payable'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                  }`}
                >
                  <HandCoins className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingLoan ? 'Ubah Data Hutang / Piutang' : 'Catat Hutang / Piutang Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLoan} className="mt-4 space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Jenis Transaksi Pinjaman
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'payable' })}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition ${
                      formData.type === 'payable'
                        ? 'border-rose-600 bg-rose-50 text-rose-700 dark:border-rose-500 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                    <span>Hutang (Kewajiban)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'receivable' })}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition ${
                      formData.type === 'receivable'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span>Piutang (Hak Tagih)</span>
                  </button>
                </div>
              </div>

              {/* Title / Description */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Judul / Keperluan Pinjaman *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    formData.type === 'payable'
                      ? 'Contoh: Pinjaman Modal Usaha, Pinjam Dana Darurat'
                      : 'Contoh: Pinjaman Proyek Teman, Talangan Belanja'
                  }
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Person Name & Contact */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {formData.type === 'payable' ? 'Pemberi Pinjaman *' : 'Nama Peminjam *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Orang / Lembaga"
                    value={formData.personName}
                    onChange={e => setFormData({ ...formData, personName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No. WhatsApp / Kontak
                  </label>
                  <input
                    type="text"
                    placeholder="0812-xxxx-xxxx"
                    value={formData.contactPhone}
                    onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Total Amount with ThousandAmountInput */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nominal Pokok Pinjaman ({currency}) *
                </label>
                <ThousandAmountInput
                  value={formData.amount}
                  onChange={(val, num) => setFormData({ ...formData, amount: num.toString() })}
                  currency={currency}
                  placeholder="0"
                  required
                />
              </div>

              {/* Due Date & Start Date */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tanggal Pinjam
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tanggal Jatuh Tempo *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Catatan Tambahan / Syarat
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan perjanjian, bunga 0%, atau jadwal cicilan..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`rounded-xl px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-md transition ${
                    formData.type === 'payable'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  }`}
                >
                  {editingLoan ? 'Simpan Perubahan' : 'Simpan Data Pinjaman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD PAYMENT (PARTIAL OR FULL SETTLEMENT) */}
      {paymentModalLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {paymentModalLoan.type === 'payable' ? 'Bayar Hutang' : 'Terima Pembayaran Piutang'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {paymentModalLoan.title} ({paymentModalLoan.personName})
                </p>
              </div>
              <button
                onClick={() => setPaymentModalLoan(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Loan Status Snapshot */}
            <div className="mt-4 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Sisa Tagihan Saat Ini:</span>
                <span className="font-black text-rose-600 dark:text-rose-400">
                  {formatCurrency(paymentModalLoan.remainingAmount, currency, language)}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-xs text-slate-400">
                <span>Total Pokok: {formatCurrency(paymentModalLoan.amount, currency, language)}</span>
                <span>Sudah Masuk: {formatCurrency(paymentModalLoan.paidAmount, currency, language)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment} className="mt-4 space-y-3.5">
              {/* Payment Amount Input & Quick Buttons */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Jumlah yang Dibayarkan ({currency}) *
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Maks: {formatCurrency(paymentModalLoan.remainingAmount, currency, language)}
                  </span>
                </div>

                <ThousandAmountInput
                  value={paymentFormData.amount}
                  onChange={(val, num) => setPaymentFormData({ ...paymentFormData, amount: num.toString() })}
                  currency={currency}
                  placeholder="0"
                  required
                />

                {/* Quick Fill Buttons */}
                <div className="mt-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setPaymentFormData({
                        ...paymentFormData,
                        amount: Math.round(paymentModalLoan.remainingAmount * 0.25).toString(),
                      })
                    }
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPaymentFormData({
                        ...paymentFormData,
                        amount: Math.round(paymentModalLoan.remainingAmount * 0.5).toString(),
                      })
                    }
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPaymentFormData({
                        ...paymentFormData,
                        amount: paymentModalLoan.remainingAmount.toString(),
                      })
                    }
                    className="flex-1 rounded-lg border border-emerald-300 bg-emerald-50 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  >
                    100% (Lunas)
                  </button>
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tanggal Pembayaran *
                </label>
                <input
                  type="date"
                  required
                  value={paymentFormData.paymentDate}
                  onChange={e => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Source / Target Account */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {paymentModalLoan.type === 'payable' ? 'Bayar dari Rekening / Kas' : 'Masuk ke Rekening / Kas'}
                </label>
                <select
                  value={paymentFormData.accountId}
                  onChange={e => setPaymentFormData({ ...paymentFormData, accountId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.balance, currency, language)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Notes */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Keterangan Pembayaran
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Cicilan tahap 1, pelunasan transfer BCA"
                  value={paymentFormData.notes}
                  onChange={e => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Option to record transaction in ledger */}
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800">
                <input
                  type="checkbox"
                  id="recordTxCheck"
                  checked={paymentFormData.recordTransaction}
                  onChange={e =>
                    setPaymentFormData({ ...paymentFormData, recordTransaction: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="recordTxCheck" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  Otomatis catat transaksi di pembukuan (potong/tambah saldo kas)
                </label>
              </div>

              {/* Verification Preview */}
              {paymentFormData.amount && parseFloat(paymentFormData.amount) > 0 && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs dark:border-indigo-900/40 dark:bg-indigo-950/30">
                  <div className="flex justify-between font-medium text-slate-700 dark:text-slate-300">
                    <span>Sisa Saldo Setelah Bayar:</span>
                    <span className="font-bold text-indigo-700 dark:text-indigo-300">
                      {formatCurrency(
                        Math.max(0, paymentModalLoan.remainingAmount - parseFloat(paymentFormData.amount || '0')),
                        currency,
                        language
                      )}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                    <span>Status Baru:</span>
                    <span className="font-bold">
                      {parseFloat(paymentFormData.amount || '0') >= paymentModalLoan.remainingAmount
                        ? '🎉 LUNAS (Paid 100%)'
                        : '💵 SEBAGIAN (Partial)'}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentModalLoan(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700"
                >
                  Konfirmasi Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PAYMENT HISTORY MODAL */}
      {historyModalLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Riwayat Cicilan & Pelunasan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {historyModalLoan.title} ({historyModalLoan.personName})
                </p>
              </div>
              <button
                onClick={() => setHistoryModalLoan(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto space-y-2.5">
              {!historyModalLoan.payments || historyModalLoan.payments.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">Belum ada catatan cicilan yang masuk.</p>
              ) : (
                historyModalLoan.payments.map((pmt, idx) => (
                  <div
                    key={pmt.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/60"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(pmt.amount, currency, language)}
                        </span>
                        <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {pmt.paymentDate}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {pmt.accountName || 'Kas'} - {pmt.notes || 'Pembayaran cicilan'}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`Batalkan pembayaran sebesar ${formatCurrency(pmt.amount, currency, language)}?`)) {
                          deleteLoanPayment(historyModalLoan.id, pmt.id);
                          setHistoryModalLoan(null);
                        }
                      }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      title="Batalkan cicilan ini"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                onClick={() => setHistoryModalLoan(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-slate-900"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE CONFIRMATION */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Hapus Data Pinjaman</h4>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
              Apakah Anda yakin ingin menghapus data pinjaman ini beserta seluruh riwayat cicilannya?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  deleteLoan(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
