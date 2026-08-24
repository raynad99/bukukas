import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowRightLeft,
  Check,
  CheckCircle2,
  Clock,
  Globe2,
  Info,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { currencySymbols, formatCurrency } from '../i18n/translations';
import { Currency } from '../types';
import { convertCurrency } from '../utils/exchangeRates';
import { ThousandAmountInput } from './ThousandAmountInput';

export const CurrencyConverterModal: React.FC = () => {
  const {
    currency,
    setCurrency,
    language,
    exchangeRates,
    isRatesLoading,
    fetchRates,
    isCurrencyConverterOpen,
    setIsCurrencyConverterOpen,
    addNotification,
  } = useApp();

  const [inputAmount, setInputAmount] = useState<string>('100');
  const [fromCurrency, setFromCurrency] = useState<Currency>('NZD');
  const [toCurrency, setToCurrency] = useState<Currency>('IDR');
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isCurrencyConverterOpen) return null;

  const supportedCurrencies: Currency[] = [
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

  const numInputAmount = parseFloat(inputAmount) || 0;
  const convertedValue = convertCurrency(
    numInputAmount,
    fromCurrency,
    toCurrency,
    exchangeRates.rates
  );

  const handleSwap = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const handleRefreshRates = async () => {
    setIsRefreshing(true);
    await fetchRates(fromCurrency);
    setIsRefreshing(false);
  };

  const handleSelectAsAppCurrency = (c: Currency) => {
    setCurrency(c);
    addNotification('info', 'Mata Uang Utama Diubah', `Mata uang aplikasi sekarang menggunakan ${currencySymbols[c]?.name} (${c}).`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <ArrowRightLeft className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Kurs Mata Uang Real-Time & NZD Converter
                </h3>
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Feed
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pembaruan kurs New Zealand Dollar (NZD) & mata uang global secara real-time.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCurrencyConverterOpen(false)}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Real-time Status bar */}
        <div className="my-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-xs dark:border-blue-900/40 dark:bg-blue-950/30">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Terakhir diperbarui: <strong>{exchangeRates.lastUpdated}</strong></span>
            <span className="text-blue-400">•</span>
            <span className="text-slate-600 dark:text-slate-400">{exchangeRates.source}</span>
          </div>

          <button
            onClick={handleRefreshRates}
            disabled={isRefreshing || isRatesLoading}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing || isRatesLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan Kurs</span>
          </button>
        </div>

        {/* Interactive Converter Form */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            Kalkulator Konversi Kurs
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-7 sm:items-center">
            {/* From Currency Block */}
            <div className="space-y-1 sm:col-span-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Dari Mata Uang:
                </label>
                <select
                  value={fromCurrency}
                  onChange={e => setFromCurrency(e.target.value as Currency)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {supportedCurrencies.map(c => (
                    <option key={c} value={c}>
                      {currencySymbols[c]?.flag} {c}
                    </option>
                  ))}
                </select>
              </div>
              <ThousandAmountInput
                id="converter-input-amount"
                value={inputAmount}
                onChange={(val) => setInputAmount(val)}
                currency={fromCurrency}
                placeholder="0"
                showQuickChips={false}
                showSpelledOut={false}
              />
            </div>

            {/* Swap Button */}
            <div className="flex justify-center sm:col-span-1 pt-4">
              <button
                type="button"
                onClick={handleSwap}
                title="Tukar mata uang"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </button>
            </div>

            {/* To Currency Block */}
            <div className="space-y-1 sm:col-span-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Hasil Konversi Ke:
                </label>
                <select
                  value={toCurrency}
                  onChange={e => setToCurrency(e.target.value as Currency)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {supportedCurrencies.map(c => (
                    <option key={c} value={c}>
                      {currencySymbols[c]?.flag} {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-lg font-black text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                <span className="truncate">{formatCurrency(convertedValue, toCurrency, language)}</span>
                <span className="rounded bg-emerald-200/80 px-2 py-0.5 text-xs font-bold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                  {toCurrency}
                </span>
              </div>
            </div>
          </div>

          {/* Conversion rate pill */}
          <div className="flex items-center justify-between rounded-xl bg-white p-2.5 text-xs text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
            <span>
              Nilai Tukar: <strong>1 {fromCurrency}</strong> ={' '}
              <strong className="text-blue-600 dark:text-blue-400">
                {formatCurrency(convertCurrency(1, fromCurrency, toCurrency, exchangeRates.rates), toCurrency, language)}
              </strong>
            </span>
            <span className="text-[11px] text-slate-400">Real-time benchmark</span>
          </div>
        </div>

        {/* NZD & Global Exchange Rates Table */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold tracking-wider text-slate-600 uppercase dark:text-slate-300">
              Tabel Kurs Real-Time (Basis: 1 NZD 🇳🇿)
            </h4>
            <span className="text-[11px] text-slate-400">Pilih mata uang utama aplikasi di bawah:</span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-3.5">Mata Uang</th>
                  <th className="py-2.5 px-3.5">Simbol</th>
                  <th className="py-2.5 px-3.5">Nilai per 1 NZD</th>
                  <th className="py-2.5 px-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {supportedCurrencies.map(currCode => {
                  const meta = currencySymbols[currCode] || { flag: '', symbol: currCode, name: currCode };
                  const rateVal = exchangeRates.rates[currCode] || 1;
                  const isCurrentActive = currency === currCode;

                  return (
                    <tr
                      key={currCode}
                      className={`transition ${
                        currCode === 'NZD'
                          ? 'bg-blue-50/40 dark:bg-blue-950/20'
                          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-3.5 font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{meta.flag}</span>
                          <div>
                            <span className="font-bold">{currCode}</span>
                            <span className="ml-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                              {meta.name}
                            </span>
                          </div>
                          {currCode === 'NZD' && (
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                              Target Real-Time
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 font-bold text-slate-700 dark:text-slate-300">
                        {meta.symbol}
                      </td>
                      <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white">
                        {currCode === 'IDR' || currCode === 'JPY'
                          ? Math.round(rateVal).toLocaleString(language === 'id' ? 'id-ID' : 'en-US')
                          : rateVal.toFixed(4)}{' '}
                        {meta.symbol}
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        {isCurrentActive ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <Check className="h-3 w-3" />
                            Aktif
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSelectAsAppCurrency(currCode)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            Terapkan ke Aplikasi
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Info className="h-4 w-4 text-blue-500 shrink-0" />
            <span>
              Format mata uang NZD diformat secara otomatis dengan standar angka presisi desimal 2 digit (contoh: NZ$ 1,250.00).
            </span>
          </div>

          <button
            onClick={() => setIsCurrencyConverterOpen(false)}
            className="w-full rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 sm:w-auto dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
