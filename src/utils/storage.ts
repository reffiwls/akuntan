import { AppSettings, FormDraft, Transaction } from '../types';

const TRANSACTIONS_KEY = 'mbg_transactions_data';
const SETTINGS_KEY = 'mbg_settings_data';
const DRAFT_KEY = 'mbg_expense_form_draft';

// Sample Seed Transactions realistic for an MBG / SPPG catering unit (1500-3000 portions/day)
const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: 'MBG-20260830-001',
    tanggal: '2026-08-30',
    kategori: 'Bahan Baku Segar',
    item: 'Daging Ayam Fillet Dada Segar',
    qty: 60,
    satuan: 'Kg',
    hargaSatuan: 38000,
    total: 2280000,
    metodeBayar: 'Transfer Bank',
    catatan: 'Supplier PT Unggas Berkah, Nota #UP-9021',
    syncStatus: 'synced',
    createdAt: '2026-08-30T05:30:00.000Z'
  },
  {
    id: 'MBG-20260830-002',
    tanggal: '2026-08-30',
    kategori: 'Bahan Baku Segar',
    item: 'Telur Ayam Ras Grade A (3 Peti)',
    qty: 45,
    satuan: 'Kg',
    hargaSatuan: 28500,
    total: 1282500,
    metodeBayar: 'Tunai',
    catatan: 'Peternakan Jaya Makmur, Bayar cash di lokasi',
    syncStatus: 'synced',
    createdAt: '2026-08-30T06:10:00.000Z'
  },
  {
    id: 'MBG-20260830-003',
    tanggal: '2026-08-30',
    kategori: 'Bahan Baku Segar',
    item: 'Sayur Wortel Berastagi & Brokoli Segar',
    qty: 35,
    satuan: 'Kg',
    hargaSatuan: 16000,
    total: 560000,
    metodeBayar: 'Tunai',
    catatan: 'Pasar Induk Kramat Jati',
    syncStatus: 'synced',
    createdAt: '2026-08-30T06:45:00.000Z'
  },
  {
    id: 'MBG-20260830-004',
    tanggal: '2026-08-30',
    kategori: 'Sembako & Bumbu',
    item: 'Beras Medium Pulen Wangi (5 Karung @25kg)',
    qty: 125,
    satuan: 'Kg',
    hargaSatuan: 13800,
    total: 1725000,
    metodeBayar: 'Transfer Bank',
    catatan: 'Toko Beras Subur Makmur, DO #BM-884',
    syncStatus: 'synced',
    createdAt: '2026-08-30T07:15:00.000Z'
  },
  {
    id: 'MBG-20260830-005',
    tanggal: '2026-08-30',
    kategori: 'Kemasan & Wadah',
    item: 'Food Box Sekat 4 Food-Grade MBG + Sendok',
    qty: 1500,
    satuan: 'Pcs',
    hargaSatuan: 850,
    total: 1275000,
    metodeBayar: 'Transfer Bank',
    catatan: 'Pabrik Kemasan Prima, Kirim ke dapur',
    syncStatus: 'synced',
    createdAt: '2026-08-30T08:00:00.000Z'
  },
  {
    id: 'MBG-20260830-006',
    tanggal: '2026-08-30',
    kategori: 'Operasional Dapur',
    item: 'Refill Tabung Gas LPG 12 Kg (2 Tabung)',
    qty: 2,
    satuan: 'Tabung',
    hargaSatuan: 215000,
    total: 430000,
    metodeBayar: 'Tunai',
    catatan: 'Agen Gas Sumber Rezeki',
    syncStatus: 'synced',
    createdAt: '2026-08-30T08:30:00.000Z'
  },
  {
    id: 'MBG-20260829-001',
    tanggal: '2026-08-29',
    kategori: 'Logistik & Distribusi',
    item: 'Bahan Bakar Armada Pengantaran Sekolah (2 Mobil)',
    qty: 50,
    satuan: 'Liter',
    hargaSatuan: 10000,
    total: 500000,
    metodeBayar: 'Tunai',
    catatan: 'SPBU Pertamina #34-112',
    syncStatus: 'synced',
    createdAt: '2026-08-29T10:00:00.000Z'
  },
  {
    id: 'MBG-20260829-002',
    tanggal: '2026-08-29',
    kategori: 'Upah Tenaga Kerja / Harian',
    item: 'Upah Harian Juru Masak & Packing 5 Orang',
    qty: 5,
    satuan: 'Hari',
    hargaSatuan: 130000,
    total: 650000,
    metodeBayar: 'Tunai',
    catatan: 'Shift pagi menu ikan dori & tumis buncis',
    syncStatus: 'synced',
    createdAt: '2026-08-29T13:00:00.000Z'
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  gasUrl: '',
  unitName: 'Satuan Pelayanan Pemenuhan Gizi (SPPG) Dapur Mandiri 01',
  targetPortionsDaily: 1500,
  budgetPerPortion: 15000,
  autoSync: true,
  lastSyncTime: null,
  cashierName: 'Admin Keuangan SPPG'
};

/**
 * Load all transactions from LocalStorage (or seed on first run)
 */
export function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    if (!raw) {
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(SEED_TRANSACTIONS));
      return SEED_TRANSACTIONS;
    }
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : SEED_TRANSACTIONS;
  } catch (err) {
    console.error('Error loading transactions:', err);
    return SEED_TRANSACTIONS;
  }
}

/**
 * Save all transactions to LocalStorage
 */
export function saveTransactions(transactions: Transaction[]): void {
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch (err) {
    console.error('Error saving transactions to localStorage:', err);
  }
}

/**
 * Load App Settings
 */
export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (err) {
    console.error('Error loading settings:', err);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save App Settings
 */
export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving settings:', err);
  }
}

/**
 * Load draft form data
 */
export function loadDraft(): FormDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading form draft:', err);
    return null;
  }
}

/**
 * Save draft form data
 */
export function saveDraft(draft: FormDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (err) {
    console.error('Error saving form draft:', err);
  }
}

/**
 * Clear draft
 */
export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (err) {
    console.error('Error clearing draft:', err);
  }
}
