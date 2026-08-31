import React, { useState, useMemo } from 'react';
import {
  ExpenseCategory,
  EXPENSE_CATEGORIES,
  PaymentMethod,
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
  Search,
  Download,
  Share2,
  Trash2,
  Edit2,
  X,
  Receipt,
  Printer,
  FileText,
  Banknote,
  CreditCard
} from 'lucide-react';

interface HistoryTabProps {
  transactions: Transaction[];
  settings: AppSettings;
  onViewDetail: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onShareWhatsApp: (text: string) => void;
  onPrintReport?: (filteredData: Transaction[], title: string) => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  transactions,
  settings,
  onViewDetail,
  onEdit,
  onDelete,
  onShareWhatsApp,
  onPrintReport
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPayment, setSelectedPayment] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filtered transactions
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      // Search
      const matchSearch =
        !searchTerm.trim() ||
        t.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.catatan && t.catatan.toLowerCase().includes(searchTerm.toLowerCase())) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase());

      // Category
      const matchCat = selectedCategory === 'ALL' || t.kategori === selectedCategory;

      // Payment method
      const matchPay = selectedPayment === 'ALL' || t.metodeBayar === selectedPayment;

      // Date
      const matchDate = !selectedDate || t.tanggal === selectedDate;

      return matchSearch && matchCat && matchPay && matchDate;
    });
  }, [transactions, searchTerm, selectedCategory, selectedPayment, selectedDate]);

  // Aggregate stats of filtered list
  const totalFilteredAmount = useMemo(() => {
    return filtered.reduce((sum, t) => sum + t.total, 0);
  }, [filtered]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('ALL');
    setSelectedPayment('ALL');
    setSelectedDate('');
  };

  const handlePrint = () => {
    if (onPrintReport) {
      onPrintReport(filtered, `Riwayat Transaksi Terfilter (${filtered.length} Item)`);
    } else {
      window.print();
    }
  };

  const hasActiveFilter = Boolean(searchTerm || selectedCategory !== 'ALL' || selectedPayment !== 'ALL' || selectedDate);

  return (
    <div className="space-y-3.5 pb-28 pt-1 max-w-md mx-auto">
      {/* Search & Actions Bar */}
      <div className="bg-white rounded-3xl border border-[#e2e8e2] p-4 shadow-soft-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-[#0d2319]">Riwayat Transaksi</h2>
            <p className="text-[11px] text-stone-500 font-medium">
              Total {filtered.length} transaksi ({formatRupiah(totalFilteredAmount)})
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="history-export-csv-btn"
              onClick={() => exportTransactionsToCsv(filtered, `Transaksi_MBG_${new Date().toISOString().slice(0, 10)}.csv`)}
              className="p-2 text-stone-600 hover:text-[#0d2319] bg-[#f6f8f6] hover:bg-[#eef2ee] border border-[#e2e8e2] rounded-xl transition-all duration-150 active:scale-95 shadow-soft-xs"
              title="Export ke CSV / Excel"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              id="history-share-wa-btn"
              onClick={() => onShareWhatsApp(generateWhatsAppReport(filtered, settings.unitName, 'Riwayat Terfilter'))}
              className="p-2 text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all duration-150 active:scale-95 shadow-soft-xs"
              title="Kirim Ringkasan ke WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Button: Cetak / Unduh PDF */}
        <button
          id="history-print-pdf-btn"
          onClick={handlePrint}
          className="w-full py-2.5 px-3 bg-emerald-900 hover:bg-[#0d2319] active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-150 shadow-soft-xs"
        >
          <Printer className="w-4 h-4" />
          <span>📄 Cetak / Unduh PDF Laporan</span>
        </button>

        {/* Search Input Box */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="history-search-input"
            type="text"
            placeholder="Cari nama bahan, toko, ID transaksi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl text-xs font-semibold text-[#0d2319] placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Category Filter */}
          <div>
            <select
              id="filter-category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-2 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl text-xs font-semibold text-[#0d2319] focus:outline-none"
            >
              <option value="ALL">Semua Kategori</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              id="filter-payment-select"
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              className="w-full px-2.5 py-2 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl text-xs font-semibold text-[#0d2319] focus:outline-none"
            >
              <option value="ALL">Semua Metode</option>
              <option value="Tunai">Kas Tunai</option>
              <option value="Transfer Bank">Transfer Bank</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="col-span-2">
            <input
              id="filter-date-input"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-2.5 py-2 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl text-xs font-semibold text-[#0d2319] focus:outline-none"
            />
          </div>
        </div>

        {/* Active Filters Pill Bar */}
        {hasActiveFilter && (
          <div className="flex items-center justify-between pt-1 border-t border-[#f0f4f0] text-[11px]">
            <span className="text-stone-500 font-medium">Filter aktif diterapkan</span>
            <button
              onClick={handleResetFilters}
              className="font-bold text-emerald-800 hover:text-emerald-950 underline"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Transaction Cards List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#e2e8e2] p-8 text-center shadow-soft-sm space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#f0f4f0] text-stone-500 mx-auto flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-[#0d2319]">Tidak ada transaksi yang cocok</p>
          <p className="text-[11px] text-stone-500">
            Coba ubah kata kunci pencarian atau bersihkan filter yang aktif.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((t) => {
            const badge = getCategoryBadgeStyle(t.kategori);
            const isDeletingThis = deleteConfirmId === t.id;

            return (
              <div
                key={t.id}
                className="bg-white rounded-3xl border border-[#e2e8e2] p-4 shadow-soft-sm hover:shadow-soft-md transition-all duration-150 space-y-2.5"
              >
                {/* Header info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg} ${badge.border}`}>
                        {t.kategori}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {formatDateIndo(t.tanggal)}
                      </span>
                    </div>
                    <h3
                      onClick={() => onViewDetail(t)}
                      className="text-sm font-extrabold text-[#0d2319] hover:text-emerald-800 cursor-pointer leading-snug"
                    >
                      {t.item}
                    </h3>
                  </div>

                  {/* Total price */}
                  <div className="text-right flex-shrink-0">
                    <span className="text-base font-black text-slate-900 tracking-tight block">
                      {formatRupiah(t.total)}
                    </span>
                    <span
                      className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        t.syncStatus === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {t.syncStatus === 'pending' ? 'Pending' : 'Synced'}
                    </span>
                  </div>
                </div>

                {/* Sub-details */}
                <div className="flex items-center justify-between text-xs text-stone-500 pt-1 border-t border-[#f0f4f0]">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="font-semibold text-stone-700">
                      {t.qty} {t.satuan} @ {formatRupiah(t.hargaSatuan)}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-medium">
                      {t.metodeBayar === 'Tunai' ? (
                        <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <CreditCard className="w-3.5 h-3.5 text-sky-600" />
                      )}
                      {t.metodeBayar}
                    </span>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      id={`btn-edit-${t.id}`}
                      onClick={() => onEdit(t)}
                      className="p-1.5 text-stone-500 hover:text-[#0d2319] hover:bg-[#f0f4f0] rounded-lg transition-colors"
                      title="Edit Transaksi"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {isDeletingThis ? (
                      <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-1 rounded-lg">
                        <button
                          onClick={() => {
                            onDelete(t.id);
                            setDeleteConfirmId(null);
                          }}
                          className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded"
                        >
                          Hapus
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="p-0.5 text-stone-400 hover:text-stone-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        id={`btn-delete-${t.id}`}
                        onClick={() => setDeleteConfirmId(t.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Transaksi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {t.catatan && (
                  <p className="text-[11px] text-stone-600 bg-[#f8faf8] p-2 rounded-xl border border-[#e2e8e2] font-medium">
                    <span className="font-bold text-stone-700">Catatan:</span> {t.catatan}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
