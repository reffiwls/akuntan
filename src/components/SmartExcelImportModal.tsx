import React, { useState, useRef } from 'react';
import { ExpenseCategory, EXPENSE_CATEGORIES, PaymentMethod, Transaction } from '../types';
import { formatRupiah, parseRupiah, formatInputNumber, getCategoryBadgeStyle } from '../utils/formatters';
import {
  Sparkles,
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Trash2,
  Edit2,
  Plus,
  AlertCircle,
  X,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface SmartExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDone: (newTransactions: Array<Omit<Transaction, 'id' | 'createdAt' | 'syncStatus'>>) => void;
}

export interface ParsedEditableItem {
  tempId: string;
  tanggal: string;
  kategori: ExpenseCategory;
  item: string;
  qty: number;
  satuan: string;
  hargaSatuan: number;
  total: number;
  metodeBayar: PaymentMethod;
  catatan: string;
}

// Smart Heuristic Classifier for MBG Catering Items
export function classifyMbgItem(name: string): ExpenseCategory {
  const lower = name.toLowerCase();
  if (/beras|minyak|garam|gula|kecap|saus|bumbu|tepung|merica|ketumbar|kemiri|micin|penyedap|royco|masako|terigu|tapioka/i.test(lower)) {
    return 'Sembako & Bumbu';
  }
  if (/box|kotak|mika|plastik|sendok|wadah|cup|paper|kantong|kresek|styrofoam|sekat|dus|packaging/i.test(lower)) {
    return 'Kemasan & Wadah';
  }
  if (/gas|lpg|sabun|cuci|listrik|air|galon|tissue|tisu|lap|spon|pembersih|sunlight|mama lemon|kebersihan/i.test(lower)) {
    return 'Operasional Dapur';
  }
  if (/upah|gaji|tenaga|masak|juru|packing|harian|tukang|pekerja|koki|chef/i.test(lower)) {
    return 'Upah Tenaga Kerja / Harian';
  }
  if (/bensin|bbm|ongkir|sewa|pickup|pick up|transport|antar|distribusi|armada|kurir/i.test(lower)) {
    return 'Logistik & Distribusi';
  }
  // Default: Fresh food (Ayam, Telur, Sayur, Daging, Ikan, Tahu, Tempe, Buah, dll.)
  return 'Bahan Baku Segar';
}

