/**
 * Number formatting and spelling utilities for Financial Bookkeeping
 */

/**
 * Format raw number or string into a thousand-separated string
 * e.g. 1000000 -> "1.000.000" (IDR)
 * e.g. 1250.50 -> "1.250,50" (IDR) or "1,250.50" (USD)
 */
export function formatThousand(
  val: number | string | undefined | null,
  isIndonesianStyle = true
): string {
  if (val === undefined || val === null || val === '') return '';

  const strVal = typeof val === 'number' ? val.toString() : String(val);
  if (!strVal || strVal === '0') return '0';

  // Clean non-digit characters except period, comma, and minus
  let cleanStr = strVal.replace(/[^\d.,-]/g, '');
  if (!cleanStr) return '';

  const isNegative = cleanStr.startsWith('-');
  cleanStr = cleanStr.replace(/-/g, '');

  let intDigits = '';
  let decDigits = '';
  let hasDecimal = false;

  if (isIndonesianStyle) {
    // Indonesian style: thousand separator is dot (.), decimal separator is comma (,)
    // If input contains comma, the last comma separates integer and decimal
    const commaIndex = cleanStr.lastIndexOf(',');
    if (commaIndex !== -1) {
      hasDecimal = true;
      const intPart = cleanStr.slice(0, commaIndex);
      decDigits = cleanStr.slice(commaIndex + 1).replace(/[^\d]/g, '');
      intDigits = intPart.replace(/[^\d]/g, '');
    } else {
      // If there is no comma, all dots are thousand separators and stripped
      intDigits = cleanStr.replace(/[^\d]/g, '');
    }
  } else {
    // English style: thousand separator is comma (,), decimal separator is dot (.)
    const dotIndex = cleanStr.lastIndexOf('.');
    if (dotIndex !== -1) {
      hasDecimal = true;
      const intPart = cleanStr.slice(0, dotIndex);
      decDigits = cleanStr.slice(dotIndex + 1).replace(/[^\d]/g, '');
      intDigits = intPart.replace(/[^\d]/g, '');
    } else {
      intDigits = cleanStr.replace(/[^\d]/g, '');
    }
  }

  // Remove leading zeros from integer part unless it's just '0'
  intDigits = intDigits.replace(/^0+(?=\d)/, '');
  if (!intDigits && !hasDecimal) {
    return isNegative ? '-' : '';
  }
  if (!intDigits && hasDecimal) {
    intDigits = '0';
  }

  const thousandsSeparator = isIndonesianStyle ? '.' : ',';
  const decimalSeparator = isIndonesianStyle ? ',' : '.';

  const formattedInt = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
  const sign = isNegative ? '-' : '';

  if (hasDecimal) {
    return `${sign}${formattedInt}${decimalSeparator}${decDigits}`;
  }

  return `${sign}${formattedInt}`;
}

/**
 * Parse a formatted thousand string back to a numeric float
 * e.g. "1.000.000" -> 1000000
 * e.g. "1.250,50" -> 1250.5
 * e.g. "1,250.50" -> 1250.5
 */
export function parseThousand(formattedStr: string | number, isIndonesianStyle = true): number {
  if (typeof formattedStr === 'number') return isNaN(formattedStr) ? 0 : formattedStr;
  if (!formattedStr || typeof formattedStr !== 'string') return 0;

  const trimmed = formattedStr.trim();
  if (!trimmed) return 0;

  const isNegative = trimmed.startsWith('-');
  const clean = trimmed.replace(/[^\d.,]/g, '');
  if (!clean) return 0;

  let normalized = '';

  if (isIndonesianStyle) {
    // In IDR, comma is decimal, dot is thousand separator
    if (clean.includes(',')) {
      const parts = clean.split(',');
      const intPart = parts[0].replace(/\./g, '');
      const decPart = parts.slice(1).join('').replace(/\./g, '');
      normalized = `${intPart}.${decPart}`;
    } else {
      normalized = clean.replace(/\./g, '');
    }
  } else {
    // In English, dot is decimal, comma is thousand separator
    if (clean.includes('.')) {
      const parts = clean.split('.');
      const intPart = parts[0].replace(/,/g, '');
      const decPart = parts.slice(1).join('').replace(/,/g, '');
      normalized = `${intPart}.${decPart}`;
    } else {
      normalized = clean.replace(/,/g, '');
    }
  }

  const result = parseFloat(normalized);
  if (isNaN(result)) return 0;
  return isNegative ? -Math.abs(result) : result;
}

/**
 * Terbilang nominal dalam Bahasa Indonesia
 * e.g. 1500000 -> "Satu Juta Lima Ratus Ribu"
 */
export function numberToWordsIndonesian(num: number): string {
  if (num === 0) return 'Nol';
  if (num < 0) return `Minus ${numberToWordsIndonesian(Math.abs(num))}`;

  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

  function convert(n: number): string {
    if (n < 12) return satuan[n];
    if (n < 20) return `${convert(n - 10)} Belas`;
    if (n < 100) return `${convert(Math.floor(n / 10))} Puluh ${convert(n % 10)}`.trim();
    if (n < 200) return `Seratus ${convert(n - 100)}`.trim();
    if (n < 1000) return `${convert(Math.floor(n / 100))} Ratus ${convert(n % 100)}`.trim();
    if (n < 2000) return `Seribu ${convert(n - 1000)}`.trim();
    if (n < 1000000) return `${convert(Math.floor(n / 1000))} Ribu ${convert(n % 1000)}`.trim();
    if (n < 1000000000) return `${convert(Math.floor(n / 1000000))} Juta ${convert(n % 1000000)}`.trim();
    if (n < 1000000000000) return `${convert(Math.floor(n / 1000000000))} Miliar ${convert(n % 1000000000)}`.trim();
    if (n < 1000000000000000) return `${convert(Math.floor(n / 1000000000000))} Triliun ${convert(n % 1000000000000)}`.trim();
    return n.toLocaleString('id-ID');
  }

  const intVal = Math.floor(num);
  return convert(intVal);
}
