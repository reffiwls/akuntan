import React, { useState, useMemo } from 'react';
import {
  ExpenseCategory,
  EXPENSE_CATEGORIES,
  Transaction,
  AppSettings
} from '../types';
import {
  formatRupiah,
  formatDateIndo,
  formatDateShort,
  getCategoryBadgeStyle,
  exportTransactionsToCsv,
  generateWhatsAppReport
} from '../utils/formatters';
import {
  Download,
  Share2,
  Printer,
  Calendar,
  Layers,
  Banknote,
  CreditCard,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';

interface ReportTabProps {
  transactions: Transaction[];
  settings: AppSettings;
  onShareWhatsApp: (text: string) => void;
  onPrintReport?: (filteredData: Transaction[], title: string, customRange?: { start?: string; end?: string }) => void;
}

type ReportRange = 'today' | 'this_week' | 'this_month' | 'custom';

export const ReportTab: React.FC<ReportTabProps> = ({
  transactions,
  settings,
  onShareWhatsApp,
  onPrintReport
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [rangeType, setRangeType] = useState<ReportRange>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>(todayStr.slice(0, 8) + '01');
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  // Filter transactions according to selected range
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (rangeType === 'today') {
        return t.tanggal === todayStr;
      }
      if (rangeType === 'this_week') {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
        return new Date(t.tanggal + 'T00:00:00') >= startOfWeek;
      }
      if (rangeType === 'this_month') {
        return t.tanggal.startsWith(todayStr.slice(0, 7));
      }
      if (rangeType === 'custom') {
        if (!customStartDate || !customEndDate) return true;
        return t.tanggal >= customStartDate && t.tanggal <= customEndDate;
      }
      return true;
    });
  }, [transactions, rangeType, todayStr, customStartDate, customEndDate]);

  // Aggregate statistics
  const totalAmount = useMemo(() => {
    return filteredTransactions.reduce((acc, curr) => acc + curr.total, 0);
  }, [filteredTransactions]);

  const totalTunai = useMemo(() => {
    return filteredTransactions.filter((t) => t.metodeBayar === 'Tunai').reduce((acc, t) => acc + t.total, 0);
  }, [filteredTransactions]);

  const totalTransfer = useMemo(() => {
    return filteredTransactions.filter((t) => t.metodeBayar === 'Transfer Bank').reduce((acc, t) => acc + t.total, 0);
  }, [filteredTransactions]);

  // Group by category
  const categoryStats = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    filteredTransactions.forEach((t) => {
      if (!map[t.kategori]) {
        map[t.kategori] = { total: 0, count: 0 };
      }
      map[t.kategori].total += t.total;
      map[t.kategori].count += 1;
    });

    return Object.entries(map)
      .map(([kategori, val]) => ({
        kategori: kategori as ExpenseCategory,
        total: val.total,
        count: val.count,
        percentage: totalAmount > 0 ? (val.total / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredTransactions, totalAmount]);

  const rangeLabel = () => {
    switch (rangeType) {
      case 'today':
        return `Hari Ini (${formatDateShort(todayStr)})`;
      case 'this_week':
        return 'Minggu Ini';
      case 'this_month':
        return `Bulan Ini (${new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date())})`;
      case 'custom':
        return `${formatDateShort(customStartDate)} s/d ${formatDateShort(customEndDate)}`;
    }
  };

  const handlePrint = () => {
    if (onPrintReport) {
      onPrintReport(
        filteredTransactions,
        `Rekap Pengeluaran MBG (${rangeLabel()})`,
        rangeType === 'custom' ? { start: customStartDate, end: customEndDate } : undefined
      );
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-3.5 pb-28 pt-1 max-w-md mx-auto">
      {/* Header & Period Filters */}
      <div className="bg-white rounded-3xl border border-[#e2e8e2] p-4 shadow-soft-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-[#0d2319]">Laporan & Rekapitulasi</h2>
            <p className="text-[11px] text-stone-500 font-medium">
              SPPG: {settings.unitName || 'SPPG Mandiri'}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="report-export-csv-btn"
              onClick={() => exportTransactionsToCsv(filteredTransactions, `Laporan_MBG_${rangeType}_${todayStr}.csv`)}
              className="p-2 text-stone-700 hover:text-[#0d2319] bg-[#f6f8f6] hover:bg-[#eef2ee] border border-[#e2e8e2] rounded-xl transition-all duration-150 active:scale-95 shadow-soft-xs"
              title="Download File CSV Excel"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              id="report-share-wa-btn"
              onClick={() => onShareWhatsApp(generateWhatsAppReport(filteredTransactions, settings.unitName, rangeLabel()))}
              className="p-2 text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all duration-150 active:scale-95 shadow-soft-xs"
              title="Kirim ke WhatsApp Pimpinan"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Button: Cetak / Unduh PDF */}
        <button
          id="report-print-pdf-btn"
          onClick={handlePrint}
          className="w-full py-2.5 px-3 bg-emerald-900 hover:bg-[#0d2319] active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-150 shadow-soft-xs"
        >
          <Printer className="w-4 h-4" />
          <span>📄 Cetak / Unduh PDF Laporan</span>
        </button>

        {/* Range Selector Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#f0f4f0] rounded-2xl text-xs font-semibold">
          {[
            { id: 'today', label: 'Hari Ini' },
            { id: 'this_week', label: 'Minggu' },
            { id: 'this_month', label: 'Bulan Ini' },
            { id: 'custom', label: 'Kustom' }
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRangeType(r.id as ReportRange)}
              className={`py-1.5 px-1 text-center rounded-xl transition-all duration-150 text-[11px] font-bold ${
                rangeType === r.id
                  ? 'bg-white text-[#0d2319] shadow-soft-xs'
                  : 'text-stone-600 hover:text-[#0d2319]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Custom date range inputs */}
        {rangeType === 'custom' && (
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#f0f4f0] text-xs">
            <div>
              <label className="block text-[10px] font-bold text-stone-600 mb-1">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl text-xs font-semibold text-[#0d2319]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-600 mb-1">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl text-xs font-semibold text-[#0d2319]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary Highlight Card */}
      <div className="bg-[#0d2319] rounded-3xl p-4 sm:p-5 text-white shadow-soft-md border border-[#1a3e32]">
        <div className="space-y-3">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">
              Total Pengeluaran ({rangeLabel()})
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {formatRupiah(totalAmount)}
            </h3>
            <p className="text-xs text-emerald-100/70 font-medium">
              {filteredTransactions.length} transaksi tercatat
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-white/10">
            <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
              <span className="text-[10px] text-emerald-200/80 font-bold block">Kas Tunai</span>
              <span className="text-xs sm:text-sm font-black text-white tracking-tight">
                {formatRupiah(totalTunai)}
              </span>
            </div>
            <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
              <span className="text-[10px] text-sky-200/80 font-bold block">Transfer Bank</span>
              <span className="text-xs sm:text-sm font-black text-white tracking-tight">
                {formatRupiah(totalTransfer)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Allocation Distribution */}
      <div className="bg-white rounded-3xl border border-[#e2e8e2] p-4 shadow-soft-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#f0f4f0] pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-800" />
            <h3 className="text-xs sm:text-sm font-extrabold text-[#0d2319]">Distribusi Anggaran</h3>
          </div>
          <span className="text-[11px] font-bold text-stone-500">
            {categoryStats.length} Kategori
          </span>
        </div>

        {categoryStats.length === 0 ? (
          <p className="text-xs text-stone-500 text-center py-4">
            Belum ada data pengeluaran pada periode ini.
          </p>
        ) : (
          <div className="space-y-3">
            {categoryStats.map((item) => {
              const badge = getCategoryBadgeStyle(item.kategori);

              return (
                <div key={item.kategori} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#0d2319] flex items-center gap-1.5 truncate">
                      <span className={`w-2 h-2 rounded-full ${badge.bg.split(' ')[0]} flex-shrink-0`}></span>
                      <span className="truncate">{item.kategori}</span>
                      <span className="text-[10px] text-stone-400 font-normal">
                        ({item.count})
                      </span>
                    </span>
                    <div className="text-right flex-shrink-0 pl-2">
                      <span className="font-extrabold font-mono text-[#0d2319]">
                        {formatRupiah(item.total)}
                      </span>
                      <span className="text-[10px] text-stone-500 font-bold ml-1">
                        ({item.percentage.toFixed(0)}%)
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full bg-[#f0f4f0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-700 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(item.percentage, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Official SPPG Verification Card */}
      <div className="bg-[#f0f5f0] border border-[#cfe0cf] rounded-3xl p-4 shadow-soft-sm space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-800" />
          <h4 className="text-xs font-extrabold text-[#0d2319]">Pengesahan Laporan Lapangan MBG</h4>
        </div>
        <p className="text-[11px] text-stone-600 leading-relaxed font-medium">
          Laporan ini tersinkronisasi dengan pembukuan operasional MBG dan siap dicetak/diunduh sebagai dokumen pertanggungjawaban resmi.
        </p>
        <div className="pt-1.5 flex items-center justify-between border-t border-[#d8e4d8] text-[10px] text-stone-500 font-mono">
          <span>ID UNIT: {settings.unitId || 'SPPG-01'}</span>
          <span>{new Date().toLocaleDateString('id-ID')}</span>
        </div>
      </div>
    </div>
  );
};