export const SmartExcelImportModal: React.FC<SmartExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportDone
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pasteText, setPasteText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [summaryNote, setSummaryNote] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editable preview list
  const [previewItems, setPreviewItems] = useState<ParsedEditableItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const todayStr = new Date().toISOString().slice(0, 10);

  if (!isOpen) return null;

  // Process text or CSV rows into parsed items
  const parseRowsToItems = (rawText: string, fileLabel?: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSummaryNote('');

    try {
      const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const parsedList: ParsedEditableItem[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Split by tab, comma, semicolon, or pipe
        const cols = line.split(/[\t;,|]/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
        
        // Skip header lines
        if (
          i === 0 &&
          cols.some((c) => /nama|item|barang|kategori|tanggal|qty|jumlah|harga|total|satuan/i.test(c))
        ) {
          continue;
        }

        if (cols.length >= 2 || line.length > 5) {
          // Identify text (name) vs numbers
          let name = '';
          let numbers: number[] = [];
          let unit = 'Kg';
          let date = todayStr;
          let payment: PaymentMethod = 'Tunai';

          // Extract date if present (YYYY-MM-DD or DD/MM/YYYY)
          const dateMatch = line.match(/\b(202\d[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]202\d)\b/);
          if (dateMatch) {
            date = dateMatch[1].replace(/\//g, '-');
          }

          // Extract unit
          const unitMatch = line.match(/\b(kg|gram|gr|pcs|porsi|paket|liter|tabung|hari|bulan|ikat|dus|karton|sak|karung|biji|butir|lembar)\b/i);
          if (unitMatch) {
            unit = unitMatch[1].charAt(0).toUpperCase() + unitMatch[1].slice(1);
          }

          // Extract payment method
          if (/transfer|tf|bca|bri|mandiri|bni/i.test(line)) {
            payment = 'Transfer Bank';
          }

          if (cols.length >= 3) {
            // Tabular row
            const textCols = cols.filter((c) => isNaN(Number(c.replace(/[^0-9]/g, ''))) || c.length > 8);
            const numCols = cols
              .map((c) => Number(c.replace(/[^0-9]/g, '')))
              .filter((n) => !isNaN(n) && n > 0);

            name = textCols[0] || cols[0] || 'Item Belanja';
            numbers = numCols;
          } else {
            // Free text row (e.g. "1. Daging ayam fillet 10 kg @ 38.000")
            // Clean index prefix like "1. ", "- "
            const cleanLine = line.replace(/^\d+[\.\)]\s*|-\s*/, '');
            const parts = cleanLine.split(/[@:]/);
            name = parts[0].replace(/\b\d+(\.\d+)?\s*(kg|gram|gr|pcs|liter|tabung|ikat|dus|karung)\b/gi, '').trim();
            if (!name) name = cleanLine.split(/\s+/).slice(0, 3).join(' ');

            const foundNums = cleanLine
              .match(/\d+[\d\.,]*/g)
              ?.map((n) => Number(n.replace(/[\.,]/g, '')))
              .filter((n) => !isNaN(n) && n > 0) || [];
            numbers = foundNums;
          }

          // Compute Qty, Price, Total
          let qty = 1;
          let hargaSatuan = 0;
          let total = 0;

          if (numbers.length === 1) {
            total = numbers[0];
            hargaSatuan = numbers[0];
          } else if (numbers.length === 2) {
            if (numbers[0] < 1000 && numbers[1] >= 1000) {
              qty = numbers[0];
              hargaSatuan = numbers[1];
              total = Math.round(qty * hargaSatuan);
            } else {
              qty = numbers[0];
              total = numbers[1];
              hargaSatuan = qty > 0 ? Math.round(total / qty) : total;
            }
          } else if (numbers.length >= 3) {
            qty = numbers[0] < 1000 ? numbers[0] : 1;
            hargaSatuan = numbers[1];
            total = numbers[2] || Math.round(qty * hargaSatuan);
          }

          if (total > 0 && name.trim()) {
            const kategori = classifyMbgItem(name);
            parsedList.push({
              tempId: `temp-${Date.now()}-${i}`,
              tanggal: date,
              kategori,
              item: name.trim(),
              qty: qty > 0 ? qty : 1,
              satuan: unit,
              hargaSatuan: hargaSatuan > 0 ? hargaSatuan : Math.round(total / (qty || 1)),
              total,
              metodeBayar: payment,
              catatan: fileLabel ? `Import: ${fileLabel}` : 'Import Dokumen'
            });
          }
        }
      }

      if (parsedList.length > 0) {
        setPreviewItems(parsedList);
        setSummaryNote(`Berhasil mendeteksi ${parsedList.length} transaksi belanja MBG. Silakan tinjau dan edit di bawah ini.`);
      } else {
        setErrorMessage('Tidak dapat mengenali format baris belanja. Pastikan dokumen memuat nama barang dan nominal harga.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal membaca dokumen.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Excel (.xlsx, .xls, .csv) upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const csvData = XLSX.utils.sheet_to_csv(ws);
        parseRowsToItems(csvData, file.name);
      } catch (err: any) {
        setIsProcessing(false);
        setErrorMessage('Gagal membaca file spreadsheet. Pastikan file berformat .xlsx, .xls, atau .csv');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Handle text submit
  const handlePasteSubmit = () => {
    if (!pasteText.trim()) {
      setErrorMessage('Silakan tempelkan teks catatan atau tabel belanja terlebih dahulu.');
      return;
    }
    parseRowsToItems(pasteText, 'Catatan Teks');
  };

  // Edit item inline in live preview
  const handleUpdateItem = (index: number, field: keyof ParsedEditableItem, value: any) => {
    setPreviewItems((prev) => {
      const updated = [...prev];
      const target = { ...updated[index], [field]: value };

      if (field === 'qty' || field === 'hargaSatuan') {
        const qtyNum = field === 'qty' ? parseFloat(value) || 0 : target.qty;
        const hargaNum = field === 'hargaSatuan' ? parseRupiah(String(value)) : target.hargaSatuan;
        target.total = Math.round(qtyNum * hargaNum);
      }

      if (field === 'total') {
        target.total = parseRupiah(String(value));
        if (target.qty > 0) {
          target.hargaSatuan = Math.round(target.total / target.qty);
        }
      }

      updated[index] = target;
      return updated;
    });
  };

  // Delete single item from preview
  const handleDeleteItem = (index: number) => {
    setPreviewItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Add new empty row to preview
  const handleAddNewRow = () => {
    const newItem: ParsedEditableItem = {
      tempId: `temp-${Date.now()}`,
      tanggal: todayStr,
      kategori: 'Bahan Baku Segar',
      item: '',
      qty: 1,
      satuan: 'Kg',
      hargaSatuan: 0,
      total: 0,
      metodeBayar: 'Tunai',
      catatan: 'Manual'
    };
    setPreviewItems((prev) => [...prev, newItem]);
  };

  // Final Commit to App State
  const handleSaveAllToApp = () => {
    const validItems = previewItems.filter((it) => it.item.trim() && it.total > 0);
    if (validItems.length === 0) {
      setErrorMessage('Tidak ada data belanja yang valid untuk disimpan.');
      return;
    }

    const payload = validItems.map((it) => ({
      tanggal: it.tanggal || todayStr,
      kategori: it.kategori,
      item: it.item.trim(),
      qty: it.qty,
      satuan: it.satuan,
      hargaSatuan: it.hargaSatuan,
      total: it.total,
      metodeBayar: it.metodeBayar,
      catatan: it.catatan
    }));

    onImportDone(payload);
    onClose();
  };

  const totalCalculated = previewItems.reduce((sum, it) => sum + (Number(it.total) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:hidden">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-1.5">
                Import Smart AI Belanja MBG
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Auto-kategorisasi cerdas & pratinjau yang dapat diedit langsung
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* If No Items Extracted Yet: Show Input Source Options */}
          {previewItems.length === 0 ? (
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>Upload Excel / CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'paste' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>Paste Catatan WA / Teks</span>
                </button>
              </div>

              {/* Upload File Zone */}
              {activeTab === 'upload' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-700 hover:bg-slate-50/80 rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Klik atau Seret File Excel / CSV ke Sini
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Mendukung file .xlsx, .xls, dan .csv dari supplier atau catatan harian
                  </p>
                  <span className="inline-block mt-3 px-3 py-1 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg">
                    Format kolom bebas, AI & parser otomatis menyesuaikan
                  </span>
                </div>
              )}

              {/* Paste Text Zone */}
              {activeTab === 'paste' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      Tempel Teks Catatan Belanja Dapur / Chat WhatsApp
                    </label>
                    <textarea
                      rows={6}
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder="Contoh salinan teks:&#10;1. Daging ayam fillet 10 kg @ 38.000&#10;2. Beras ramos 2 karung total 560.000&#10;3. Box sekat 4 mbg 500 pcs harga 850&#10;4. Gas lpg 12kg 2 tabung 430.000 tunai"
                      className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handlePasteSubmit}
                    disabled={isProcessing || !pasteText.trim()}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-950 active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-xs"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>{isProcessing ? 'Sedang Membaca...' : 'Ekstrak & Klasifikasikan Otomatis'}</span>
                  </button>
                </div>
              )}

              {/* Loading Indicator */}
              {isProcessing && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-950">
                  <div className="w-5 h-5 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold">Sedang menganalisis baris belanja...</p>
                    <p className="text-[11px] text-emerald-800">
                      Menyesuaikan satuan, harga satuan, dan 6 kategori standar MBG.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-2xl font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          ) : (
            /* Editable Live Preview Table */
            <div className="space-y-3.5">
              {/* Summary Banner */}
              <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                  <div className="min-w-0">
                    <h4 className="text-xs font-extrabold text-slate-900 truncate">
                      {previewItems.length} Item Berhasil Diekstrak
                    </h4>
                    <p className="text-[11px] text-slate-600 font-medium truncate">
                      {summaryNote || 'Silakan cek dan koreksi jika ada data yang ingin disesuaikan sebelum disimpan.'}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] text-slate-500 font-bold block">Total Pengeluaran</span>
                  <span className="text-sm sm:text-base font-extrabold font-mono text-slate-950">
                    {formatRupiah(totalCalculated)}
                  </span>
                </div>
              </div>

              {/* Actions row before table */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">
                  Daftar Transaksi (Klik kolom untuk edit langsung):
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddNewRow}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl font-bold flex items-center gap-1 text-[11px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewItems([]);
                      setPasteText('');
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold text-[11px]"
                  >
                    Ulangi Upload
                  </button>
                </div>
              </div>

              {/* Editable Item Cards */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {previewItems.map((item, idx) => {
                  return (
                    <div
                      key={item.tempId || idx}
                      className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2 hover:border-slate-400 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 grid grid-cols-12 gap-2">
                          {/* Nama Item */}
                          <div className="col-span-12 sm:col-span-6">
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                              Nama Barang / Belanja #{idx + 1}
                            </label>
                            <input
                              type="text"
                              value={item.item}
                              onChange={(e) => handleUpdateItem(idx, 'item', e.target.value)}
                              placeholder="Nama bahan..."
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:bg-white"
                            />
                          </div>

                          {/* Kategori Dropdown */}
                          <div className="col-span-12 sm:col-span-6">
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                              Kategori Standar MBG
                            </label>
                            <select
                              value={item.kategori}
                              onChange={(e) => handleUpdateItem(idx, 'kategori', e.target.value as ExpenseCategory)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:bg-white"
                            >
                              {EXPENSE_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Delete single button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors mt-4"
                          title="Hapus baris ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Numbers Grid: Qty, Satuan, Harga, Total */}
                      <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block">Qty</label>
                          <input
                            type="number"
                            step="any"
                            value={item.qty}
                            onChange={(e) => handleUpdateItem(idx, 'qty', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block">Satuan</label>
                          <input
                            type="text"
                            value={item.satuan}
                            onChange={(e) => handleUpdateItem(idx, 'satuan', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block">Harga (Rp)</label>
                          <input
                            type="number"
                            value={item.hargaSatuan}
                            onChange={(e) => handleUpdateItem(idx, 'hargaSatuan', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-emerald-800 font-bold block">Total (Rp)</label>
                          <input
                            type="number"
                            value={item.total}
                            onChange={(e) => handleUpdateItem(idx, 'total', e.target.value)}
                            className="w-full px-2 py-1 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-mono font-extrabold text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all"
          >
            Batal
          </button>

          {previewItems.length > 0 && (
            <button
              type="button"
              id="btn-confirm-import-all"
              onClick={handleSaveAllToApp}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 active:scale-[0.98] text-white rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Masukkan Semua ({previewItems.length} Transaksi)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
