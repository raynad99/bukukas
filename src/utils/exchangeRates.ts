import { Currency, ExchangeRateData, Language } from '../types';
import { formatCurrency } from '../i18n/translations';

// Realistic fallback rates relative to 1 NZD (New Zealand Dollar)
const DEFAULT_NZD_RATES: Record<Currency, number> = {
  NZD: 1.0,
  IDR: 9540.50,
  USD: 0.592,
  EUR: 0.548,
  JPY: 91.65,
  SGD: 0.795,
  AUD: 0.912,
  GBP: 0.468,
  MYR: 2.615,
  HKD: 4.624,
  TWD: 19.21,
  BGN: 1.070,
  KRW: 814.10,
};

// Base rate matrix for calculation fallback (relative to USD)
const BASE_USD_RATES: Record<Currency, number> = {
  USD: 1.0,
  NZD: 1.689,
  IDR: 16115.0,
  EUR: 0.925,
  JPY: 154.8,
  SGD: 1.343,
  AUD: 1.541,
  GBP: 0.791,
  MYR: 4.415,
  HKD: 7.810,
  TWD: 32.45,
  BGN: 1.808,
  KRW: 1375.0,
};

export const ALL_CURRENCIES: Currency[] = [
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
];

/**
 * Calculates rates relative to any chosen base currency using benchmark matrix
 */
export function calculateRelativeRates(
  baseCurrency: Currency,
  baseUsdRates: Record<Currency, number> = BASE_USD_RATES
): Record<Currency, number> {
  const baseRateToUsd = baseUsdRates[baseCurrency] || 1;
  const result: Record<Currency, number> = {} as Record<Currency, number>;

  for (const c of ALL_CURRENCIES) {
    const targetRateToUsd = baseUsdRates[c] || 1;
    // (target/USD) / (base/USD) = target/base
    result[c] = targetRateToUsd / baseRateToUsd;
  }

  return result;
}

/**
 * Fetch live exchange rates from public real-time financial APIs with multiple failover providers
 */
export async function fetchLiveExchangeRates(baseCurrency: Currency = 'NZD'): Promise<ExchangeRateData> {
  const supportedCurrencies: Currency[] = ALL_CURRENCIES;

  // Helper to format current time with seconds
  const getFormattedNowTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // 1. Primary: open.er-api.com
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.rates && data.result === 'success') {
        const rates: Record<Currency, number> = {} as Record<Currency, number>;
        for (const c of supportedCurrencies) {
          rates[c] = Number(data.rates[c]) || (DEFAULT_NZD_RATES[c] || 1);
        }
        rates[baseCurrency] = 1;

        return {
          base: baseCurrency,
          rates,
          lastUpdated: getFormattedNowTime(),
          isLive: true,
          source: 'Open Exchange Rate API (Live Real-Time)',
        };
      }
    }
  } catch (err) {
    console.warn('Primary exchange rate endpoint unreachable, trying backup...', err);
  }

  // 2. Secondary: exchangerate-api.com v4
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.rates) {
        const rates: Record<Currency, number> = {} as Record<Currency, number>;
        for (const c of supportedCurrencies) {
          rates[c] = Number(data.rates[c]) || (DEFAULT_NZD_RATES[c] || 1);
        }
        rates[baseCurrency] = 1;

        return {
          base: baseCurrency,
          rates,
          lastUpdated: getFormattedNowTime(),
          isLive: true,
          source: 'ExchangeRate API v4 (Live Real-Time)',
        };
      }
    }
  } catch (err) {
    console.warn('Secondary exchange rate endpoint unreachable, trying fallback...', err);
  }

  // 3. Tertiary: Frankfurter API (ECB reference rates)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    // Frankfurter might need uppercase
    const response = await fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.rates) {
        const rates: Record<Currency, number> = {} as Record<Currency, number>;
        for (const c of supportedCurrencies) {
          rates[c] = Number(data.rates[c]) || calculateRelativeRates(baseCurrency)[c] || 1;
        }
        rates[baseCurrency] = 1;

        return {
          base: baseCurrency,
          rates,
          lastUpdated: getFormattedNowTime(),
          isLive: true,
          source: 'European Central Bank (Frankfurter Live)',
        };
      }
    }
  } catch (err) {
    console.warn('Tertiary exchange rate endpoint failed', err);
  }

  // 4. Fallback with benchmark matrix
  const fallbackRates = calculateRelativeRates(baseCurrency);
  return {
    base: baseCurrency,
    rates: fallbackRates,
    lastUpdated: getFormattedNowTime(),
    isLive: false,
    source: 'Market Benchmark Cache',
  };
}

