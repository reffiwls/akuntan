import React, { useState, useEffect, useRef } from 'react';
import {
  ExpenseCategory,
  EXPENSE_CATEGORIES,
  PaymentMethod,
  Transaction,
  COMMON_UNITS
} from '../types';
import {
  formatRupiah,
  parseRupiah,
  formatInputNumber,
  getCategoryBadgeStyle
} from '../utils/formatters';
import { saveDraft, loadDraft, clearDraft } from '../utils/storage';
import {
  RotateCcw,
  Sparkles,
  Calendar,
  Layers,
  FileText,
  Tag,
  CreditCard,
  Banknote,
  Calculator,
  Save,
  Plus,
  Zap,
  Info
} from 'lucide-react';

interface ExpenseFormTabProps {
  onSave: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'syncStatus'>, inputAgain: boolean) => void;
  cashierName?: string;
}

// Common fast-entry items for MBG catering
const QUICK_PRESETS: Array<{
  label: string;
  category: ExpenseCategory;
  item: string;
  satuan: string;
  defaultPrice?: number;
}> = [
  { label: '🍗 Daging Ayam', category: 'Bahan Baku Segar', item: 'Daging Ayam Fillet Dada', satuan: 'Kg', defaultPrice: 38000 },
  { label: '🥚 Telur Ayam', category: 'Bahan Baku Segar', item: 'Telur Ayam Ras Segar', satuan: 'Kg', defaultPrice: 28000 },
  { label: '🍚 Beras Medium', category: 'Sembako & Bumbu', item: 'Beras Medium Pulen Wangi', satuan: 'Kg', defaultPrice: 14000 },
  { label: '🥦 Sayur Mayur', category: 'Bahan Baku Segar', item: 'Sayur Segar Campur (Wortel, Buncis, Kol)', satuan: 'Kg', defaultPrice: 15000 },
  { label: '🍱 Box MBG', category: 'Kemasan & Wadah', item: 'Food Box Sekat 4 Foodgrade MBG', satuan: 'Pcs', defaultPrice: 850 },
  { label: '🔥 Gas LPG 12kg', category: 'Operasional Dapur', item: 'Refill Tabung Gas LPG 12 Kg', satuan: 'Tabung', defaultPrice: 215000 },
  { label: '👨‍🍳 Upah Harian', category: 'Upah Tenaga Kerja / Harian', item: 'Upah Tenaga Masak & Packing Harian', satuan: 'Hari', defaultPrice: 130000 },
  { label: '⛽ Bensin Armada', category: 'Logistik & Distribusi', item: 'Bensin Operasional Pengantaran Sekolah', satuan: 'Liter', defaultPrice: 10000 }
];

