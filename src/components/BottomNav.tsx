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
    <div className="fixed inset-x-0 bottom-0 z-40 pointer-events-none flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] pt-2 print:hidden">
      <nav
        id="bottom-navigation"
        className="pointer-events-auto w-full max-w-md bg-white/95 backdrop-blur-md border border-[#e2e8e2] rounded-3xl shadow-floating px-2 py-1.5 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                id={`nav-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 relative flex flex-col items-center py-2 px-1 rounded-2xl min-h-[48px] justify-center transition-all duration-150 active:scale-95 ${
                  isActive
                    ? 'text-emerald-900 font-bold'
                    : 'text-slate-400 hover:text-slate-700 font-medium'
                }`}
                aria-label={`Buka Tab ${tab.label}`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-transform duration-150 ${
                      isActive
                        ? 'stroke-[2.4] text-emerald-800 scale-105'
                        : 'stroke-[1.8] text-slate-400'
                    }`}
                  />
                  {tab.badge && (
                    <span className="absolute -top-1 -right-2 px-1.5 py-0.2 text-[9px] font-bold bg-amber-500 text-white rounded-full shadow-xs">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] mt-1 tracking-tight leading-none ${
                    isActive ? 'text-emerald-900 font-extrabold' : 'text-slate-400 font-medium'
                  }`}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0.5 w-5 h-0.5 bg-emerald-700 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
