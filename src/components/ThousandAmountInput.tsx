import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Currency } from '../types';
import { formatThousand, numberToWordsIndonesian, parseThousand } from '../utils/numberFormat';
import { currencySymbols } from '../i18n/translations';

interface ThousandAmountInputProps {
  value: string | number;
  onChange: (val: string, numVal: number) => void;
  currency?: Currency;
  placeholder?: string;
  className?: string;
  showQuickChips?: boolean;
  showSpelledOut?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  id?: string;
}

export const ThousandAmountInput: React.FC<ThousandAmountInputProps> = ({
  value,
  onChange,
  currency = 'IDR',
  placeholder = '0',
  className = '',
  showQuickChips = true,
  showSpelledOut = true,
  required = false,
  autoFocus = false,
  id = 'thousand-amount-input',
}) => {
  const isIdr = currency === 'IDR';
  const sym = currencySymbols[currency]?.symbol || 'Rp';
  const inputRef = useRef<HTMLInputElement>(null);

  // Format initial display
  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (value === undefined || value === null || value === '' || value === 0) return '';
    return formatThousand(value, isIdr);
  });

  // Sync if external value changes drastically (e.g. reset or editing change)
  useEffect(() => {
    if (value === '' || value === 0 || value === '0') {
      setDisplayValue('');
    } else {
      const currentParsed = parseThousand(displayValue, isIdr);
      const incomingParsed = typeof value === 'number' ? value : parseFloat(value.toString()) || 0;
      if (Math.abs(currentParsed - incomingParsed) > 0.0001) {
        setDisplayValue(formatThousand(value, isIdr));
      }
    }
  }, [value, isIdr]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const inputElem = e.target;
    const cursorPos = inputElem.selectionStart || 0;
    const prevLength = displayValue.length;

    if (!rawInput.trim()) {
      setDisplayValue('');
      onChange('', 0);
      return;
    }

    // Format the number as user types
    const formatted = formatThousand(rawInput, isIdr);
    const parsedNum = parseThousand(formatted, isIdr);

    setDisplayValue(formatted);
    onChange(parsedNum.toString(), parsedNum);

    // Maintain natural cursor position after adding/removing thousand dots
    setTimeout(() => {
      if (inputRef.current) {
        const lengthDiff = formatted.length - prevLength;
        const newCursorPos = Math.max(0, Math.min(formatted.length, cursorPos + lengthDiff));
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleQuickAdd = (addAmount: number) => {
    const currentNum = parseThousand(displayValue, isIdr);
    const newNum = currentNum + addAmount;
    const formatted = formatThousand(newNum, isIdr);
    setDisplayValue(formatted);
    onChange(newNum.toString(), newNum);
  };

  const handleClear = () => {
    setDisplayValue('');
    onChange('', 0);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const numericValue = parseThousand(displayValue, isIdr);
  const spelledOut = isIdr && numericValue > 0 ? numberToWordsIndonesian(numericValue) : '';

  // Quick preset chips depending on currency
  const quickChips = isIdr
    ? [
        { label: '+10 Rb', value: 10000 },
        { label: '+50 Rb', value: 50000 },
        { label: '+100 Rb', value: 100000 },
        { label: '+500 Rb', value: 500000 },
        { label: '+1 Juta', value: 1000000 },
        { label: '+5 Juta', value: 5000000 },
      ]
    : [
        { label: '+10', value: 10 },
        { label: '+50', value: 50 },
        { label: '+100', value: 100 },
        { label: '+500', value: 500 },
        { label: '+1,000', value: 1000 },
        { label: '+5,000', value: 5000 },
      ];

  return (
    <div className="space-y-2">
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-extrabold text-slate-400 dark:text-slate-500">
          {sym}
        </span>
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required={required}
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={displayValue}
          onChange={handleInputChange}
          className={`w-full rounded-2xl border border-slate-200 bg-white py-3 pr-10 pl-12 text-xl font-black tracking-tight text-slate-900 shadow-xs outline-hidden transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white ${className}`}
        />
        {displayValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            title="Hapus nominal"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Terbilang verbal preview */}
      {showSpelledOut && isIdr && spelledOut && (
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-3 py-1.5 text-xs text-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold text-emerald-800 dark:text-emerald-300">
            Terbilang: {spelledOut} Rupiah
          </span>
        </div>
      )}

      {/* Quick Increment Chips */}
      {showQuickChips && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Mode Ribuan:
          </span>
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickAdd(chip.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
