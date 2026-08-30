import { Transaction } from '../types';

export interface GasPingResult {
  success: boolean;
  message: string;
  spreadsheetName?: string;
  sheetName?: string;
  totalRows?: number;
  error?: string;
}

export interface GasSyncResult {
  success: boolean;
  message: string;
  data?: Transaction[];
  addedCount?: number;
  updatedCount?: number;
  error?: string;
}

/**
 * Ping test to verify Google Apps Script Web App URL connectivity
 */
export async function pingGasUrl(gasUrl: string): Promise<GasPingResult> {
  if (!gasUrl || !gasUrl.startsWith('https://script.google.com/macros/s/')) {
    return {
      success: false,
      message: 'URL Google Apps Script tidak valid. Harus diawali dengan https://script.google.com/macros/s/...',
      error: 'Invalid URL format'
    };
  }

  try {
    const url = new URL(gasUrl);
    url.searchParams.set('action', 'PING');
    url.searchParams.set('_t', Date.now().toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.status === 'success') {
      return {
        success: true,
        message: data.message || 'Koneksi ke Google Sheets berhasil!',
        spreadsheetName: data.spreadsheetName,
        sheetName: data.sheetName,
        totalRows: data.totalRows
      };
    } else {
      return {
        success: false,
        message: data.message || 'Respons Apps Script menandakan kegagalan',
        error: data.message
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'Gagal terhubung ke Google Apps Script: ' + (err.message || err.toString()),
      error: err.toString()
    };
  }
}

/**
 * Fetch all transactions from Google Apps Script Web App
 */
export async function fetchTransactionsFromGas(gasUrl: string): Promise<GasSyncResult> {
  if (!gasUrl) {
    return { success: false, message: 'URL Google Apps Script belum diisi' };
  }

  try {
    const url = new URL(gasUrl);
    url.searchParams.set('action', 'GET_ALL');
    url.searchParams.set('_t', Date.now().toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.status === 'success' && Array.isArray(data.data)) {
      return {
        success: true,
        message: `Berhasil mengunduh ${data.data.length} transaksi dari Google Sheets`,
        data: data.data
      };
    } else {
      return {
        success: false,
        message: data.message || 'Gagal membaca data dari spreadsheet',
        error: data.message
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'Gagal mengambil data dari Google Sheets: ' + (err.message || err.toString()),
      error: err.toString()
    };
  }
}

/**
 * Post single transaction to Google Apps Script
 */
export async function postTransactionToGas(
  gasUrl: string,
  transaction: Transaction,
  action: 'CREATE' | 'UPDATE' = 'CREATE'
): Promise<GasSyncResult> {
  if (!gasUrl) {
    return { success: false, message: 'URL GAS belum disetel, data tersimpan secara lokal' };
  }

  try {
    const payload = {
      action,
      data: transaction
    };

    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const resData = await response.json();
    return {
      success: resData.status === 'success',
      message: resData.message || 'Sinkronisasi berhasil'
    };
  } catch (err: any) {
    console.error('GAS Post error:', err);
    return {
      success: false,
      message: 'Gagal mengirim transaksi ke Google Sheets: ' + (err.message || err.toString()),
      error: err.toString()
    };
  }
}

/**
 * Delete transaction from Google Apps Script
 */
export async function deleteTransactionFromGas(
  gasUrl: string,
  transactionId: string
): Promise<GasSyncResult> {
  if (!gasUrl) {
    return { success: false, message: 'URL GAS belum disetel' };
  }

  try {
    const payload = {
      action: 'DELETE',
      id: transactionId
    };

    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    const resData = await response.json();
    return {
      success: resData.status === 'success' || resData.status === 'warning',
      message: resData.message || 'Berhasil dihapus dari Google Sheets'
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Gagal menghapus di Google Sheets: ' + (err.message || err.toString()),
      error: err.toString()
    };
  }
}

/**
 * Batch push all local pending transactions to Google Apps Script
 */
export async function batchSyncToGas(
  gasUrl: string,
  transactions: Transaction[]
): Promise<GasSyncResult> {
  if (!gasUrl) {
    return { success: false, message: 'URL GAS belum disetel' };
  }

  try {
    const payload = {
      action: 'BATCH_SYNC',
      items: transactions
    };

    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    const resData = await response.json();
    if (resData.status === 'success') {
      return {
        success: true,
        message: `Sinkronisasi tuntas! ${resData.totalSynced || transactions.length} data tersinkron ke Google Sheets.`,
        addedCount: resData.addedCount,
        updatedCount: resData.updatedCount
      };
    } else {
      return {
        success: false,
        message: resData.message || 'Gagal melakukan sinkronisasi massal',
        error: resData.message
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'Gagal sinkronisasi ke Google Sheets: ' + (err.message || err.toString()),
      error: err.toString()
    };
  }
}
