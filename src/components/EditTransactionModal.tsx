import React, { useState, useEffect } from 'react';
import {
  ExpenseCategory,
  EXPENSE_CATEGORIES,
  PaymentMethod,
  Transaction,
  COMMON_UNITS
} from '../types';
import { formatRupiah, parseRupiah, formatInputNumber } from '../utils/formatters';
import {
  X,
  Calendar,
  Layers,
  Tag,
  CreditCard,
  Banknote,
  FileText,
  Calculator,
  Save,
  Edit
} from 'lucide-react';

interface EditTransactionModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (updated: Transaction) => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  transaction,
  onClose,
  onSave
}) => {
  if (!transaction) return null;

  const [tanggal, setTanggal] = useState(transaction.tanggal);
  const [kategori, setKategori] = useState<ExpenseCategory>(transaction.kategori);
  const [item, setItem] = useState(transaction.item);
  const [qty, setQty] = useState(transaction.qty.toString());
  const [satuan, setSatuan] = useState(transaction.satuan);
  const [hargaSatuanRaw, setHargaSatuanRaw] = useState(
    formatInputNumber(transaction.hargaSatuan.toString())
  );
  const [isCustomTotal, setIsCustomTotal] = useState(false);
  const [customTotalRaw, setCustomTotalRaw] = useState(
    formatInputNumber(transaction.total.toString())
  );
  const [metodeBayar, setMetodeBayar] = useState<PaymentMethod>(transaction.metodeBayar);
  const [catatan, setCatatan] = useState(transaction.catatan || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transaction) {
      setTanggal(transaction.tanggal);
      setKategori(transaction.kategori);
      setItem(transaction.item);
      setQty(transaction.qty.toString());
      setSatuan(transaction.satuan);
      setHargaSatuanRaw(formatInputNumber(transaction.hargaSatuan.toString()));
      setMetodeBayar(transaction.metodeBayar);
      setCatatan(transaction.catatan || '');
      setCustomTotalRaw(formatInputNumber(transaction.total.toString()));
    }
  }, [transaction]);

  const qtyNum = parseFloat(qty) || 0;
  const hargaNum = parseRupiah(hargaSatuanRaw);
  const autoTotal = Math.round(qtyNum * hargaNum);
  const currentTotal = isCustomTotal ? parseRupiah(customTotalRaw) : autoTotal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!item.trim()) {
      setError('Nama item belanja wajib diisi');
      return;
    }
    if (qtyNum <= 0) {
      setError('Jumlah (Qty) harus lebih besar dari 0');
      return;
    }
    if (currentTotal <= 0) {
      setError('Total biaya harus lebih besar dari Rp 0');
      return;
    }

    const updated: Transaction = {
      ...transaction,
      tanggal,
      kategori,
      item: item.trim(),
      qty: qtyNum,
      satuan: satuan.trim(),
      hargaSatuan: isCustomTotal && qtyNum > 0 ? Math.round(currentTotal / qtyNum) : hargaNum,
      total: currentTotal,
      metodeBayar,
      catatan: catatan.trim(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending' // mark as pending sync
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0d2319]/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col border border-[#e2e8e2] shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 border-b border-[#1a3e32] flex items-center justify-between bg-[#0d2319] text-white">
          <div className="flex items-center gap-2">
            <Edit className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-extrabold">Edit Data Transaksi</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-emerald-100/70 hover:text-white rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3.5 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-bold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-stone-700 font-bold mb-1">Tanggal</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl font-bold text-[#0d2319]"
                required
              />
            </div>

            <div>
              <label className="block text-stone-700 font-bold mb-1">Kategori</label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl font-bold text-[#0d2319]"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-stone-700 font-bold mb-1">Nama Item Belanja</label>
            <input
              type="text"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="w-full px-3 py-2 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl font-bold text-[#0d2319]"
              required
            />
          </div>

          <div className="grid grid-cols-12 gap-2.5">
            <div className="col-span-4">
              <label className="block text-stone-700 font-bold mb-1">Qty</label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full px-3 py-2 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl font-bold text-[#0d2319] font-mono text-center"
                required
              />
            </div>
            <div className="col-span-8">
              <label className="block text-stone-700 font-bold mb-1">Satuan</label>
              <select
                value={satuan}
                onChange={(e) => setSatuan(e.target.value)}
                className="w-full px-3 py-2 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl font-bold text-[#0d2319]"
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-stone-700 font-bold">Harga Satuan (Rp)</label>
              <button
                type="button"
                onClick={() => setIsCustomTotal(!isCustomTotal)}
                className="text-[11px] font-bold text-emerald-800 underline"
              >
                {isCustomTotal ? 'Hitung Otomatis' : 'Input Total Langsung'}
              </button>
            </div>
            {!isCustomTotal ? (
              <input
                type="text"
                value={hargaSatuanRaw}
                onChange={(e) => setHargaSatuanRaw(formatInputNumber(e.target.value))}
                className="w-full px-3 py-2 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl font-mono font-bold text-[#0d2319]"
                required
              />
            ) : (
              <input
                type="text"
                value={customTotalRaw}
                onChange={(e) => setCustomTotalRaw(formatInputNumber(e.target.value))}
                className="w-full px-3 py-2 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl font-mono font-bold text-[#0d2319]"
                required
              />
            )}
          </div>

          {/* Computed Total Banner */}
          <div className="p-3 bg-gradient-to-r from-[#0d2319] to-[#143527] rounded-xl text-white flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-300">Total Transaksi</span>
            <span className="text-base font-extrabold font-mono text-emerald-400">
              {formatRupiah(currentTotal)}
            </span>
          </div>

          <div>
            <label className="block text-stone-700 font-bold mb-1">Metode Pembayaran</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMetodeBayar('Tunai')}
                className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 ${
                  metodeBayar === 'Tunai'
                    ? 'bg-[#0d2319] text-white border-[#0d2319]'
                    : 'bg-[#f8faf8] text-stone-700 border-[#d6e0d6]'
                }`}
              >
                <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kas Tunai</span>
              </button>
              <button
                type="button"
                onClick={() => setMetodeBayar('Transfer Bank')}
                className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 ${
                  metodeBayar === 'Transfer Bank'
                    ? 'bg-[#0d2319] text-white border-[#0d2319]'
                    : 'bg-[#f8faf8] text-stone-700 border-[#d6e0d6]'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                <span>Transfer Bank</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-stone-700 font-bold mb-1">Catatan</label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full px-3 py-2 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl text-xs font-semibold text-[#0d2319]"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-[#e2e8e2] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-[#0d2319] rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0d2319] hover:bg-[#143527] text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-soft-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
