/**
 * ============================================================================
 * GOOGLE APPS SCRIPT (GAS) BACKEND DATABASE UNTUK MBG KASIR & KEUANGAN SPPG
 * ============================================================================
 * 
 * PETUNJUK INSTALASI:
 * 1. Buat Google Spreadsheet baru di Google Drive (atau buka spreadsheet yang ada).
 * 2. Klik menu "Ekstensi" (Extensions) -> "Apps Script".
 * 3. Hapus semua kode default di editor, lalu PASTE SELURUH KODE DI BAWAH INI.
 * 4. Klik tombol "Simpan" (ikon disket / Ctrl+S).
 * 5. Klik tombol biru "Terapkan" (Deploy) -> "Penerapan Baru" (New Deployment).
 * 6. Pilih jenis penerapan: "Aplikasi Web" (Web App).
 * 7. Konfigurasi:
 *    - Deskripsi: "MBG Kasir API v1"
 *    - Jalankan sebagai (Execute as): "Saya" (Me - akun Anda)
 *    - Yang memiliki akses (Who has access): "Siapa saja" (Anyone) -> PENTING!
 * 8. Klik "Terapkan" (Deploy), berikan izin akses (Review Permissions -> Advanced -> Go to ...).
 * 9. Salin "URL Aplikasi Web" (akhiran /exec) dan paste ke pengaturan aplikasi MBG Kasir!
 * ============================================================================
 */

const SHEET_NAME = 'Transaksi_MBG';
const HEADERS = [
  'ID',
  'Tanggal',
  'Kategori',
  'Item',
  'Qty',
  'Satuan',
  'Harga_Satuan',
  'Total',
  'Metode_Bayar',
  'Catatan',
  'Timestamp'
];

/**
 * Inisialisasi sheet jika belum ada atau kosong
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  // Periksa header
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    // Format header baris pertama
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground('#0F172A');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    
    // Auto resize column
    sheet.autoResizeColumns(1, HEADERS.length);
  }
  
  return sheet;
}

/**
 * Handle HTTP GET Requests (Fetch Data, Ping test)
 */
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
    
    // GET_ALL Transactions
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return createJsonResponse({
        status: 'success',
        data: [],
        count: 0
      });
    }
    
    const dataRange = sheet.getRange(2, 1, lastRow - 1, HEADERS.length);
    const rawValues = dataRange.getValues();
    
    const transactions = rawValues.map(function(row) {
      // Format tanggal ke string YYYY-MM-DD
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
        kategori: String(row[2] || ''),
        item: String(row[3] || ''),
        qty: Number(row[4] || 0),
        satuan: String(row[5] || ''),
        hargaSatuan: Number(row[6] || 0),
        total: Number(row[7] || 0),
        metodeBayar: String(row[8] || 'Tunai'),
        catatan: String(row[9] || ''),
        createdAt: String(row[10] || new Date().toISOString()),
        syncStatus: 'synced'
      };
    }).filter(function(t) {
      return t.id !== '';
    });
    
    return createJsonResponse({
      status: 'success',
      data: transactions,
      count: transactions.length
    });

  } catch (error) {
    return createJsonResponse({
      status: 'error',
      message: error.toString()
    });
  }
}

