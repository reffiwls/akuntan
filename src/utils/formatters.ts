import { ExpenseCategory, Transaction } from '../types';

/**
 * Format angka menjadi format Rupiah Indonesia: Rp 25.000
 */
export function formatRupiah(amount: number, withPrefix = true): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return withPrefix ? 'Rp 0' : '0';
  }
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return withPrefix ? `Rp ${formatted}` : formatted;
}

/**
 * Parsing string berformat rupiah (e.g. "25.000" atau "Rp 25.000") menjadi integer
 */
export function parseRupiah(str: string): number {
  if (!str) return 0;
  // Bersihkan semua karakter selain digit
  const cleaned = str.replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

/**
 * Format string input saat pengguna mengetik agar ada pemisah ribuan otomatis
 */
export function formatInputNumber(value: string): string {
  const num = parseRupiah(value);
  if (num === 0) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Format tanggal ke format Indonesia lengkap: e.g. "Minggu, 30 Agu 2026"
 */
export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Format tanggal ringkas: e.g. "30/08/2026"
 */
export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Dapatkan style warna badge kategori yang elegan, modern, dan bebas klise AI (tanpa warna ungu)
 */
export function getCategoryBadgeStyle(category: ExpenseCategory): {
  bg: string;
  text: string;
  border: string;
} {
  switch (category) {
    case 'Bahan Baku Segar':
      return {
        bg: 'bg-emerald-50 text-emerald-800',
        text: 'text-emerald-700',
        border: 'border-emerald-200/80'
      };
    case 'Sembako & Bumbu':
      return {
        bg: 'bg-amber-50 text-amber-900',
        text: 'text-amber-800',
        border: 'border-amber-200/80'
      };
    case 'Kemasan & Wadah':
      return {
        bg: 'bg-sky-50 text-sky-900',
        text: 'text-sky-800',
        border: 'border-sky-200/80'
      };
    case 'Operasional Dapur':
      return {
        bg: 'bg-orange-50 text-orange-900',
        text: 'text-orange-800',
        border: 'border-orange-200/80'
      };
    case 'Logistik & Distribusi':
      return {
        bg: 'bg-teal-50 text-teal-900',
        text: 'text-teal-800',
        border: 'border-teal-200/80'
      };
    case 'Upah Tenaga Kerja / Harian':
      return {
        bg: 'bg-stone-100 text-stone-900',
        text: 'text-stone-800',
        border: 'border-stone-300'
      };
    case 'Lain-lain':
    default:
      return {
        bg: 'bg-slate-100 text-slate-800',
        text: 'text-slate-700',
        border: 'border-slate-300'
      };
  }
}

/**
 * Export data transaksi ke file CSV yang dapat langsung dibuka di Excel
 */
export function exportTransactionsToCsv(transactions: Transaction[], filename = 'Laporan_MBG_Pengeluaran.csv') {
  const headers = ['ID', 'Tanggal', 'Kategori', 'Item', 'Qty', 'Satuan', 'Harga Satuan (Rp)', 'Total (Rp)', 'Metode Bayar', 'Catatan', 'Status Sync', 'Waktu Dibuat'];
  
  const rows = transactions.map(t => [
    `"${t.id}"`,
    `"${t.tanggal}"`,
    `"${t.kategori}"`,
    `"${(t.item || '').replace(/"/g, '""')}"`,
    t.qty,
    `"${t.satuan}"`,
    t.hargaSatuan,
    t.total,
    `"${t.metodeBayar}"`,
    `"${(t.catatan || '').replace(/"/g, '""')}"`,
    `"${t.syncStatus || 'synced'}"`,
    `"${t.createdAt}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate formatted text report for WhatsApp sharing
 */
export function generateWhatsAppReport(
  transactions: Transaction[],
  unitName: string,
  periodText: string
): string {
  const total = transactions.reduce((acc, curr) => acc + curr.total, 0);
  const totalTunai = transactions.filter(t => t.metodeBayar === 'Tunai').reduce((acc, t) => acc + t.total, 0);
  const totalTransfer = transactions.filter(t => t.metodeBayar === 'Transfer Bank').reduce((acc, t) => acc + t.total, 0);

  // Group by category
  const categoryMap: Record<string, number> = {};
  transactions.forEach(t => {
    categoryMap[t.kategori] = (categoryMap[t.kategori] || 0) + t.total;
  });

  let text = `*📋 LAPORAN PENGELUARAN MBG / SPPG*\n`;
  text += `*Unit:* ${unitName || 'Satuan Pelayanan Pemenuhan Gizi'}\n`;
  text += `*Periode:* ${periodText}\n`;
  text += `*Waktu Cetak:* ${new Date().toLocaleString('id-ID')}\n`;
  text += `------------------------------------\n`;
  text += `*💰 TOTAL PENGELUARAN: ${formatRupiah(total)}*\n`;
  text += `💵 Tunai (Kas Lapangan): ${formatRupiah(totalTunai)}\n`;
  text += `💳 Transfer Bank: ${formatRupiah(totalTransfer)}\n`;
  text += `📊 Jumlah Item Transaksi: ${transactions.length} item\n`;
  text += `------------------------------------\n`;
  text += `*REKAPITULASI PER KATEGORI:*\n`;

  Object.entries(categoryMap).forEach(([cat, amount]) => {
    const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : '0';
    text += `• ${cat}: ${formatRupiah(amount)} (${pct}%)\n`;
  });

  text += `------------------------------------\n`;
  text += `*RINCIAN TRANSAKSI:*\n`;
  transactions.slice(0, 30).forEach((t, idx) => {
    text += `${idx + 1}. [${formatDateShort(t.tanggal)}] *${t.item}*\n   ${t.qty} ${t.satuan} @ ${formatRupiah(t.hargaSatuan)} = *${formatRupiah(t.total)}* (${t.metodeBayar})\n`;
  });

  if (transactions.length > 30) {
    text += `... dan ${transactions.length - 30} transaksi lainnya.\n`;
  }

  text += `------------------------------------\n`;
  text += `_Dicatat melalui Aplikasi MBG Kasir PWA_`;
  return text;
}
