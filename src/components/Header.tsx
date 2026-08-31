import React from 'react';
import { AppSettings } from '../types';
import { RefreshCw, Settings, Sparkles } from 'lucide-react';

interface HeaderProps {
  settings: AppSettings;
  pendingCount: number;
  isSyncing: boolean;
  onSyncClick: () => void;
  onOpenSettings: () => void;
  onOpenSmartImport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  pendingCount,
  isSyncing,
  onSyncClick,
  onOpenSettings,
  onOpenSmartImport
}) => {
  const isConnected = Boolean(settings.gasUrl && settings.gasUrl.trim().length > 0);

  return (
    <header className="sticky top-0 z-30 bg-[#0D281E] text-white border-b border-[#1A3E32] shadow-sm backdrop-blur-md">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand & Unit Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-xs">
            <span className="font-extrabold text-[#0D281E] text-xs font-mono tracking-tight">MBG</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs sm:text-sm font-extrabold text-white truncate tracking-tight">
                MBG Kasir SPPG
              </h1>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Online
              </span>
            </div>
            <p className="text-[10px] text-slate-300/80 truncate font-medium">
              {settings.unitName || 'Satuan Pelayanan Pemenuhan Gizi'}
            </p>
          </div>
        </div>

        {/* Action Controls: Smart AI + Sync + Settings */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onOpenSmartImport && (
            <button
              id="header-ai-import-btn"
              onClick={onOpenSmartImport}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-[#0D281E] shadow-sm transition-all"
              title="Import Data Belanja dengan Smart AI"
            >
              <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>AI Import</span>
            </button>
          )}

          {/* Cloud Sync Status Button */}
          <button
            id="header-sync-status-btn"
            onClick={isConnected ? onSyncClick : onOpenSettings}
            disabled={isSyncing}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-150 active:scale-95 ${
              isConnected
                ? pendingCount > 0
                  ? 'bg-amber-950/80 border-amber-600/50 text-amber-200 hover:bg-amber-900/80'
                  : 'bg-[#153B2E] border-emerald-600/40 text-emerald-200 hover:bg-[#1A4536]'
                : 'bg-[#153B2E] border-[#224F3E] text-slate-300 hover:bg-[#1A4536]'
            }`}
            title={isConnected ? 'Sinkronisasi Google Sheets' : 'Hubungkan Google Sheets'}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`}
            />
            <span className="text-[10px] hidden xs:inline font-bold">
              {isSyncing ? 'Sync...' : pendingCount > 0 ? `${pendingCount}` : 'Synced'}
            </span>
          </button>

          {/* Settings Button */}
          <button
            id="header-settings-btn"
            onClick={onOpenSettings}
            className="p-1.5 text-slate-300 hover:text-white bg-[#153B2E] hover:bg-[#1A4536] border border-[#224F3E] rounded-xl transition-all duration-150 active:scale-95"
            title="Pengaturan"
            aria-label="Pengaturan"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