/**
 * Handle HTTP POST Requests (Create, Update, Delete, Batch Sync)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  // Tunggu maksimal 30 detik untuk thread safety
  lock.tryLock(30000);
  
  try {
    const sheet = getOrCreateSheet();
    let body = {};
    
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (err) {
        // Fallback jika dikirim via URL Encoded
        body = e.parameter || {};
      }
    } else if (e && e.parameter) {
      body = e.parameter;
    }
    
    const action = body.action || 'CREATE';
    
    // 1. ACTION: CREATE
    if (action === 'CREATE') {
      const item = body.data || body;
      const id = item.id || ('MBG-' + new Date().getTime());
      const nowIso = new Date().toISOString();
      
      const newRow = [
        id,
        item.tanggal || new Date().toISOString().slice(0, 10),
        item.kategori || 'Lain-lain',
        item.item || 'Item Tanpa Nama',
        Number(item.qty || 1),
        item.satuan || 'Pcs',
        Number(item.hargaSatuan || 0),
        Number(item.total || 0),
        item.metodeBayar || 'Tunai',
        item.catatan || '',
        item.createdAt || nowIso
      ];
      
      sheet.appendRow(newRow);
      
      return createJsonResponse({
        status: 'success',
        action: 'CREATE',
        id: id,
        message: 'Transaksi berhasil disimpan ke Google Sheets'
      });
    }
    
    // 2. ACTION: UPDATE
    if (action === 'UPDATE') {
      const item = body.data || body;
      const targetId = String(item.id);
      
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return createJsonResponse({ status: 'error', message: 'Data tidak ditemukan' });
      }
      
      const idColumnValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      let rowIndex = -1;
      
      for (let i = 0; i < idColumnValues.length; i++) {
        if (String(idColumnValues[i][0]) === targetId) {
          rowIndex = i + 2; // offset header
          break;
        }
      }
      
      if (rowIndex === -1) {
        // Jika tidak ditemukan, buat baris baru
        const newRow = [
          targetId,
          item.tanggal || new Date().toISOString().slice(0, 10),
          item.kategori || 'Lain-lain',
          item.item || '',
          Number(item.qty || 1),
          item.satuan || 'Pcs',
          Number(item.hargaSatuan || 0),
          Number(item.total || 0),
          item.metodeBayar || 'Tunai',
          item.catatan || '',
          item.createdAt || new Date().toISOString()
        ];
        sheet.appendRow(newRow);
        return createJsonResponse({ status: 'success', action: 'UPDATE_INSERTED', id: targetId });
      }
      
      // Update existing row
      const updateRow = [
        targetId,
        item.tanggal || '',
        item.kategori || '',
        item.item || '',
        Number(item.qty || 1),
        item.satuan || '',
        Number(item.hargaSatuan || 0),
        Number(item.total || 0),
        item.metodeBayar || 'Tunai',
        item.catatan || '',
        item.createdAt || new Date().toISOString()
      ];
      
      sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([updateRow]);
      
      return createJsonResponse({
        status: 'success',
        action: 'UPDATE',
        id: targetId,
        message: 'Transaksi berhasil diubah di Google Sheets'
      });
    }
    
    // 3. ACTION: DELETE
    if (action === 'DELETE') {
      const targetId = String(body.id || (body.data && body.data.id));
      const lastRow = sheet.getLastRow();
      
      if (lastRow <= 1) {
        return createJsonResponse({ status: 'error', message: 'Sheet kosong' });
      }
      
      const idColumnValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      let rowIndex = -1;
      
      for (let i = 0; i < idColumnValues.length; i++) {
        if (String(idColumnValues[i][0]) === targetId) {
          rowIndex = i + 2;
          break;
        }
      }
      
      if (rowIndex !== -1) {
        sheet.deleteRow(rowIndex);
        return createJsonResponse({
          status: 'success',
          action: 'DELETE',
          id: targetId,
          message: 'Transaksi berhasil dihapus dari Google Sheets'
        });
      } else {
        return createJsonResponse({
          status: 'warning',
          action: 'DELETE',
          message: 'ID tidak ditemukan di Google Sheets, mungkin sudah dihapus'
        });
      }
    }
    
    // 4. ACTION: BATCH_SYNC
    if (action === 'BATCH_SYNC') {
      const items = body.items || [];
      let added = 0;
      let updated = 0;
      
      const lastRow = sheet.getLastRow();
      const existingMap = {};
      
      if (lastRow > 1) {
        const idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (let i = 0; i < idValues.length; i++) {
          existingMap[String(idValues[i][0])] = i + 2;
        }
      }
      
      items.forEach(function(item) {
        const id = String(item.id || ('MBG-' + new Date().getTime()));
        const rowData = [
          id,
          item.tanggal || new Date().toISOString().slice(0, 10),
          item.kategori || 'Lain-lain',
          item.item || '',
          Number(item.qty || 1),
          item.satuan || 'Pcs',
          Number(item.hargaSatuan || 0),
          Number(item.total || 0),
          item.metodeBayar || 'Tunai',
          item.catatan || '',
          item.createdAt || new Date().toISOString()
        ];
        
        if (existingMap[id]) {
          sheet.getRange(existingMap[id], 1, 1, HEADERS.length).setValues([rowData]);
          updated++;
        } else {
          sheet.appendRow(rowData);
          added++;
        }
      });
      
      return createJsonResponse({
        status: 'success',
        action: 'BATCH_SYNC',
        addedCount: added,
        updatedCount: updated,
        totalSynced: items.length
      });
    }
    
    return createJsonResponse({
      status: 'error',
      message: 'Aksi tidak dikenali: ' + action
    });

  } catch (error) {
    return createJsonResponse({
      status: 'error',
      message: error.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Utility: Membuat JSON Response dengan CORS Headers
 */
function createJsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
