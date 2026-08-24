import { BankAccount, BillReminder, Category, Loan, Transaction } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-salary', name: 'Gaji & Pendapatan', type: 'income', icon: 'Briefcase', color: '#10b981', budgetLimit: 0 },
  { id: 'cat-freelance', name: 'Freelance & Bisnis', type: 'income', icon: 'Laptop', color: '#06b6d4', budgetLimit: 0 },
  { id: 'cat-invest-in', name: 'Dividen & Investasi', type: 'income', icon: 'TrendingUp', color: '#8b5cf6', budgetLimit: 0 },
  { id: 'cat-food', name: 'Makanan & Minuman', type: 'expense', icon: 'Utensils', color: '#f59e0b', budgetLimit: 3000000 },
  { id: 'cat-shopping', name: 'Belanja & Kebutuhan', type: 'expense', icon: 'ShoppingBag', color: '#ec4899', budgetLimit: 2000000 },
  { id: 'cat-transport', name: 'Transportasi & Bensin', type: 'expense', icon: 'Car', color: '#3b82f6', budgetLimit: 1200000 },
  { id: 'cat-bills', name: 'Tagihan & Utilitas', type: 'expense', icon: 'Zap', color: '#ef4444', budgetLimit: 1500000 },
  { id: 'cat-entertainment', name: 'Hiburan & Liburan', type: 'expense', icon: 'Film', color: '#a855f7', budgetLimit: 1000000 },
  { id: 'cat-health', name: 'Kesehatan & Medis', type: 'expense', icon: 'HeartPulse', color: '#14b8a6', budgetLimit: 800000 },
  { id: 'cat-education', name: 'Pendidikan & Buku', type: 'expense', icon: 'BookOpen', color: '#6366f1', budgetLimit: 500000 },
];

export const INITIAL_ACCOUNTS: BankAccount[] = [
  { id: 'acc-cash', name: 'Tunai / Cash', type: 'cash', balance: 0, currency: 'IDR', color: '#64748b', icon: 'Banknote' },
  { id: 'acc-bank', name: 'Transfer Bank', type: 'bank', balance: 0, currency: 'IDR', color: '#00529C', icon: 'Landmark' },
  { id: 'acc-qris', name: 'QRIS', type: 'ewallet', balance: 0, currency: 'IDR', color: '#00AA13', icon: 'QrCode' },
  { id: 'acc-ewallet', name: 'E-Wallet', type: 'ewallet', balance: 0, currency: 'IDR', color: '#8b5cf6', icon: 'Wallet' },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  // Transaksi kosong — user baru mulai dari nol.
  // Kategori default tetap tersedia untuk digunakan.
];

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = String(today.getMonth() + 1).padStart(2, '0');

export const INITIAL_BILLS: BillReminder[] = [
  {
    id: 'bill-1',
    title: 'Internet WiFi IndiHome Fiber 100 Mbps',
    amount: 475000,
    dueDate: `${currentYear}-${currentMonth}-22`,
    categoryId: 'cat-bills',
    accountId: 'acc-bank',
    recurrence: 'monthly',
    isPaid: false,
    autoDebit: true,
    reminderDaysBefore: 3,
    providerName: 'Telkom IndiHome',
    accountNumber: '1229381923',
    notes: 'Batas akhir pembayaran tgl 22 setiap bulan',
  },
  {
    id: 'bill-2',
    title: 'BPJS Kesehatan Keluarga',
    amount: 300000,
    dueDate: `${currentYear}-${currentMonth}-25`,
    categoryId: 'cat-health',
    accountId: 'acc-bank',
    recurrence: 'monthly',
    isPaid: false,
    autoDebit: false,
    reminderDaysBefore: 2,
    providerName: 'BPJS Kesehatan',
    accountNumber: '000192837482',
    notes: 'Kelas 1 untuk 2 anggota keluarga',
  },
  {
    id: 'bill-3',
    title: 'Sewa Apartemen / Maintenance Fee',
    amount: 1800000,
    dueDate: `${currentYear}-${currentMonth}-28`,
    categoryId: 'cat-bills',
    accountId: 'acc-bank',
    recurrence: 'monthly',
    isPaid: false,
    autoDebit: false,
    reminderDaysBefore: 5,
    providerName: 'Pengelola Tower A',
    accountNumber: 'APT-A-1204',
    notes: 'Iuran Pengelolaan Lingkungan (IPL) & sinking fund',
  },
];

export const INITIAL_LOANS: Loan[] = [];
