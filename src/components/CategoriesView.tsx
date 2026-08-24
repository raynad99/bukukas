import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Edit2,
  Grid,
  Palette,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../i18n/translations';
import { Category } from '../types';
import { convertCurrency } from '../utils/exchangeRates';
import { AVAILABLE_CATEGORY_ICONS, IconHelper } from './IconHelper';
import { ThousandAmountInput } from './ThousandAmountInput';

const COLOR_PALETTE = [
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f59e0b', // amber
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#64748b', // slate
  '#e11d48', // ruby
  '#059669', // green
];

export const CategoriesView: React.FC = () => {
  const {
    t,
    categories,
    transactions,
    addCategory,
    updateCategory,
    deleteCategory,
    currency,
    language,
    exchangeRates,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [icon, setIcon] = useState('ShoppingBag');
  const [color, setColor] = useState('#10b981');
  const [budgetLimit, setBudgetLimit] = useState('');

  const currentYear = new Date().getFullYear();
  const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, '0');
  const periodPrefix = `${currentYear}-${currentMonthStr}`;

  const filteredCategories = categories.filter(c => c.type === activeTab);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setType(activeTab);
    setIcon('ShoppingBag');
    setColor(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]);
    setBudgetLimit('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setType(cat.type);
    setIcon(cat.icon);
    setColor(cat.color);
    setBudgetLimit(cat.budgetLimit ? cat.budgetLimit.toString() : '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const numBudget = budgetLimit ? parseFloat(budgetLimit) : undefined;

    if (editingCategory) {
      updateCategory({
        ...editingCategory,
        name: name.trim(),
        type,
        icon,
        color,
        budgetLimit: numBudget,
      });
    } else {
      addCategory({
        name: name.trim(),
        type,
        icon,
        color,
        budgetLimit: numBudget,
      });
    }

    setIsModalOpen(false);
    setEditingCategory(null);
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12">
      {/* View Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('categories_title')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('categories_desc')}
          </p>
        </div>

        <button
          id="btn-add-category"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          <span>{t('add_category')}</span>
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800 max-w-xs">
        <button
          onClick={() => setActiveTab('expense')}
          className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
            activeTab === 'expense'
              ? 'bg-white text-rose-600 shadow-xs dark:bg-slate-900 dark:text-rose-400'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {t('expense')} ({categories.filter(c => c.type === 'expense').length})
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
            activeTab === 'income'
              ? 'bg-white text-emerald-600 shadow-xs dark:bg-slate-900 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {t('income')} ({categories.filter(c => c.type === 'income').length})
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCategories.map(cat => {
          // Calculate monthly spent converted to active currency
          const spentThisMonth = transactions
            .filter(tx => tx.categoryId === cat.id && tx.date.startsWith(periodPrefix))
            .reduce((sum, tx) => {
              const itemCurr = tx.currency || 'IDR';
              return sum + convertCurrency(tx.amount, itemCurr, currency, exchangeRates.rates);
            }, 0);

          const hasBudget = Boolean(cat.budgetLimit && cat.budgetLimit > 0);
          const rawLimit = cat.budgetLimit || 1;
          const limit = convertCurrency(rawLimit, 'IDR', currency, exchangeRates.rates);
          const percentUsed = hasBudget ? Math.min(100, Math.round((spentThisMonth / limit) * 100)) : 0;
          const isOver = hasBudget && spentThisMonth > limit;

          return (
            <div
              key={cat.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs transition hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-xs"
                      style={{ backgroundColor: cat.color }}
                    >
                      <IconHelper name={cat.icon} className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{cat.name}</h4>
                      <span className="text-[11px] text-slate-400">
                        {transactions.filter(tx => tx.categoryId === cat.id).length} transaksi
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                      title={t('edit')}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      title={t('delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Monthly spend & Budget */}
                <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Bulan Ini:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(spentThisMonth, currency, language)}
                    </span>
                  </div>

                  {hasBudget && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Anggaran ({percentUsed}%):</span>
                        <span className="text-slate-600 dark:text-slate-300">
                          Maks {formatCurrency(limit, currency, language)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className={`h-full rounded-full ${
                            isOver ? 'bg-rose-500' : percentUsed > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${percentUsed}%` }}
                        />
                      </div>
                      {isOver && (
                        <p className="text-[10px] font-bold text-rose-500">
                          {t('budget_exceeded')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingCategory ? t('edit_category') : t('add_category')}
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
                  {t('category_name')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Belanja Online, Bensin, Restoran"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-hidden focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('category_type')}
                </label>
                <div className="mt-1 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                      type === 'expense'
                        ? 'bg-white text-rose-600 shadow-xs dark:bg-slate-900 dark:text-rose-400'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t('expense')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                      type === 'income'
                        ? 'bg-white text-emerald-600 shadow-xs dark:bg-slate-900 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t('income')}
                  </button>
                </div>
              </div>

              {/* Color Palette Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('category_color')}
                </label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {COLOR_PALETTE.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="flex h-7 w-7 items-center justify-center rounded-full transition hover:scale-110"
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <Check className="h-4 w-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('category_icon')}
                </label>
                <div className="mt-1.5 grid grid-cols-5 sm:grid-cols-6 gap-1.5 sm:gap-2 max-h-32 overflow-y-auto p-1 border rounded-xl border-slate-200 dark:border-slate-700">
                  {AVAILABLE_CATEGORY_ICONS.map(iName => (
                    <button
                      key={iName}
                      type="button"
                      onClick={() => setIcon(iName)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                        icon === iName
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <IconHelper name={iName} className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget Limit (if expense) */}
              {type === 'expense' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('monthly_budget_limit')}
                  </label>
                  <ThousandAmountInput
                    id="category-budget-limit-input"
                    value={budgetLimit}
                    onChange={(val) => setBudgetLimit(val)}
                    currency={currency}
                    placeholder="Kosongkan jika tanpa batas"
                    showQuickChips={true}
                    showSpelledOut={true}
                  />
                </div>
              )}

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
