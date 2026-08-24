export type Language = 'id' | 'en' | 'ja' | 'es' | 'ar';

export type Currency =
  | 'IDR'
  | 'USD'
  | 'EUR'
  | 'JPY'
  | 'SGD'
  | 'GBP'
  | 'NZD'
  | 'AUD'
  | 'MYR'
  | 'HKD'
  | 'TWD'
  | 'BGN'
  | 'KRW';

export interface ExchangeRateData {
  base: Currency;
  rates: Record<Currency, number>;
  lastUpdated: string;
  isLive: boolean;
  source: string;
}

export type Theme = 'light' | 'dark' | 'system';

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  budgetLimit?: number; // Monthly budget limit
}

export type SubscriptionPlan = 'trial' | 'paid' | 'lifetime';
export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  password?: string;
  photoUrl?: string;
  provider: 'gmail' | 'password' | 'demo';
  isVerified: boolean;
  role: UserRole; // 'admin' for Dev / Superadmin, 'user' for regular users
  plan: SubscriptionPlan; // 'trial' (7 days), 'paid' (yearly / 1 year), 'lifetime' (unlimited access)
  trialStartDate?: string; // ISO date string
  trialExpiresDate?: string; // ISO date string (+7 days)
  paidExpiresDate?: string; // ISO date string (+1 year / 365 days)
  registeredSelf: boolean; // true if self-registered by user, false if created by Dev
  status?: 'active' | 'trial' | 'expired' | 'suspended';
  customNotes?: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface BusinessInboxMessage {
  id: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  subject: string;
  message: string;
  sentAt: string;
  isRead: boolean;
  category: 'inquiry' | 'support' | 'customization' | 'billing' | 'license' | 'other';
  reply?: string;
  repliedAt?: string;
  aiSuggestedReply?: string;
  source?: 'in-app' | 'gmail-web' | 'inbound-webhook' | 'api-simulator';
}

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  type: 'bank' | 'ewallet' | 'credit' | 'cash';
  balance: number;
  currency: Currency;
  color: string;
  icon: string;
  isConnected?: boolean;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  currency?: Currency; // Multi-currency per transaction (e.g. NZD, IDR, USD)
  type: TransactionType;
  categoryId: string;
  accountId: string;
  toAccountId?: string; // For transfers
  date: string; // YYYY-MM-DD
  time?: string;
  notes?: string;
  receiptUrl?: string;
  tags?: string[];
  createdAt: number;
}

export interface BillReminder {
  id: string;
  title: string;
  amount: number;
  currency?: Currency; // Multi-currency per bill
  dueDate: string; // YYYY-MM-DD
  categoryId: string;
  accountId?: string;
  recurrence: 'once' | 'monthly' | 'weekly' | 'yearly';
  isPaid: boolean;
  paidDate?: string;
  autoDebit: boolean;
  reminderDaysBefore: number;
  providerName?: string;
  accountNumber?: string;
  notes?: string;
}

export interface CloudSyncConfig {
  provider: 'gdrive' | 'dropbox' | 'onedrive' | 'icloud' | 'local';
  isConnected: boolean;
  accountEmail?: string;
  lastBackupTime?: string;
  autoBackup: boolean;
  backupIntervalHours: number;
  encryptedSnapshotHash?: string;
}

export interface SecuritySettings {
  isE2EEnabled: boolean;
  isVaultLocked: boolean;
  hasPassphrase: boolean;
  saltHex?: string;
  is2FAEnabled: boolean;
  twoFactorSecret?: string;
  isBiometricEnabled: boolean;
  autoLockMinutes: number; // 0 for never
  lastActiveTimestamp: number;
}

export interface BankFeedEvent {
  id: string;
  bankName: string;
  accountNumber: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  timestamp: string;
  suggestedCategory: string;
  processed: boolean;
}

export interface CryptoPaymentRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  token: 'USDT' | 'USDC';
  network: 'Base (Ethereum L2)';
  walletAddress: string;
  amount: number;
  txHash: string;
  submittedAt: string;
  createdAt?: string;
  whatsappMessage?: string;
  status: 'pending' | 'verified' | 'rejected';
  notes?: string;
}

export type LoanType = 'payable' | 'receivable'; // 'payable' = Hutang (Kewajiban), 'receivable' = Piutang (Aset / Hak Tagih)
export type LoanStatus = 'unpaid' | 'partial' | 'paid';

export interface LoanPayment {
  id: string;
  loanId: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  accountId?: string;
  accountName?: string;
  notes?: string;
  createdAt: number;
}

export interface Loan {
  id: string;
  type: LoanType; // 'payable' = Hutang, 'receivable' = Piutang
  personName: string; // Nama Peminjam (Debitur) / Pemberi Pinjaman (Kreditor)
  contactPhone?: string; // Nomor Kontak / WhatsApp
  title: string; // Keterangan / Keperluan Pinjaman
  amount: number; // Total Nominal Pinjaman Pokok
  currency?: Currency;
  startDate: string; // YYYY-MM-DD
  dueDate: string; // Tanggal Jatuh Tempo (YYYY-MM-DD)
  paidAmount: number; // Total yang sudah dicicil/dilunasi
  remainingAmount: number; // Sisa saldo (amount - paidAmount)
  status: LoanStatus; // 'unpaid' | 'partial' | 'paid'
  accountId?: string; // Rekening kas/bank pencairan/pengeluaran default
  reminderDaysBefore?: number;
  notes?: string;
  payments: LoanPayment[]; // Riwayat pembayaran cicilan / pelunasan
  createdAt: number;
  settledAt?: string; // Tanggal pelunasan penuh jika sudah lunas
}

