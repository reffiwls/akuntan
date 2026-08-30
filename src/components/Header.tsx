import React from 'react';
import { AppSettings } from '../types';
import { RefreshCw, Cloud, CloudOff, Settings, ShieldCheck, Sparkles } from 'lucide-react';

interface HeaderProps {
  settings: AppSettings;
  pendingCount: number;
  isSyncing: boolean;
  onSyncClick: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  pendingCount,
  isSyncing,
  onSyncClick,
  onOpenSettings
}) => {
  const isConnected = Boolean(settings.gasUrl && settings.gasUrl.trim().length > 0);

  return (
    <header className="sticky top-0 z-30 bg-[#0d2319] text-white border-b border-[#1a3e32] shadow-sm backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand & Unit Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center flex-shrink-0 shadow-soft-sm">
            <span className="font-bold text-white tracking-wider text-[11px] font-mono">MBG</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-bold text-white truncate tracking-tight">
                MBG Keuangan SPPG
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                PWA Active
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/70 truncate max-w-[210px] sm:max-w-xs font-normal">
              {settings.unitName || 'Satuan Pelayanan Pemenuhan Gizi'}
            </p>
          </div>
        </div>

        {/* Action / Sync Status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Cloud Sync Status Pill */}
          <button
            id="header-sync-status-btn"
            onClick={isConnected ? onSyncClick : onOpenSettings}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 active:scale-95 shadow-soft-xs ${
              isConnected
                ? pendingCount > 0
                  ? 'bg-amber-950/80 border-amber-600/60 text-amber-200 hover:bg-amber-900/80'
                  : 'bg-emerald-950/80 border-emerald-600/50 text-emerald-200 hover:bg-emerald-900/80'
                : 'bg-[#153427] border-[#224f3c] text-emerald-100/80 hover:bg-[#1a3e32]'
            }`}
            title={isConnected ? 'Klik untuk sinkronisasi Google Sheets' : 'Klik untuk hubungkan Google Sheets'}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-300" />
                <span className="hidden xs:inline">Menyinkron...</span>
              </>
            ) : isConnected ? (
              pendingCount > 0 ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
                  <span>{pendingCount} Pending</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="hidden xs:inline">Sheets Sync</span>
                </>
              )
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5 text-emerald-200/60" />
                <span className="hidden xs:inline">Setup GAS</span>
              </>
            )}
          </button>

          {/* Quick Settings Icon */}
          <button
            id="header-settings-btn"
            onClick={onOpenSettings}
            className="p-2 text-emerald-100/70 hover:text-white bg-[#153427] hover:bg-[#1c4534] border border-[#224f3c] rounded-xl transition-all duration-150 active:scale-95 shadow-soft-xs"
            aria-label="Pengaturan Aplikasi & Google Sheets"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
