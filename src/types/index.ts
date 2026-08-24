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
  budgetLimit?: number;
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
  role: UserRole;
  plan: SubscriptionPlan;
  trialStartDate?: string;
  trialExpiresDate?: string;
  paidExpiresDate?: string;
  registeredSelf: boolean;
  status?: 'active' | 'trial' | 'expired' | 'suspended';
  customNotes?: string;
  referredBy?: string;
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
  type: 'bank' | 'ewallet' | 'credit' | 'cash';
  balance: number;
  currency: Currency;
  color: string;
  icon: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  currency?: Currency;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  toAccountId?: string;
  date: string;
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
  currency?: Currency;
  dueDate: string;
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
  autoLockMinutes: number;
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

export type LoanType = 'payable' | 'receivable';
export type LoanStatus = 'unpaid' | 'partial' | 'paid';

export interface LoanPayment {
  id: string;
  loanId: string;
  amount: number;
  paymentDate: string;
  accountId?: string;
  accountName?: string;
  notes?: string;
  createdAt: number;
}

export interface Loan {
  id: string;
  type: LoanType;
  personName: string;
  contactPhone?: string;
  title: string;
  amount: number;
  currency?: Currency;
  startDate: string;
  dueDate: string;
  paidAmount: number;
  remainingAmount: number;
  status: LoanStatus;
  accountId?: string;
  reminderDaysBefore?: number;
  notes?: string;
  payments: LoanPayment[];
  createdAt: number;
  settledAt?: string;
}
