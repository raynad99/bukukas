import { BankAccount, Category, Transaction } from '../types';

export function exportTransactionsToCSV(
  transactions: Transaction[],
  categories: Category[],
  accounts: BankAccount[]
): void {
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || id;
  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || id;

  const headers = [
    'ID Transaksi',
    'Tanggal',
    'Waktu',
    'Judul Transaksi',
    'Tipe',
    'Kategori',
    'Rekening Asal',
    'Rekening Tujuan',
    'Mata Uang',
    'Nominal',
    'Catatan',
  ];

  const rows = transactions.map(t => [
    `"${t.id}"`,
    `"${t.date}"`,
    `"${t.time || ''}"`,
    `"${(t.title || '').replace(/"/g, '""')}"`,
    `"${t.type}"`,
    `"${getCategoryName(t.categoryId).replace(/"/g, '""')}"`,
    `"${getAccountName(t.accountId).replace(/"/g, '""')}"`,
    `"${t.toAccountId ? getAccountName(t.toAccountId).replace(/"/g, '""') : ''}"`,
    `"${t.currency || 'IDR'}"`,
    t.amount,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `BukuKasPro_Transaksi_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