export const ExpenseFormTab: React.FC<ExpenseFormTabProps> = ({ onSave, cashierName }) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const itemNameInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [tanggal, setTanggal] = useState<string>(todayStr);
  const [kategori, setKategori] = useState<ExpenseCategory>('Bahan Baku Segar');
  const [item, setItem] = useState<string>('');
  const [qty, setQty] = useState<string>('1');
  const [satuan, setSatuan] = useState<string>('Kg');
  const [hargaSatuanRaw, setHargaSatuanRaw] = useState<string>('');
  const [isCustomTotal, setIsCustomTotal] = useState<boolean>(false);
  const [customTotalRaw, setCustomTotalRaw] = useState<string>('');
  const [metodeBayar, setMetodeBayar] = useState<PaymentMethod>('Tunai');
  const [catatan, setCatatan] = useState<string>('');

  const [hasDraftLoaded, setHasDraftLoaded] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load draft on initial mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.item) {
      setTanggal(draft.tanggal || todayStr);
      setKategori(draft.kategori || 'Bahan Baku Segar');
      setItem(draft.item || '');
      setQty(draft.qty || '1');
      setSatuan(draft.satuan || 'Kg');
      setHargaSatuanRaw(draft.hargaSatuan || '');
      setIsCustomTotal(draft.isCustomTotal || false);
      setCustomTotalRaw(draft.total || '');
      setMetodeBayar(draft.metodeBayar || 'Tunai');
      setCatatan(draft.catatan || '');
      setHasDraftLoaded(true);
    }
  }, [todayStr]);

  // Calculate auto total
  const qtyNumber = parseFloat(qty) || 0;
  const hargaNumber = parseRupiah(hargaSatuanRaw);
  const autoCalculatedTotal = Math.round(qtyNumber * hargaNumber);
  const currentTotal = isCustomTotal ? parseRupiah(customTotalRaw) : autoCalculatedTotal;

  // Auto-save draft to localStorage whenever form changes
  useEffect(() => {
    if (item.trim() || hargaSatuanRaw.trim()) {
      saveDraft({
        tanggal,
        kategori,
        item,
        qty,
        satuan,
        hargaSatuan: hargaSatuanRaw,
        isCustomTotal,
        total: isCustomTotal ? customTotalRaw : autoCalculatedTotal.toString(),
        metodeBayar,
        catatan,
        updatedAt: Date.now()
      });
    }
  }, [tanggal, kategori, item, qty, satuan, hargaSatuanRaw, isCustomTotal, customTotalRaw, autoCalculatedTotal, metodeBayar, catatan]);

  // Quick Preset Selection
  const applyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setKategori(preset.category);
    setItem(preset.item);
    setSatuan(preset.satuan);
    if (preset.defaultPrice) {
      setHargaSatuanRaw(formatInputNumber(preset.defaultPrice.toString()));
    }
    setIsCustomTotal(false);
    itemNameInputRef.current?.focus();
  };

  // Reset form
  const handleReset = () => {
    setItem('');
    setQty('1');
    setSatuan('Kg');
    setHargaSatuanRaw('');
    setIsCustomTotal(false);
    setCustomTotalRaw('');
    setCatatan('');
    setValidationError(null);
    clearDraft();
    setHasDraftLoaded(false);
  };

  // Submit Handler
  const handleFormSubmit = (e: React.FormEvent, inputAgain = false) => {
    e.preventDefault();
    setValidationError(null);

    if (!item.trim()) {
      setValidationError('Nama item pengeluaran wajib diisi');
      itemNameInputRef.current?.focus();
      return;
    }

    if (qtyNumber <= 0) {
      setValidationError('Jumlah (Qty) harus lebih besar dari 0');
      return;
    }

    if (currentTotal <= 0) {
      setValidationError('Total biaya harus lebih besar dari Rp 0');
      return;
    }

    const calculatedUnitHarga = isCustomTotal && qtyNumber > 0 ? Math.round(currentTotal / qtyNumber) : hargaNumber;

    const newTx = {
      tanggal,
      kategori,
      item: item.trim(),
      qty: qtyNumber,
      satuan: satuan.trim(),
      hargaSatuan: calculatedUnitHarga,
      total: currentTotal,
      metodeBayar,
      catatan: catatan.trim()
    };

    onSave(newTx, inputAgain);
    clearDraft();
    setHasDraftLoaded(false);

    if (inputAgain) {
      // Keep category and payment method, reset item details
      setItem('');
      setQty('1');
      setHargaSatuanRaw('');
      setIsCustomTotal(false);
      setCustomTotalRaw('');
      setCatatan('');
      itemNameInputRef.current?.focus();
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-3.5 pb-28 pt-1">
      {/* Draft Recovery Alert */}
      {hasDraftLoaded && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-3.5 py-2.5 rounded-2xl text-xs flex items-center justify-between shadow-soft-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">Draft isian sebelumnya dipulihkan otomatis.</span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="font-bold underline text-emerald-800 hover:text-emerald-950 ml-2 text-[11px]"
          >
            Hapus
          </button>
        </div>
      )}

      {/* Quick Presets Carousel */}
      <div className="bg-white rounded-3xl border border-[#e2e8e2] p-3.5 shadow-soft-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-[#0d2319] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            Pilihan Cepat Belanja Dapur MBG
          </span>
          <span className="text-[10px] text-stone-500 font-semibold">Klik untuk isi</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          {QUICK_PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              id={`preset-btn-${idx}`}
              onClick={() => applyPreset(p)}
              className="flex-shrink-0 px-3 py-1.5 bg-[#f6f8f6] hover:bg-[#eef3ee] active:scale-95 border border-[#e2e8e2] rounded-xl text-xs font-semibold text-[#0d2319] transition-all duration-150 shadow-soft-xs"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Input Form */}
      <form
        onSubmit={(e) => handleFormSubmit(e, false)}
        className="bg-white rounded-3xl border border-[#e2e8e2] p-4 sm:p-5 shadow-soft-sm space-y-3.5"
      >
        <div className="flex items-center justify-between border-b border-[#f0f4f0] pb-2.5">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-[#0d2319]">Catat Pengeluaran Baru</h2>
            <p className="text-[11px] text-stone-500 font-medium">
              Petugas: <span className="font-bold text-[#0d2319]">{cashierName || 'Admin SPPG'}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="px-2.5 py-1 text-xs font-semibold text-stone-500 hover:text-stone-800 bg-[#f6f8f6] hover:bg-[#eef2ee] rounded-xl flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Validation error notice */}
        {validationError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl font-bold flex items-center gap-2">
            <Info className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Tanggal & Kategori */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              Tanggal
            </label>
            <input
              id="input-tanggal"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3 py-2 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl text-xs font-bold text-[#0d2319] focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-stone-500" />
              Kategori
            </label>
            <select
              id="input-kategori"
              value={kategori}
              onChange={(e) => setKategori(e.target.value as ExpenseCategory)}
              className="w-full px-3 py-2 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl text-xs font-bold text-[#0d2319] focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Nama Item Belanja */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-stone-500" />
            Nama Item Belanja / Uraian
          </label>
          <input
            id="input-item"
            ref={itemNameInputRef}
            type="text"
            placeholder="Contoh: Daging Ayam Fillet, Beras Ramos, Gas 12Kg..."
            value={item}
            onChange={(e) => setItem(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl text-xs sm:text-sm font-semibold text-[#0d2319] placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
            required
          />
        </div>

        {/* Qty & Satuan */}
        <div className="grid grid-cols-12 gap-2.5">
          <div className="col-span-4">
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Jumlah (Qty)
            </label>
            <input
              id="input-qty"
              type="number"
              step="any"
              min="0.01"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full px-3 py-2 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl text-center text-xs sm:text-sm font-extrabold text-[#0d2319] focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 font-mono"
              required
            />
          </div>

          <div className="col-span-8">
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Satuan
            </label>
            <select
              id="input-satuan-select"
              value={satuan}
              onChange={(e) => setSatuan(e.target.value)}
              className="w-full px-3 py-2 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl text-xs font-bold text-[#0d2319] focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
            >
              {COMMON_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Harga Satuan / Custom Total Switcher */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-stone-700">
              {isCustomTotal ? 'Total Belanja Langsung (Rp)' : 'Harga Satuan (Rp)'}
            </label>
            <button
              type="button"
              onClick={() => setIsCustomTotal(!isCustomTotal)}
              className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline"
            >
              {isCustomTotal ? 'Gunakan Hitung Qty × Harga Satuan' : 'Input Total Langsung'}
            </button>
          </div>

          {!isCustomTotal ? (
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 font-mono">
                Rp
              </span>
              <input
                id="input-harga-satuan"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={hargaSatuanRaw}
                onChange={(e) => setHargaSatuanRaw(formatInputNumber(e.target.value))}
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl text-sm font-extrabold text-[#0d2319] placeholder:text-stone-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 font-mono transition-all"
                required={!isCustomTotal}
              />
            </div>
          ) : (
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 font-mono">
                Rp
              </span>
              <input
                id="input-custom-total"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={customTotalRaw}
                onChange={(e) => setCustomTotalRaw(formatInputNumber(e.target.value))}
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl text-sm font-extrabold text-[#0d2319] placeholder:text-stone-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 font-mono transition-all"
                required={isCustomTotal}
              />
            </div>
          )}
        </div>

        {/* Dynamic Computed Total Card (Clean & Professional, No Heavy Badges) */}
        <div className="bg-[#f0f6f2] border border-[#cfe2d4] rounded-2xl p-4 flex items-center justify-between transition-all">
          <div className="space-y-1 min-w-0">
            <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-emerald-800" />
              Total Pengeluaran
            </span>
            <p className="text-xs text-stone-500 font-medium truncate">
              {!isCustomTotal && qtyNumber > 0 && hargaNumber > 0
                ? `${qty} ${satuan} × ${formatRupiah(hargaNumber)}`
                : isCustomTotal
                ? 'Nominal total langsung'
                : 'Siap dicatat ke pembukuan'}
            </p>
          </div>
          <div className="text-right pl-2 flex-shrink-0">
            <span className="text-2xl font-extrabold font-mono text-[#0d2319] tracking-tight">
              {formatRupiah(currentTotal)}
            </span>
          </div>
        </div>

        {/* Metode Pembayaran */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-stone-700">
            Metode Pembayaran
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              id="pay-tunai-btn"
              onClick={() => setMetodeBayar('Tunai')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all duration-150 active:scale-95 ${
                metodeBayar === 'Tunai'
                  ? 'bg-[#0d2319] text-white border-[#0d2319] shadow-soft-xs'
                  : 'bg-[#f8faf8] text-stone-700 border-[#d6e0d6] hover:bg-[#eef2ee]'
              }`}
            >
              <Banknote className="w-4 h-4 text-emerald-400" />
              <span>Kas Tunai</span>
            </button>

            <button
              type="button"
              id="pay-transfer-btn"
              onClick={() => setMetodeBayar('Transfer Bank')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all duration-150 active:scale-95 ${
                metodeBayar === 'Transfer Bank'
                  ? 'bg-[#0d2319] text-white border-[#0d2319] shadow-soft-xs'
                  : 'bg-[#f8faf8] text-stone-700 border-[#d6e0d6] hover:bg-[#eef2ee]'
              }`}
            >
              <CreditCard className="w-4 h-4 text-sky-400" />
              <span>Transfer Bank</span>
            </button>
          </div>
        </div>

        {/* Catatan / Nomor Nota */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-stone-500" />
            Catatan / Nama Toko / Nomor Nota (Opsional)
          </label>
          <input
            id="input-catatan"
            type="text"
            placeholder="Contoh: Pasar Induk Kramat Jati / Nota Toko Berkah No. 042"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            className="w-full px-3 py-2 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl text-xs font-medium text-[#0d2319] placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
          />
        </div>

        {/* Submit Actions */}
        <div className="pt-1 grid grid-cols-2 gap-2">
          <button
            type="button"
            id="btn-save-and-again"
            onClick={(e) => handleFormSubmit(e, true)}
            className="py-3 px-3 bg-[#f0f5f0] hover:bg-[#e3ede3] active:scale-95 text-[#0d2319] border border-[#c4d6c4] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all duration-150 shadow-soft-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Simpan & Input Lagi</span>
          </button>

          <button
            type="submit"
            id="btn-save-and-done"
            className="py-3 px-3 bg-[#0d2319] hover:bg-[#143527] active:scale-95 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all duration-150 shadow-soft-sm"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>Simpan Transaksi</span>
          </button>
        </div>
      </form>
    </div>
  );
};
