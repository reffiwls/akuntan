export type ExpenseCategory =
  | 'Bahan Baku Segar'
  | 'Sembako & Bumbu'
  | 'Kemasan & Wadah'
  | 'Operasional Dapur'
  | 'Logistik & Distribusi'
  | 'Upah Tenaga Kerja / Harian'
  | 'Lain-lain';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Bahan Baku Segar',
  'Sembako & Bumbu',
  'Kemasan & Wadah',
  'Operasional Dapur',
  'Logistik & Distribusi',
  'Upah Tenaga Kerja / Harian',
  'Lain-lain'
];

export const CATEGORY_DESCRIPTIONS: Record<ExpenseCategory, string> = {
  'Bahan Baku Segar': 'Sayur, Daging, Telur, Ikan, Tahu/Tempe',
  'Sembako & Bumbu': 'Beras, Minyak, Gula, Garam, Bumbu Dapur',
  'Kemasan & Wadah': 'Ompreng/Box MBG, Plastik, Sendok, Tissue',
  'Operasional Dapur': 'Gas LPG, Listrik, Air Bersih, Kebersihan',
  'Logistik & Distribusi': 'Bensin, Sewa Kendaraan, Ongkir',
  'Upah Tenaga Kerja / Harian': 'Juru Masak, Helper, Packer Harian',
  'Lain-lain': 'Pengeluaran darurat / perlengkapan tambahan'
};

export type UnitType =
  | 'Kg'
  | 'Gram'
  | 'Liter'
  | 'Pcs'
  | 'Ikat'
  | 'Dus'
  | 'Karung'
  | 'Paket'
  | 'Porsi'
  | 'Tabung'
  | 'Hari'
  | 'Bulan';

export const COMMON_UNITS: UnitType[] = [
  'Kg',
  'Gram',
  'Liter',
  'Pcs',
  'Ikat',
  'Dus',
  'Karung',
  'Paket',
  'Porsi',
  'Tabung',
  'Hari',
  'Bulan'
];

export type PaymentMethod = 'Tunai' | 'Transfer Bank';

export type SyncStatus = 'synced' | 'pending' | 'error';

export interface Transaction {
  id: string;
  tanggal: string; // YYYY-MM-DD
  kategori: ExpenseCategory;
  item: string;
  qty: number;
  satuan: string;
  hargaSatuan: number;
  total: number;
  metodeBayar: PaymentMethod;
  catatan?: string;
  syncStatus?: SyncStatus;
  createdAt: string; // ISO string
  updatedAt?: string;
}

export interface AppSettings {
  gasUrl: string;
  unitName: string;
  targetPortionsDaily: number;
  budgetPerPortion: number;
  autoSync: boolean;
  lastSyncTime: string | null;
  cashierName: string;
}

export interface FormDraft {
  tanggal: string;
  kategori: ExpenseCategory;
  item: string;
  qty: string;
  satuan: string;
  hargaSatuan: string;
  total: string;
  isCustomTotal: boolean;
  metodeBayar: PaymentMethod;
  catatan: string;
  updatedAt: number;
}

export type ActiveTab = 'dashboard' | 'input' | 'history' | 'reports';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}