/**
 * Convert value between currencies
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Record<Currency, number>
): number {
  if (from === to || amount === 0) return amount;

  const rateFrom = rates[from] || 1;
  const rateTo = rates[to] || 1;

  // Convert from -> base -> to
  const inBase = amount / rateFrom;
  return inBase * rateTo;
}

/**
 * Convert any currency amount to IDR (Indonesian Rupiah)
 */
export function convertToIdr(
  amount: number,
  fromCurrency: Currency,
  rates: Record<Currency, number>
): number {
  if (fromCurrency === 'IDR') return amount;
  return convertCurrency(amount, fromCurrency, 'IDR', rates);
}

/**
 * Format amount in its native currency with Rupiah (IDR) equivalent in brackets
 * e.g. "1,300.00 NZD (Rp 12.402.650)" or "NZ$ 1,300.00 (Rp 12.402.650)"
 */
export function formatWithIdrEquivalent(
  amount: number,
  currency: Currency,
  rates: Record<Currency, number>,
  lang: Language = 'id',
  options?: {
    customSymbol?: boolean;
    showApprox?: boolean;
  }
): string {
  const nativeFormatted = formatCurrency(amount, currency, lang);
  if (currency === 'IDR') {
    return nativeFormatted;
  }

  const idrAmount = convertToIdr(amount, currency, rates);
  const idrFormatted = formatCurrency(idrAmount, 'IDR', lang);
  const approx = options?.showApprox ? '≈ ' : '';

  return `${nativeFormatted} (${approx}${idrFormatted})`;
}

/**
 * Return only the Rupiah (IDR) equivalent formatted string
 * e.g. "≈ Rp 12.402.650"
 */
export function formatIdrBadge(
  amount: number,
  fromCurrency: Currency,
  rates: Record<Currency, number>,
  lang: Language = 'id'
): string {
  if (fromCurrency === 'IDR') {
    return formatCurrency(amount, 'IDR', lang);
  }
  const idrAmount = convertToIdr(amount, fromCurrency, rates);
  return `≈ ${formatCurrency(idrAmount, 'IDR', lang)}`;
}

export interface AccountPreset {
  id: string;
  name: string;
  accountType: 'bank' | 'ewallet' | 'cash';
  color: string;
  icon: string;
  currency: Currency;
  description: string;
}

export const POPULAR_ACCOUNT_PRESETS: AccountPreset[] = [
  {
    id: 'preset-bca',
    name: 'BCA Tahapan (IDR)',
    accountType: 'bank',
    color: '#00529C',
    icon: 'Landmark',
    currency: 'IDR',
    description: 'Rekening Transaksi Harian Utama BCA',
  },
  {
    id: 'preset-mandiri',
    name: 'Mandiri Livin Tabungan (IDR)',
    accountType: 'bank',
    color: '#003366',
    icon: 'Landmark',
    currency: 'IDR',
    description: 'Tabungan & Payroll Bank Mandiri',
  },
  {
    id: 'preset-gopay',
    name: 'GoPay / OVO E-Wallet (IDR)',
    accountType: 'ewallet',
    color: '#00AED6',
    icon: 'Smartphone',
    currency: 'IDR',
    description: 'Dompet Digital Pembayaran QRIS & Belanja',
  },
  {
    id: 'nzd-anz',
    name: 'ANZ New Zealand (NZD Account)',
    accountType: 'bank',
    color: '#004165',
    icon: 'Landmark',
    currency: 'NZD',
    description: 'Rekening Transaksi New Zealand Dollar',
  },
  {
    id: 'nzd-asb',
    name: 'ASB Streamline (NZD Account)',
    accountType: 'bank',
    color: '#FFB800',
    icon: 'Building2',
    currency: 'NZD',
    description: 'Tabungan Rekening NZD ASB',
  },
  {
    id: 'preset-cash',
    name: 'Dompet Tunai Fisik (Cash)',
    accountType: 'cash',
    color: '#10B981',
    icon: 'Wallet',
    currency: 'IDR',
    description: 'Uang Tunai di Dompet Pribadi',
  },
];
