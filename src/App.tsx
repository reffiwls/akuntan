import React, { useState, useEffect, useCallback } from 'react';
import {
  ActiveTab,
  AppSettings,
  ToastMessage,
  Transaction
} from './types';
import {
  loadTransactions,
  saveTransactions,
  loadSettings,
  saveSettings
} from './utils/storage';
import {
  batchSyncToGas,
  deleteTransactionFromGas,
  fetchTransactionsFromGas,
  postTransactionToGas
} from './utils/gasService';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DashboardTab } from './components/DashboardTab';
import { ExpenseFormTab } from './components/ExpenseFormTab';
import { HistoryTab } from './components/HistoryTab';
import { ReportTab } from './components/ReportTab';
import { GasSyncModal } from './components/GasSyncModal';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { EditTransactionModal } from './components/EditTransactionModal';
import { SmartExcelImportModal } from './components/SmartExcelImportModal';
import { Toast } from './components/Toast';
import { PrintableReport } from './components/PrintableReport';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals state
  const [isGasModalOpen, setIsGasModalOpen] = useState<boolean>(false);
  const [isSmartImportOpen, setIsSmartImportOpen] = useState<boolean>(false);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Print configuration state
  const [printConfig, setPrintConfig] = useState<{
    transactions: Transaction[];
    title?: string;
    customRange?: { start?: string; end?: string };
  } | null>(null);

  // Initialize transactions on mount
  useEffect(() => {
    const initialData = loadTransactions();
    setTransactions(initialData);
  }, []);

  // Sync state changes with localStorage
  useEffect(() => {
    if (transactions.length > 0) {
      saveTransactions(transactions);
    }
  }, [transactions]);

  // Show toast utility
  const showToast = useCallback(
    (title: string, message?: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
      const id = Date.now().toString() + Math.random().toString().slice(2, 6);
      const newToast: ToastMessage = { id, title, message, type };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Trigger browser print with target data
  const handleTriggerPrint = (
    customList: Transaction[],
    title?: string,
    customRange?: { start?: string; end?: string }
  ) => {
    setPrintConfig({
      transactions: customList,
      title,
      customRange
    });
    setTimeout(() => {
      window.print();
    }, 120);
  };

  // Push single transaction to GAS in background
  const syncSingleToGas = async (tx: Transaction, action: 'CREATE' | 'UPDATE' = 'CREATE') => {
    if (!settings.gasUrl || !settings.gasUrl.trim()) return;

    try {
      const res = await postTransactionToGas(settings.gasUrl, tx, action);
      if (res.success) {
        setTransactions((prev) =>
          prev.map((item) => (item.id === tx.id ? { ...item, syncStatus: 'synced' } : item))
        );
      }
    } catch (err) {
      console.warn('Background sync deferred to offline queue:', err);
    }
  };

  // Add new transaction
  const handleSaveTransaction = (
    newTxData: Omit<Transaction, 'id' | 'createdAt' | 'syncStatus'>,
    inputAgain: boolean
  ) => {
    const timestamp = Date.now();
    const dateFormatted = newTxData.tanggal.replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newId = `MBG-${dateFormatted}-${randomSuffix}`;

    const newTransaction: Transaction = {
      ...newTxData,
      id: newId,
      createdAt: new Date(timestamp).toISOString(),
      syncStatus: 'pending'
    };

    setTransactions((prev) => [newTransaction, ...prev]);

    showToast(
      'Transaksi Berhasil Disimpan',
      `${newTransaction.item} (${newTransaction.qty} ${newTransaction.satuan}) dicatat.`,
      'success'
    );

    // Attempt background sync if online & GAS URL is configured
    syncSingleToGas(newTransaction, 'CREATE');

    if (!inputAgain) {
      setActiveTab('history');
    }
  };

  // Batch import from Smart AI modal
  const handleBatchImport = (
    newItems: Array<Omit<Transaction, 'id' | 'createdAt' | 'syncStatus'>>
  ) => {
    const now = Date.now();
    const createdList: Transaction[] = newItems.map((item, idx) => {
      const dateFormatted = item.tanggal.replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000) + idx;
      return {
        ...item,
        id: `MBG-${dateFormatted}-${randomSuffix}`,
        createdAt: new Date(now + idx * 10).toISOString(),
        syncStatus: 'pending'
      };
    });

    setTransactions((prev) => [...createdList, ...prev]);
    showToast(
      'Import AI Berhasil',
      `${createdList.length} transaksi belanja berhasil dimasukkan ke pembukuan.`,
      'success'
    );

    setActiveTab('history');
  };

  // Update existing transaction
  const handleSaveEdit = (updatedTx: Transaction) => {
    const preparedTx: Transaction = {
      ...updatedTx,
      syncStatus: 'pending'
    };

    setTransactions((prev) =>
      prev.map((t) => (t.id === preparedTx.id ? preparedTx : t))
    );

    setEditingTransaction(null);
    if (viewingTransaction && viewingTransaction.id === preparedTx.id) {
      setViewingTransaction(preparedTx);
    }

    showToast(
      'Perubahan Disimpan',
      `Data transaksi ${preparedTx.item} berhasil diperbarui.`,
      'success'
    );

    // Attempt background sync
    syncSingleToGas(preparedTx, 'UPDATE');
  };

  // Delete transaction
  const handleDeleteTransaction = async (id: string) => {
    const txToDelete = transactions.find((t) => t.id === id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));

    if (viewingTransaction && viewingTransaction.id === id) {
      setViewingTransaction(null);
    }

    showToast('Transaksi Dihapus', 'Data pengeluaran telah dihapus dari pembukuan.', 'info');

    // Sync deletion with GAS
    if (settings.gasUrl && settings.gasUrl.trim() && txToDelete) {
      try {
        await deleteTransactionFromGas(settings.gasUrl, id);
      } catch (err) {
        console.warn('Failed to delete on Google Sheets:', err);
      }
    }
  };

  // Save Settings
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    showToast('Pengaturan Disimpan', 'Konfigurasi unit SPPG berhasil diperbarui.', 'success');
  };

  // Full Push Sync (Offline Queue to Google Sheets)
  const handlePushToGas = async () => {
    if (!settings.gasUrl || !settings.gasUrl.trim()) {
      setIsGasModalOpen(true);
      showToast('Konfigurasi Diperlukan', 'Silakan masukkan URL Web App Google Apps Script.', 'warning');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await batchSyncToGas(settings.gasUrl, transactions);
      if (result.success) {
        setTransactions((prev) =>
          prev.map((t) => ({ ...t, syncStatus: 'synced' }))
        );
        const count = (result.addedCount || 0) + (result.updatedCount || 0) || transactions.length;
        showToast(
          'Sinkronisasi Sukses',
          `${count} data pengeluaran tersinkron ke Google Sheets.`,
          'success'
        );
      } else {
        showToast('Sinkronisasi Gagal', result.error || 'Periksa URL GAS dan koneksi internet.', 'error');
      }
    } catch (err: any) {
      showToast('Gagal Menghubungi Server', err?.message || 'Koneksi ke Google Sheets terganggu.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Full Pull Sync (Google Sheets to local)
  const handlePullFromGas = async () => {
    if (!settings.gasUrl || !settings.gasUrl.trim()) {
      setIsGasModalOpen(true);
      return;
    }

    setIsSyncing(true);
    try {
      const fetched = await fetchTransactionsFromGas(settings.gasUrl);
      if (Array.isArray(fetched) && fetched.length > 0) {
        setTransactions(fetched);
        saveTransactions(fetched);
        showToast(
          'Data Berhasil Diunduh',
          `${fetched.length} transaksi diimpor dari Google Sheets.`,
          'success'
        );
      } else {
        showToast('Info', 'Tidak ada data transaksi baru di Google Sheets.', 'info');
      }
    } catch (err: any) {
      showToast('Gagal Mengambil Data', err?.message || 'Periksa izin deployment Web App GAS.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Share WhatsApp helper
  const handleShareWhatsApp = (message: string) => {
    const phone = settings.whatsappRecipient ? settings.whatsappRecipient.replace(/[^\d]/g, '') : '';
    const encoded = encodeURIComponent(message);
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    
    // In iframe safe context, open directly
    window.location.href = waUrl;
  };

  const pendingCount = transactions.filter((t) => t.syncStatus === 'pending').length;

  return (
    <div className="min-h-screen bg-[#F3F6F4] text-slate-900 flex flex-col font-sans selection:bg-emerald-700 selection:text-white">
      {/* Printable Report Document (Only visible during window.print()) */}
      <PrintableReport
        transactions={printConfig ? printConfig.transactions : transactions}
        settings={settings}
        periodTitle={printConfig?.title}
        customRange={printConfig?.customRange}
      />

      {/* Floating Toast Notification Stack */}
      <div className="print:hidden">
        <Toast toasts={toasts} onDismiss={dismissToast} />
      </div>

      {/* Sticky Mobile Header */}
      <div className="print:hidden">
        <Header
          settings={settings}
          pendingCount={pendingCount}
          isSyncing={isSyncing}
          onSyncClick={handlePushToGas}
          onOpenSettings={() => setIsGasModalOpen(true)}
          onOpenSmartImport={() => setIsSmartImportOpen(true)}
        />
      </div>

      {/* Main Tab Views */}
      <main className="flex-1 max-w-md w-full mx-auto px-3.5 sm:px-4 pt-2 pb-6 print:hidden">
        {activeTab === 'dashboard' && (
          <DashboardTab
            transactions={transactions}
            settings={settings}
            onNavigateToInput={() => setActiveTab('input')}
            onNavigateToHistory={() => setActiveTab('history')}
            onNavigateToReports={() => setActiveTab('reports')}
            onSelectTransaction={(t) => setViewingTransaction(t)}
            onSync={handlePushToGas}
            isSyncing={isSyncing}
            onShareWhatsApp={handleShareWhatsApp}
            onOpenSmartImport={() => setIsSmartImportOpen(true)}
          />
        )}

        {activeTab === 'input' && (
          <ExpenseFormTab
            onSave={handleSaveTransaction}
            cashierName={settings.cashierName}
            onOpenSmartImport={() => setIsSmartImportOpen(true)}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab
            transactions={transactions}
            settings={settings}
            onViewDetail={(t) => setViewingTransaction(t)}
            onEdit={(t) => setEditingTransaction(t)}
            onDelete={handleDeleteTransaction}
            onShareWhatsApp={handleShareWhatsApp}
            onPrintReport={handleTriggerPrint}
          />
        )}

        {activeTab === 'reports' && (
          <ReportTab
            transactions={transactions}
            settings={settings}
            onShareWhatsApp={handleShareWhatsApp}
            onPrintReport={handleTriggerPrint}
          />
        )}
      </main>

      {/* Sticky Mobile Bottom Navigation */}
      <div className="print:hidden">
        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={pendingCount}
        />
      </div>

      {/* Google Apps Script & Settings Modal */}
      <div className="print:hidden">
        <GasSyncModal
          isOpen={isGasModalOpen}
          onClose={() => setIsGasModalOpen(false)}
          settings={settings}
          onSaveSettings={handleSaveSettings}
          transactions={transactions}
          onPullFromGas={handlePullFromGas}
          onPushToGas={handlePushToGas}
          isSyncing={isSyncing}
          onShowToast={showToast}
        />

        {/* Smart AI Excel/Text Import Modal */}
        <SmartExcelImportModal
          isOpen={isSmartImportOpen}
          onClose={() => setIsSmartImportOpen(false)}
          onImportDone={handleBatchImport}
        />

        {/* Transaction Detail Modal */}
        <TransactionDetailModal
          transaction={viewingTransaction}
          onClose={() => setViewingTransaction(null)}
          onEdit={(t) => setEditingTransaction(t)}
          onDelete={handleDeleteTransaction}
        />

        {/* Edit Transaction Modal */}
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSave={handleSaveEdit}
        />
      </div>
    </div>
  );
}
