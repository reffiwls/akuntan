import React from 'react';
import { ActiveTab } from '../types';
import { LayoutDashboard, PlusCircle, History, FileSpreadsheet } from 'lucide-react';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  pendingCount = 0
}) => {
  const tabs = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Ringkasan',
      icon: LayoutDashboard
    },
    {
      id: 'input' as ActiveTab,
      label: 'Input',
      icon: PlusCircle
    },
    {
      id: 'history' as ActiveTab,
      label: 'Riwayat',
      icon: History,
      badge: pendingCount > 0 ? pendingCount : null
    },
    {
      id: 'reports' as ActiveTab,
      label: 'Laporan',
      icon: FileSpreadsheet
    }
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pointer-events-none flex justify-center px-4 mb-4 pb-[env(safe-area-inset-bottom,0px)] print:hidden">
      <nav
        id="bottom-navigation"
        className="pointer-events-auto w-full max-w-md bg-[#0D281E]/95 border border-emerald-500/20 rounded-3xl shadow-[0_16px_36px_rgba(0,0,0,0.35)] p-1.5 backdrop-blur-md"
      >
        <div className="flex items-stretch justify-between gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                id={`nav-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl min-h-[54px] transition-all duration-150 active:scale-95 ${
                  isActive
                    ? 'bg-emerald-500/20 border border-emerald-400/35 text-white shadow-inner'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
                aria-label={`Buka Tab ${tab.label}`}
              >
                {/* Icon with pending badge */}
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={`w-5 h-5 transition-transform duration-150 ${
                      isActive
                        ? 'text-emerald-400 stroke-[2.4] scale-105'
                        : 'text-slate-400 stroke-[2]'
                    }`}
                  />
                  {tab.badge && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 flex items-center justify-center text-[9px] font-black bg-amber-400 text-[#0D281E] rounded-full ring-2 ring-[#0D281E] shadow-sm animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </div>

                {/* Tab Label */}
                <span
                  className={`text-[11px] mt-1 tracking-tight text-center leading-none whitespace-nowrap ${
                    isActive ? 'text-emerald-300 font-extrabold' : 'text-slate-400 font-medium'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
