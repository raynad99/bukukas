import { UserProfile } from '../types';

export interface TrialStatusInfo {
  daysRemaining: number;
  isExpired: boolean;
  isTrial: boolean;
  isLifetime: boolean;
  isPaid: boolean;
  percentageLeft: number;
  formattedExpiry: string;
  badgeLabel: string;
  badgeClass: string;
}

export const calculateTrialStatus = (user: UserProfile | null): TrialStatusInfo => {
  if (!user) {
    return {
      daysRemaining: 0,
      isExpired: false,
      isTrial: false,
      isLifetime: false,
      isPaid: false,
      percentageLeft: 0,
      formattedExpiry: '-',
      badgeLabel: 'Tamu / Belum Masuk',
      badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    };
  }

  // Admin / Dev accounts or explicitly Lifetime users
  if (user.role === 'admin' || user.plan === 'lifetime') {
    return {
      daysRemaining: 9999,
      isExpired: false,
      isTrial: false,
      isLifetime: true,
      isPaid: false,
      percentageLeft: 100,
      formattedExpiry: 'Aktif Seumur Hidup (Lifetime VIP)',
      badgeLabel: '👑 Lifetime VIP',
      badgeClass: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60',
    };
  }

  // Paid Plan (1 Year / 365 Days)
  if (user.plan === 'paid') {
    const now = new Date();
    const paidExpires = user.paidExpiresDate ? new Date(user.paidExpiresDate) : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const diffMs = paidExpires.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const isExpired = diffMs <= 0 || user.status === 'expired';
    const percentageLeft = Math.max(0, Math.min(100, Math.round((daysRemaining / 365) * 100)));

    const formattedExpiry = paidExpires.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    if (isExpired) {
      return {
        daysRemaining: 0,
        isExpired: true,
        isTrial: false,
        isLifetime: false,
        isPaid: true,
        percentageLeft: 0,
        formattedExpiry,
        badgeLabel: '⚠️ Paket 1 Tahun Habis',
        badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
      };
    }

    return {
      daysRemaining,
      isExpired: false,
      isTrial: false,
      isLifetime: false,
      isPaid: true,
      percentageLeft,
      formattedExpiry,
      badgeLabel: `💳 Pro 1 Thn (${daysRemaining} Hari)`,
      badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    };
  }

  // Trial Plan (7 Days from trialStartDate)
  const now = new Date();
  const startDate = user.trialStartDate ? new Date(user.trialStartDate) : new Date(user.createdAt || Date.now());
  const expiresDate = user.trialExpiresDate ? new Date(user.trialExpiresDate) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const diffMs = expiresDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isExpired = diffMs <= 0 || user.status === 'expired';
  const percentageLeft = Math.max(0, Math.min(100, Math.round((daysRemaining / 7) * 100)));

  const formattedExpiry = expiresDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (isExpired) {
    return {
      daysRemaining: 0,
      isExpired: true,
      isTrial: true,
      isLifetime: false,
      isPaid: false,
      percentageLeft: 0,
      formattedExpiry,
      badgeLabel: '⚠️ Trial Habis (Expired)',
      badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
    };
  }

  return {
    daysRemaining,
    isExpired: false,
    isTrial: true,
    isLifetime: false,
    isPaid: false,
    percentageLeft,
    formattedExpiry,
    badgeLabel: `⏳ Trial ${daysRemaining} Hari`,
    badgeClass: daysRemaining <= 2
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
      : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
  };
};
