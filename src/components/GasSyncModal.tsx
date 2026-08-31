import React, { useState } from 'react';
import { AppSettings, Transaction } from '../types';
import { pingGasUrl } from '../utils/gasService';
import {
  X,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Code,
  Sliders,
  Database,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  HelpCircle,
  Sparkles
} from 'lucide-react';

interface GasSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  transactions: Transaction[];
  onPullFromGas: () => void;
  onPushToGas: () => void;
  isSyncing: boolean;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

const SAMPLE_GAS_CODE = `/**
 * GOOGLE APPS SCRIPT (GAS) BACKEND DATABASE UNTUK MBG KASIR & KEUANGAN SPPG
 * 
 * 1. Buka Google Sheets -> Ekstensi -> Apps Script
 * 2. Hapus semua isi, paste seluruh kode ini.
 * 3. Simpan (Ctrl+S).
 * 4. Terapkan (Deploy) -> Penerapan baru -> Aplikasi Web (Web App)
 * 5. Konfigurasi:
 *    - Jalankan sebagai: Saya (Me)
 *    - Yang memiliki akses: Siapa saja (Anyone) -> PENTING!
 * 6. Klik Terapkan, beri izin, salin URL Aplikasi Web (/exec) ke MBG Kasir!
 */

const SHEET_NAME = 'Transaksi_MBG';
const HEADERS = ['ID', 'Tanggal', 'Kategori', 'Item', 'Qty', 'Satuan', 'Harga_Satuan', 'Total', 'Metode_Bayar', 'Catatan', 'Timestamp'];

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground('#0D2319');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, HEADERS.length);
  }
  return sheet;
}

function doGet(e) {
  try {
    const sheet = getOrCreateSheet();
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'GET_ALL';
    
    if (action === 'PING') {
      return createJsonResponse({
        status: 'success',
        message: 'Koneksi Google Apps Script berhasil!',
        timestamp: new Date().toISOString(),
        spreadsheetName: SpreadsheetApp.getActiveSpreadsheet().getName(),
        sheetName: SHEET_NAME,
        totalRows: Math.max(0, sheet.getLastRow() - 1)
      });
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return createJsonResponse({ status: 'success', data: [], count: 0 });
    }
    
    const dataRange = sheet.getRange(2, 1, lastRow - 1, HEADERS.length);
    const rawValues = dataRange.getValues();
    
    const transactions = rawValues.map(function(row) {
      let tanggalStr = '';
      if (row[1] instanceof Date) {
        const d = row[1];
        const month = ('0' + (d.getMonth() + 1)).slice(-2);
        const day = ('0' + d.getDate()).slice(-2);
        tanggalStr = d.getFullYear() + '-' + month + '-' + day;
      } else {
        tanggalStr = String(row[1] || '');
      }
      
      return {
        id: String(row[0] || ''),
        tanggal: tanggalStr,
        kategori: String(row[2] || 'Lain-lain'),
        item: String(row[3] || ''),
        qty: Number(row[4] || 1),
        satuan: String(row[5] || 'Kg'),
        hargaSatuan: Number(row[6] || 0),
        total: Number(row[7] || 0),
        metodeBayar: String(row[8] || 'Tunai'),
        catatan: String(row[9] || ''),
        createdAt: String(row[10] || new Date().toISOString()),
        syncStatus: 'synced'
      };
    });
    
    return createJsonResponse({
      status: 'success',
      data: transactions,
      count: transactions.length
    });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    const sheet = getOrCreateSheet();
    let postData = null;
    
    if (e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        return createJsonResponse({ status: 'error', message: 'Format JSON payload tidak valid' });
      }
    }
    
    if (!postData) {
      return createJsonResponse({ status: 'error', message: 'Tidak ada payload data yang diterima' });
    }
    
    const rawAction = String(postData.action || '').toUpperCase().trim();
    
    // 1. DELETE ACTION
    if (rawAction === 'DELETE' || rawAction === 'REMOVE') {
      const targetId = String(postData.id || postData.transactionId || (postData.data && postData.data.id) || '');
      if (!targetId) {
        return createJsonResponse({ status: 'error', message: 'ID transaksi untuk hapus tidak ditemukan' });
      }
      
      const lastRow = sheet.getLastRow();
      let deleted = false;
      if (lastRow > 1) {
        const idColValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (let i = 0; i < idColValues.length; i++) {
          if (String(idColValues[i][0]) === targetId) {
            sheet.deleteRow(i + 2);
            deleted = true;
            break;
          }
        }
      }
      return createJsonResponse({
        status: 'success',
        message: deleted ? 'Transaksi berhasil dihapus' : 'Transaksi tidak ditemukan (sudah terhapus)',
        id: targetId
      });
    }
    
    // 2. SINGLE TRANSACTION ADD/CREATE ACTION
    if (rawAction === 'ADD_TRANSACTION' || rawAction === 'CREATE' || rawAction === 'ADD' || rawAction === 'INSERT') {
      const t = postData.transaction || postData.data || postData.item;
      if (t && t.id) {
        sheet.appendRow([
          t.id,
          t.tanggal || '',
          t.kategori || 'Lain-lain',
          t.item || '',
          t.qty || 1,
          t.satuan || 'Kg',
          t.hargaSatuan || 0,
          t.total || 0,
          t.metodeBayar || 'Tunai',
          t.catatan || '',
          t.createdAt || new Date().toISOString()
        ]);
        return createJsonResponse({ status: 'success', message: 'Transaksi berhasil disimpan', id: t.id });
      }
    }
    
    // 3. BATCH SYNC / UPSERT ACTION (BATCH_SYNC, UPSERT_BATCH, SYNC_BATCH, or Default Array)
    const items = postData.transactions || postData.items || postData.data;
    if (Array.isArray(items)) {
      const lastRow = sheet.getLastRow();
      const existingIds = {};
      
      if (lastRow > 1) {
        const idColValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (let i = 0; i < idColValues.length; i++) {
          const id = String(idColValues[i][0]);
          if (id) {
            existingIds[id] = i + 2;
          }
        }
      }
      
      let insertedCount = 0;
      let updatedCount = 0;
      
      items.forEach(function(t) {
        if (!t || !t.id) return;
        const rowData = [
          t.id,
          t.tanggal || '',
          t.kategori || 'Lain-lain',
          t.item || '',
          t.qty || 1,
          t.satuan || 'Kg',
          t.hargaSatuan || 0,
          t.total || 0,
          t.metodeBayar || 'Tunai',
          t.catatan || '',
          t.createdAt || new Date().toISOString()
        ];
        
        if (existingIds[t.id]) {
          const targetRow = existingIds[t.id];
          sheet.getRange(targetRow, 1, 1, HEADERS.length).setValues([rowData]);
          updatedCount++;
        } else {
          sheet.appendRow(rowData);
          insertedCount++;
        }
      });
      
      return createJsonResponse({
        status: 'success',
        message: 'Sync batch berhasil',
        inserted: insertedCount,
        updated: updatedCount,
        totalSynced: insertedCount + updatedCount
      });
    }
    
    return createJsonResponse({
      status: 'error',
      message: 'Aksi atau payload tidak dikenali: ' + (rawAction || 'KOSONG')
    });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export const GasSyncModal: React.FC<GasSyncModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  transactions,
  onPullFromGas,
  onPushToGas,
  isSyncing,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'connection' | 'guide' | 'settings'>('connection');
  const [gasUrl, setGasUrl] = useState<string>(settings.gasUrl || '');
  const [unitName, setUnitName] = useState<string>(settings.unitName || '');
  const [cashierName, setCashierName] = useState<string>(settings.cashierName || '');
  const [targetPortions, setTargetPortions] = useState<number>(settings.targetPortionsDaily || 1500);

  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    spreadsheetName?: string;
    totalRows?: number;
  } | null>(null);

  const [hasCopiedCode, setHasCopiedCode] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!gasUrl.trim()) {
      onShowToast('Peringatan', 'Silakan masukkan URL Google Apps Script terlebih dahulu.', 'info');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await pingGasUrl(gasUrl.trim());
    setIsTesting(false);
    setTestResult(res);

    if (res.success) {
      onShowToast('Koneksi Berhasil!', `Terhubung ke Google Sheets: ${res.spreadsheetName || 'Aktif'}`, 'success');
      onSaveSettings({
        ...settings,
        gasUrl: gasUrl.trim(),
        unitName,
        cashierName,
        targetPortionsDaily: targetPortions
      });
    } else {
      onShowToast('Gagal Terhubung', res.message, 'error');
    }
  };

  const handleSaveAll = () => {
    onSaveSettings({
      ...settings,
      gasUrl: gasUrl.trim(),
      unitName: unitName.trim(),
      cashierName: cashierName.trim(),
      targetPortionsDaily: targetPortions
    });
    onShowToast('Pengaturan Disimpan', 'Konfigurasi Google Sheets & Unit telah diperbarui.', 'success');
    onClose();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(SAMPLE_GAS_CODE).then(() => {
      setHasCopiedCode(true);
      onShowToast('Kode Tersalin!', 'Kode Google Apps Script telah disalin. Paste di Apps Script Editor.', 'success');
      setTimeout(() => setHasCopiedCode(false), 3000);
    });
  };

  const pendingCount = transactions.filter((t) => t.syncStatus === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0d2319]/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col border border-[#e2e8e2] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1a3e32] flex items-center justify-between bg-[#0d2319] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-soft-xs">
              <Database className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold leading-tight">
                Integrasi Google Sheets & Pengaturan
              </h3>
              <p className="text-[11px] text-emerald-100/70">Database cloud gratis via Google Apps Script</p>
            </div>
          </div>
          <button
            id="close-gas-modal"
            onClick={onClose}
            className="p-1 text-emerald-100/70 hover:text-white rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[#e2e8e2] bg-[#f8faf8] text-xs font-bold">
          <button
            id="tab-btn-conn"
            onClick={() => setActiveTab('connection')}
            className={`flex-1 py-3 px-3 text-center border-b-2 transition-all ${
              activeTab === 'connection'
                ? 'border-emerald-700 text-[#0d2319] bg-white'
                : 'border-transparent text-stone-500 hover:text-[#0d2319]'
            }`}
          >
            Koneksi GAS
          </button>
          <button
            id="tab-btn-guide"
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-3 px-3 text-center border-b-2 transition-all ${
              activeTab === 'guide'
                ? 'border-emerald-700 text-[#0d2319] bg-white'
                : 'border-transparent text-stone-500 hover:text-[#0d2319]'
            }`}
          >
            Panduan & Kode
          </button>
          <button
            id="tab-btn-settings"
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-3 px-3 text-center border-b-2 transition-all ${
              activeTab === 'settings'
                ? 'border-emerald-700 text-[#0d2319] bg-white'
                : 'border-transparent text-stone-500 hover:text-[#0d2319]'
            }`}
          >
            Profil Unit SPPG
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: KONEKSI GAS */}
          {activeTab === 'connection' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Google Apps Script Web App URL
                </label>
                <div className="space-y-2">
                  <input
                    id="gas-url-input"
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={gasUrl}
                    onChange={(e) => {
                      setGasUrl(e.target.value);
                      setTestResult(null);
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl text-xs font-mono text-[#0d2319] placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                  />
                  <div className="flex gap-2">
                    <button
                      id="btn-test-gas"
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="px-3.5 py-2 bg-[#0d2319] hover:bg-[#143527] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-soft-xs active:scale-95"
                    >
                      {isTesting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-300" />
                          <span>Menguji...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Uji Koneksi Sheets</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Hasil Tes */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>{testResult.success ? 'Koneksi Berhasil' : 'Koneksi Gagal'}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{testResult.message}</p>
                  {testResult.spreadsheetName && (
                    <p className="text-[11px] font-mono mt-1 font-semibold">
                      File: {testResult.spreadsheetName} ({testResult.totalRows || 0} baris)
                    </p>
                  )}
                </div>
              )}

              {/* Sync Actions Box */}
              <div className="bg-[#f8faf8] border border-[#e2e8e2] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0d2319] flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-emerald-700" />
                    Sinkronisasi Data Transaksi
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      pendingCount > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {pendingCount} Transaksi Pending
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    id="btn-push-gas"
                    onClick={onPushToGas}
                    disabled={isSyncing || !gasUrl.trim()}
                    className="p-3 bg-white hover:bg-[#eef3ee] active:scale-95 disabled:opacity-50 border border-[#d6e0d6] rounded-xl text-xs font-bold text-[#0d2319] flex flex-col items-center gap-1 transition-all shadow-soft-xs"
                  >
                    <ArrowUpFromLine className="w-4 h-4 text-emerald-700" />
                    <span>Upload ke Sheets</span>
                    <span className="text-[10px] font-normal text-stone-500">Push data lokal</span>
                  </button>

                  <button
                    id="btn-pull-gas"
                    onClick={onPullFromGas}
                    disabled={isSyncing || !gasUrl.trim()}
                    className="p-3 bg-white hover:bg-[#eef3ee] active:scale-95 disabled:opacity-50 border border-[#d6e0d6] rounded-xl text-xs font-bold text-[#0d2319] flex flex-col items-center gap-1 transition-all shadow-soft-xs"
                  >
                    <ArrowDownToLine className="w-4 h-4 text-sky-700" />
                    <span>Tarik dari Sheets</span>
                    <span className="text-[10px] font-normal text-stone-500">Pull dari cloud</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PANDUAN & KODE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs">
              <div className="bg-[#f0f5f0] border border-[#cfe0cf] p-3.5 rounded-2xl space-y-2">
                <h4 className="font-extrabold text-[#0d2319] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  Cara Setup Google Apps Script (5 Menit)
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-stone-700 text-[11px] leading-relaxed font-medium">
                  <li>Buat Google Spreadsheet baru di Google Drive Anda.</li>
                  <li>Klik menu <strong>Ekstensi</strong> → <strong>Apps Script</strong>.</li>
                  <li>Hapus kode bawaan, lalu salin & tempel kode di bawah ini.</li>
                  <li>Klik tombol <strong>Terapkan (Deploy)</strong> → <strong>Penerapan baru</strong>.</li>
                  <li>Pilih jenis <strong>Aplikasi Web (Web App)</strong>.</li>
                  <li>Ubah <em>Yang memiliki akses</em> menjadi: <strong>Siapa saja (Anyone)</strong>.</li>
                  <li>Klik Terapkan, izinkan akses akun, lalu salin URL yang berakhiran <code>/exec</code> ke tab Koneksi.</li>
                </ol>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-[#0d2319] flex items-center gap-1">
                    <Code className="w-3.5 h-3.5 text-stone-500" />
                    Kode Google Apps Script
                  </span>
                  <button
                    id="btn-copy-gas-code"
                    type="button"
                    onClick={handleCopyCode}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-soft-xs"
                  >
                    {hasCopiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{hasCopiedCode ? 'Tersalin!' : 'Salin Kode'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#0d2319] text-emerald-200/90 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-56 border border-[#1a3e32]">
                  {SAMPLE_GAS_CODE}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: PROFIL UNIT */}
          {activeTab === 'settings' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nama Satuan Pelayanan (SPPG) / Dapur MBG
                </label>
                <input
                  id="setting-unit-name"
                  type="text"
                  placeholder="Contoh: SPPG Kecamatan Cipayung Mandiri"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl text-xs font-semibold text-[#0d2319]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nama Kasir / Petugas Lapangan
                </label>
                <input
                  id="setting-cashier-name"
                  type="text"
                  placeholder="Contoh: Budi Santoso (Admin Keuangan)"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl text-xs font-semibold text-[#0d2319]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Target Jumlah Porsi Harian (Untuk Hitung Biaya/Porsi)
                </label>
                <input
                  id="setting-target-portions"
                  type="number"
                  min="1"
                  value={targetPortions}
                  onChange={(e) => setTargetPortions(parseInt(e.target.value, 10) || 1500)}
                  className="w-full px-3.5 py-2.5 bg-[#f8faf8] border border-[#d6e0d6] rounded-xl text-xs font-bold font-mono text-[#0d2319]"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Digunakan untuk mengukur efisiensi anggaran per porsi makan bergizi gratis.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[#e2e8e2] bg-[#f8faf8] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-[#0d2319] rounded-xl"
          >
            Batal
          </button>
          <button
            id="btn-save-all-settings"
            onClick={handleSaveAll}
            className="px-5 py-2 bg-[#0d2319] hover:bg-[#143527] active:scale-95 text-white text-xs font-extrabold rounded-xl shadow-soft-sm transition-all"
          >
            Simpan Konfigurasi
          </button>
        </div>
      </div>
    </div>
  );
};
