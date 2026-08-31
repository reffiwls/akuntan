import React, { useState } from 'react';
import { AppSettings, Transaction, ExpenseCategory } from '../types';
import {
  formatRupiah,
  formatDateIndo,
  generateWhatsAppReport
} from '../utils/formatters';
import {
  Calendar,
  ChevronRight,
  ReceiptText,
  CreditCard,
  Banknote,
  UtensilsCrossed,
  TrendingUp,
  Clock,
  Share2,
  Package,
  Sparkles,
  ShoppingBag,
  Flame,
  Users,
  Truck
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
  onOpenSmartImport?: () => void;
}

type PeriodFilter = 'today' | '7days' | 'month' | 'all';

// Helper for category-based pastel circle icons
const getCategoryIconDetails = (kategori: ExpenseCategory) => {
  switch (kategori) {
    case 'Bahan Baku Segar':
      return {
        icon: ShoppingBag,
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        labelBg: 'bg-emerald-50 text-emerald-800 border-emerald-200/70'
      };
    case 'Sembako & Bumbu':
      return {
        icon: Package,
        bg: 'bg-amber-50 text-amber-700 border-amber-100',
        labelBg: 'bg-amber-50 text-amber-800 border-amber-200/70'
      };
    case 'Kemasan & Wadah':
      return {
        icon: Package,
        bg: 'bg-blue-50 text-blue-700 border-blue-100',
        labelBg: 'bg-blue-50 text-blue-800 border-blue-200/70'
      };
    case 'Operasional Dapur':
      return {
        icon: Flame,
        bg: 'bg-orange-50 text-orange-700 border-orange-100',
        labelBg: 'bg-orange-50 text-orange-800 border-orange-200/70'
      };
    case 'Upah Tenaga Kerja / Harian':
      return {
        icon: Users,
        bg: 'bg-teal-50 text-teal-700 border-teal-100',
        labelBg: 'bg-teal-50 text-teal-800 border-teal-200/70'
      };
    case 'Logistik & Distribusi':
      return {
        icon: Truck,
        bg: 'bg-sky-50 text-sky-700 border-sky-100',
        labelBg: 'bg-sky-50 text-sky-800 border-sky-200/70'
      };
    default:
      return {
        icon: ReceiptText,
        bg: 'bg-slate-50 text-slate-700 border-slate-200',
        labelBg: 'bg-slate-50 text-slate-800 border-slate-200'
      };
  }
};

export const DashboardTab: React.FC<DashboardTabProps> = ({
  transactions,
  settings,
  onNavigateToInput,
  onNavigateToHistory,
  onSelectTransaction,
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
    <div className="space-y-3.5 pb-32 pt-1 max-w-md mx-auto">
      {/* Date & Period Selector Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {formatDateIndo(todayStr)}
              </p>
              <h2 className="text-xs font-bold text-slate-800">
                Ringkasan Kas Operasional
              </h2>
            </div>
          </div>

          <button
            onClick={() =>
              onShareWhatsApp(
                generateWhatsAppReport(filteredTransactions, settings.unitName, getPeriodLabel())
              )
            }
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-all active:scale-95"
            title="Bagikan Rekap WhatsApp"
            aria-label="Bagikan Rekap WhatsApp"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Period Filter Pills */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#F3F6F4] rounded-xl text-xs font-semibold">
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
              className={`py-1.5 px-1.5 text-center rounded-lg transition-all text-[11px] font-bold ${
                period === p.id
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1 Main Hero Metric Card: Solid Deep Forest (#0D281E) */}
      <div className="relative overflow-hidden bg-[#0D281E] rounded-3xl p-5 text-white shadow-[0_12px_32px_rgba(13,40,30,0.35)] border border-[#1A3E32]">
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-600/40 text-[11px] font-semibold text-emerald-300">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>Total Pengeluaran ({getPeriodLabel()})</span>
            </span>

            <span className="text-[10px] text-slate-300/80 font-medium">
              {totalCountPeriod} transaksi
            </span>
          </div>

          <div>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight tabular-nums">
              {formatRupiah(totalExpensePeriod)}
            </h3>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-300/90 pt-2 border-t border-white/10 font-medium">
            <span>Rata-rata belanja aktif</span>
            <span className="font-bold text-white tabular-nums">
              {totalCountPeriod > 0
                ? formatRupiah(Math.round(totalExpensePeriod / totalCountPeriod))
                : 'Rp 0'}
              <span className="text-slate-400 font-normal text-[11px]"> /item</span>
            </span>
          </div>
        </div>

        {/* Subtle decorative glow */}
        <div className="absolute right-0 bottom-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* 3 Metric Breakdown Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Metric 1: Kas Tunai */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
              Tunai
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60">
              {totalExpensePeriod > 0
                ? Math.round((totalTunaiPeriod / totalExpensePeriod) * 100)
                : 0}
              %
            </span>
          </div>
          <p className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight tabular-nums">
            {formatRupiah(totalTunaiPeriod)}
          </p>
          <span className="text-[9px] text-slate-400 font-medium mt-1">Kas langsung</span>
        </div>

        {/* Metric 2: Transfer Bank */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-sky-600" />
              Transfer
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-sky-50 text-sky-800 border border-sky-200/60">
              {totalExpensePeriod > 0
                ? Math.round((totalTransferPeriod / totalExpensePeriod) * 100)
                : 0}
              %
            </span>
          </div>
          <p className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight tabular-nums">
            {formatRupiah(totalTransferPeriod)}
          </p>
          <span className="text-[9px] text-slate-400 font-medium mt-1">Vendor/bank</span>
        </div>

        {/* Metric 3: Estimasi Biaya / Porsi */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
              <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />
              / Porsi
            </span>
            <span className="text-[9px] font-extrabold px-1 py-0.2 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60">
              {estPortions}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight tabular-nums">
            {formatRupiah(costPerPortionToday)}
          </p>
          <span className="text-[9px] text-slate-400 font-medium mt-1">Alokasi hari ini</span>
        </div>
      </div>

      {/* Transaksi Terkini with Ergonomic Clean Layout */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ReceiptText className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              Transaksi Terkini
            </h3>
          </div>
          <button
            onClick={onNavigateToHistory}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
          >
            <span>Semua ({transactions.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-xs text-slate-400 font-medium">
              Belum ada transaksi pengeluaran tercatat.
            </p>
            <button
              onClick={onNavigateToInput}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              + Catat Belanja
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((t) => {
              const { icon: CatIcon, bg: iconBg, labelBg } = getCategoryIconDetails(t.kategori);

              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTransaction(t)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-[#F3F6F4]/60 -mx-2 px-2 rounded-2xl cursor-pointer transition-colors"
                >
                  {/* Left: Pastel Circle Icon + Item Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 ${iconBg}`}
                    >
                      <CatIcon className="w-4 h-4 stroke-[2.2]" />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {t.item}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium flex-wrap">
                        <span className={`px-1.5 py-0.2 rounded border text-[9px] font-semibold ${labelBg}`}>
                          {t.kategori}
                        </span>
                        <span>•</span>
                        <span>{t.qty} {t.satuan}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {t.tanggal}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Nominal & Status */}
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight tabular-nums block">
                      {formatRupiah(t.total)}
                    </span>
                    <span
                      className={`inline-block text-[8px] font-bold px-1.5 py-0.2 rounded-full ${
                        t.syncStatus === 'pending'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {t.syncStatus === 'pending' ? 'Pending' : 'Synced'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
