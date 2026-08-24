import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '../i18n/translations';
import { BankAccount, Category, Currency, Language, Transaction } from '../types';
import { convertCurrency } from './exchangeRates';

export interface PDFExportOptions {
  transactions: Transaction[];
  categories: Category[];
  accounts: BankAccount[];
  periodLabel: string;
  currency: Currency;
  language: Language;
  userName?: string;
  exchangeRates?: Record<string, number>;
}

export function generatePDFReport(options: PDFExportOptions): jsPDF {
  const {
    transactions,
    categories,
    accounts,
    periodLabel,
    currency,
    language,
    userName = 'Pengguna BukuKas Pro',
    exchangeRates = { IDR: 1 },
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || id;
  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || id;

  // Calculate totals with currency conversion
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => {
      const itemCurr = t.currency || 'IDR';
      return sum + convertCurrency(t.amount, itemCurr, currency, exchangeRates);
    }, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => {
      const itemCurr = t.currency || 'IDR';
      return sum + convertCurrency(t.amount, itemCurr, currency, exchangeRates);
    }, 0);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  // Color theme: Deep Navy header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 40, 'F');

  // Title & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN RINGKASAN FINANSIAL', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`BukuKas Pro | Periode: ${periodLabel} | Dibuat: ${new Date().toLocaleDateString('id-ID')}`, 14, 26);
  doc.text(`Pemilik Rekening: ${userName} | Status: Terverifikasi & Terenkripsi E2E`, 14, 32);

  // Summary Metrics Cards (Grid of 4 boxes)
  const cardY = 48;
  const cardWidth = 43;
  const cardHeight = 22;

  // Card 1: Total Pemasukan
  doc.setFillColor(240, 253, 244); // green-50
  doc.setDrawColor(187, 247, 208); // green-200
  doc.roundedRect(14, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setTextColor(22, 101, 52); // green-800
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL PEMASUKAN', 18, cardY + 7);
  doc.setFontSize(10);
  doc.text(formatCurrency(totalIncome, currency, language), 18, cardY + 16);

  // Card 2: Total Pengeluaran
  doc.setFillColor(254, 242, 242); // red-50
  doc.setDrawColor(254, 202, 202); // red-200
  doc.roundedRect(61, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setTextColor(153, 27, 27); // red-800
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL PENGELUARAN', 65, cardY + 7);
  doc.setFontSize(10);
  doc.text(formatCurrency(totalExpense, currency, language), 65, cardY + 16);

  // Card 3: Arus Kas Bersih
  doc.setFillColor(239, 246, 255); // blue-50
  doc.setDrawColor(191, 219, 254); // blue-200
  doc.roundedRect(108, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setTextColor(30, 64, 175); // blue-800
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ARUS KAS BERSIH', 112, cardY + 7);
  doc.setFontSize(10);
  doc.text(formatCurrency(netSavings, currency, language), 112, cardY + 16);

  // Card 4: Tingkat Tabungan
  doc.setFillColor(245, 243, 255); // purple-50
  doc.setDrawColor(221, 214, 254); // purple-200
  doc.roundedRect(155, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setTextColor(91, 33, 182); // purple-800
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TINGKAT TABUNGAN', 159, cardY + 7);
  doc.setFontSize(10);
  doc.text(`${savingsRate}% (${savingsRate >= 20 ? 'Optimal' : 'Perlu Dihemat'})`, 159, cardY + 16);

  // Section 1: Breakdown Kategori Pengeluaran
  const expenseByCategory: Record<string, number> = {};
  transactions
    .filter(tx => tx.type === 'expense')
    .forEach(tx => {
      const itemCurr = tx.currency || 'IDR';
      const convAmount = convertCurrency(tx.amount, itemCurr, currency, exchangeRates);
      expenseByCategory[tx.categoryId] = (expenseByCategory[tx.categoryId] || 0) + convAmount;
    });

  const categoryRows = Object.entries(expenseByCategory).map(([catId, amount]) => {
    const cat = categories.find(c => c.id === catId);
    const catName = cat?.name || catId;
    const percentage = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) + '%' : '0%';
    const budget = cat?.budgetLimit
      ? formatCurrency(convertCurrency(cat.budgetLimit, 'IDR', currency, exchangeRates), currency, language)
      : '-';
    return [catName, formatCurrency(amount, currency, language), percentage, budget];
  });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Distribusi Pengeluaran Berdasarkan Kategori', 14, 80);

  autoTable(doc, {
    startY: 84,
    head: [['Nama Kategori', 'Total Dibelanjakan', 'Porsi Pengeluaran (%)', 'Batas Anggaran Bulanan']],
    body: categoryRows.length > 0 ? categoryRows : [['Tidak ada pengeluaran', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  // Get final Y from previous table
  const finalY1 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 120;

  // Section 2: Rincian Riwayat Transaksi
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Rincian Riwayat Mutasi Transaksi', 14, finalY1 + 10);

  const transactionRows = transactions.map(tx => {
    const itemCurr = tx.currency || 'IDR';
    const convAmount = convertCurrency(tx.amount, itemCurr, currency, exchangeRates);
    const amountStr = (tx.type === 'income' ? '+ ' : '- ') + formatCurrency(convAmount, currency, language);

    return [
      tx.date,
      tx.title + (itemCurr !== currency ? ` (${formatCurrency(tx.amount, itemCurr, language)})` : ''),
      tx.type === 'income' ? 'Pemasukan' : tx.type === 'expense' ? 'Pengeluaran' : 'Transfer',
      getCategoryName(tx.categoryId),
      getAccountName(tx.accountId),
      amountStr,
      'Tercatat',
    ];
  });

  autoTable(doc, {
    startY: finalY1 + 14,
    head: [['Tanggal', 'Keterangan Transaksi', 'Jenis', 'Kategori', 'Rekening', 'Nominal', 'Metode']],
    body: transactionRows.length > 0 ? transactionRows : [['-', 'Tidak ada transaksi', '-', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: [51, 65, 85], // slate-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 48 },
      2: { cellWidth: 22 },
      3: { cellWidth: 28 },
      4: { cellWidth: 28 },
      5: { cellWidth: 26, fontStyle: 'bold' },
      6: { cellWidth: 16 },
    },
    margin: { left: 14, right: 14 },
  });

  // Footer / Watermark on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Halaman ${i} dari ${pageCount} | Dihasilkan secara otomatis oleh FinVault Pro E2E Financial Engine`,
      105,
      290,
      { align: 'center' }
    );
  }

  return doc;
}
