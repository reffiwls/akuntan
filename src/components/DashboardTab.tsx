import React, { useState } from 'react';
import { AppSettings, Transaction } from '../types';
import {
  formatRupiah,
  formatDateIndo,
  formatDateShort,
  getCategoryBadgeStyle,
  generateWhatsAppReport
} from '../utils/formatters';
import {
  TrendingUp,
  Wallet,
  Calendar,
  Layers,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Share2,
  ChevronRight,
  ReceiptText,
  CreditCard,
  Banknote,
  CheckCircle2,
  Clock,
  Sparkles,
  UtensilsCrossed
} from 'lucide-react';

interface DashboardTabProps {
  transactions: Transaction[];
  settings: AppSettings;
  onNavigateToInput: () => void;
  onNavigateToHistory: () => void;
  onNavigateToReports: () => void;
  onSelectTransaction: (transaction: Transaction) => void;
  onSync: () => void;
  isSyncing: boolean;
  onShareWhatsApp: (text: string) => void;
}

type PeriodFilter = 'today' | '7days' | 'month' | 'all';

export const DashboardTab: React.FC<DashboardTabProps> = ({
  transactions,
  settings,
  onNavigateToInput,
  onNavigateToHistory,
  onNavigateToReports,
  onSelectTransaction,
  onSync,
  isSyncing,
  onShareWhatsApp
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const todayStr = new Date().toISOString().slice(0, 10);

  // Filter transactions according to selected period
  const filteredTransactions = transactions.filter((t) => {
    if (period === 'today') {
      return t.tanggal === todayStr;
    }
    if (period === '7days') {
      const now = new Date();
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const tDate = new Date(t.tanggal + 'T00:00:00');
      return tDate >= past7;
    }
    if (period === 'month') {
      const currentMonth = todayStr.slice(0, 7);
      return t.tanggal.startsWith(currentMonth);
    }
    return true;
  });

  // Calculate metrics
  const totalExpenseToday = transactions
    .filter((t) => t.tanggal === todayStr)
    .reduce((sum, t) => sum + t.total, 0);

  const totalExpensePeriod = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
  const totalCountPeriod = filteredTransactions.length;

  const totalTunaiPeriod = filteredTransactions
    .filter((t) => t.metodeBayar === 'Tunai')
    .reduce((sum, t) => sum + t.total, 0);

  const totalTransferPeriod = filteredTransactions
    .filter((t) => t.metodeBayar === 'Transfer Bank')
    .reduce((sum, t) => sum + t.total, 0);

  // Estimated per portion for today
  const estPortions = settings.targetPortionsDaily || 1500;
  const costPerPortionToday = estPortions > 0 ? Math.round(totalExpenseToday / estPortions) : 0;

  // Recent 5 transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.createdAt || b.tanggal).getTime() - new Date(a.createdAt || a.tanggal).getTime())
    .slice(0, 5);

  const getPeriodLabel = () => {
    switch (period) {
      case 'today':
        return 'Hari Ini';
      case '7days':
        return '7 Hari Terakhir';
      case 'month':
        return 'Bulan Ini';
      case 'all':
        return 'Semua Data';
    }
  };

  return (
    <div className="space-y-4 pb-28 pt-1">
      {/* Top Banner: Date & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white rounded-2xl border border-[#e2e8e2] p-3.5 shadow-soft-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
              {formatDateIndo(todayStr)}
            </p>
            <p className="text-xs font-bold text-[#0d2319]">
              Ringkasan Kas & Pengeluaran Dapur
            </p>
          </div>
        </div>

        {/* Period Filter Pills */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#f0f4f0] rounded-xl text-xs font-semibold">
          {[
            { id: 'today', label: 'Hari Ini' },
            { id: '7days', label: '7 Hari' },
            { id: 'month', label: 'Bulan Ini' },
            { id: 'all', label: 'Semua' }
          ].map((p) => (
            <button
              key={p.id}
              id={`filter-period-${p.id}`}
              onClick={() => setPeriod(p.id as PeriodFilter)}
              className={`py-1.5 px-2 text-center rounded-lg transition-all duration-150 text-[11px] font-bold ${
                period === p.id
                  ? 'bg-white text-[#0d2319] shadow-soft-xs'
                  : 'text-stone-600 hover:text-[#0d2319]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Financial Hero Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0d2319] via-[#143527] to-[#0a1b13] rounded-3xl p-5 sm:p-6 text-white shadow-soft-lg border border-[#1a3e32]">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-600/50 text-[11px] font-semibold text-emerald-300">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Total Pengeluaran ({getPeriodLabel()})</span>
            </div>

            <div className="flex items-baseline gap-2 pt-1">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-mono">
                {formatRupiah(totalExpensePeriod)}
              </h2>
            </div>

            <p className="text-xs text-emerald-100/70 font-medium">
              {totalCountPeriod} item transaksi tercatat dan terverifikasi
            </p>
          </div>

          {/* Quick Action Button on Hero */}
          <div className="flex items-center gap-2">
            <button
              id="dash-quick-add-btn"
              onClick={onNavigateToInput}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-[#0d2319] font-bold text-xs rounded-xl shadow-soft-md flex items-center justify-center gap-1.5 transition-all duration-150"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Catat Belanja</span>
            </button>

            <button
              id="dash-share-wa-btn"
              onClick={() => onShareWhatsApp(generateWhatsAppReport(filteredTransactions, settings.unitName, getPeriodLabel()))}
              className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl backdrop-blur-xs transition-all duration-150"
              title="Bagikan Rekap ke WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Decorative ambient subtle circle */}
        <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
      </div>

      {/* Grid: 3 Breakdown Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1: Kas Tunai */}
        <div className="bg-white rounded-2xl p-4 border border-[#e2e8e2] shadow-soft-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-600 flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-emerald-600" />
              Kas Tunai
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {totalExpensePeriod > 0 ? Math.round((totalTunaiPeriod / totalExpensePeriod) * 100) : 0}%
            </span>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-[#0d2319] font-mono">
            {formatRupiah(totalTunaiPeriod)}
          </p>
          <p className="text-[11px] text-stone-500 mt-1 font-medium">
            Pembelian kas/tunai langsung
          </p>
        </div>

        {/* Metric 2: Transfer Bank */}
        <div className="bg-white rounded-2xl p-4 border border-[#e2e8e2] shadow-soft-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-600 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-sky-600" />
              Transfer Bank
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
              {totalExpensePeriod > 0 ? Math.round((totalTransferPeriod / totalExpensePeriod) * 100) : 0}%
            </span>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-[#0d2319] font-mono">
            {formatRupiah(totalTransferPeriod)}
          </p>
          <p className="text-[11px] text-stone-500 mt-1 font-medium">
            Pembayaran vendor non-tunai
          </p>
        </div>

        {/* Metric 3: Estimasi Biaya / Porsi */}
        <div className="bg-white rounded-2xl p-4 border border-[#e2e8e2] shadow-soft-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-600 flex items-center gap-1.5">
              <UtensilsCrossed className="w-4 h-4 text-amber-600" />
              Biaya / Porsi Hari Ini
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
              Target: {estPortions}
            </span>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-amber-800 font-mono">
            {formatRupiah(costPerPortionToday)}
          </p>
          <p className="text-[11px] text-stone-500 mt-1 font-medium">
            Alokasi riil per porsi MBG
          </p>
        </div>
      </div>

      {/* Recent Transactions Card */}
      <div className="bg-white rounded-3xl border border-[#e2e8e2] shadow-soft-sm p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between border-b border-[#f0f4f0] pb-3">
          <div className="flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-extrabold text-[#0d2319]">Transaksi Terakhir</h3>
          </div>
          <button
            id="dash-view-all-history"
            onClick={onNavigateToHistory}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 transition-colors"
          >
            <span>Lihat Semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
              <ReceiptText className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-stone-600">Belum ada transaksi pengeluaran</p>
            <p className="text-[11px] text-stone-400">
              Klik tombol di bawah untuk mencatat pembelian pertama
            </p>
            <button
              onClick={onNavigateToInput}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#0d2319] text-white text-xs font-bold rounded-xl shadow-soft-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Input Belanja Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((t) => {
              const badge = getCategoryBadgeStyle(t.kategori);
              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTransaction(t)}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-[#f6f8f6] active:bg-[#edf2ed] border border-transparent hover:border-[#e2e8e2] cursor-pointer transition-all duration-150"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#f0f4f0] text-[#0d2319] flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">
                      {t.metodeBayar === 'Tunai' ? '💵' : '💳'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg} ${badge.border}`}>
                          {t.kategori}
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {formatDateShort(t.tanggal)}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-[#0d2319] truncate mt-1">
                        {t.item}
                      </h4>
                      <p className="text-[11px] text-stone-500 font-medium">
                        {t.qty} {t.satuan} • {t.metodeBayar}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 pl-2">
                    <p className="text-xs sm:text-sm font-extrabold text-[#0d2319] font-mono">
                      {formatRupiah(t.total)}
                    </p>
                    <span
                      className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        t.syncStatus === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {t.syncStatus === 'pending' ? 'Pending Sync' : 'Synced'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Navigation Footer Link to Reports */}
      <div className="bg-[#eef4ee] border border-[#d6e2d6] rounded-2xl p-3.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-800" />
          <span className="font-bold text-[#0d2319]">Ingin melihat rekapitulasi lengkap & cetak slip SPPG?</span>
        </div>
        <button
          onClick={onNavigateToReports}
          className="font-extrabold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1"
        >
          <span>Buka Laporan</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
