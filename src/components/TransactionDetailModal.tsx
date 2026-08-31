import React from 'react';
import { Transaction } from '../types';
import {
  formatRupiah,
  formatDateIndo,
  getCategoryBadgeStyle
} from '../utils/formatters';
import {
  X,
  Calendar,
  Layers,
  CreditCard,
  Banknote,
  FileText,
  Clock,
  CheckCircle2,
  Edit2,
  Trash2,
  Hash,
  ShoppingBag
} from 'lucide-react';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose,
  onEdit,
  onDelete
}) => {
  if (!transaction) return null;

  const badge = getCategoryBadgeStyle(transaction.kategori);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0d2319]/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full border border-[#e2e8e2] shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 border-b border-[#1a3e32] flex items-center justify-between bg-[#0d2319] text-white">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-extrabold">Rincian Transaksi Pengeluaran</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-emerald-100/70 hover:text-white rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-stone-700">
          {/* Main Title & Total */}
          <div className="p-4 rounded-2xl bg-[#f8faf8] border border-[#e2e8e2]">
            <div className="flex items-center justify-between mb-1">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg} ${badge.border}`}>
                {transaction.kategori}
              </span>
              <span className="text-[10px] text-stone-400 font-mono">
                {transaction.id}
              </span>
            </div>
            <h4 className="text-base font-extrabold text-[#0d2319] mt-1 leading-snug">
              {transaction.item}
            </h4>
            <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-[#e2e8e2]">
              <span className="text-stone-500 font-medium">Total Pengeluaran:</span>
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {formatRupiah(transaction.total)}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between py-1.5 border-b border-[#f0f4f0]">
              <span className="text-stone-500 flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                Tanggal Transaksi
              </span>
              <span className="font-bold text-[#0d2319]">
                {formatDateIndo(transaction.tanggal)}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-[#f0f4f0]">
              <span className="text-stone-500 flex items-center gap-1.5 font-medium">
                <Hash className="w-3.5 h-3.5 text-stone-400" />
                Jumlah (Qty) & Satuan
              </span>
              <span className="font-bold text-[#0d2319] font-mono">
                {transaction.qty} {transaction.satuan}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-[#f0f4f0]">
              <span className="text-stone-500 flex items-center gap-1.5 font-medium">
                <Layers className="w-3.5 h-3.5 text-stone-400" />
                Harga Satuan
              </span>
              <span className="font-bold text-[#0d2319] font-mono">
                {formatRupiah(transaction.hargaSatuan)} / {transaction.satuan}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-[#f0f4f0]">
              <span className="text-stone-500 flex items-center gap-1.5 font-medium">
                {transaction.metodeBayar === 'Tunai' ? (
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <CreditCard className="w-3.5 h-3.5 text-sky-600" />
                )}
                Metode Pembayaran
              </span>
              <span className="font-bold text-[#0d2319]">
                {transaction.metodeBayar}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-[#f0f4f0]">
              <span className="text-stone-500 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-stone-400" />
                Status Sinkronisasi
              </span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                  transaction.syncStatus === 'pending'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {transaction.syncStatus === 'pending' ? 'Pending Cloud Sync' : 'Tersinkron di Sheets'}
              </span>
            </div>

            {transaction.catatan && (
              <div className="py-1.5">
                <span className="text-stone-500 block mb-1 font-medium">Catatan / Keterangan Toko:</span>
                <p className="p-2.5 rounded-xl bg-[#f8faf8] border border-[#e2e8e2] text-stone-700 leading-relaxed font-medium">
                  {transaction.catatan}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#e2e8e2] bg-[#f8faf8] flex items-center justify-between gap-2">
          <button
            onClick={() => {
              if (window.confirm('Yakin ingin menghapus transaksi ini?')) {
                onDelete(transaction.id);
                onClose();
              }
            }}
            className="px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-stone-600 hover:text-[#0d2319] rounded-xl"
            >
              Tutup
            </button>
            <button
              onClick={() => {
                onClose();
                onEdit(transaction);
              }}
              className="px-4 py-2 bg-[#0d2319] hover:bg-[#143527] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-soft-xs transition-all active:scale-95"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Transaksi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
