import React from '../../react.js';
import { AppStore, ActiveView } from '../../state/app_store.js';

interface LeftNavProps {
  appStore: AppStore;
}

export const LeftNav: React.FC<LeftNavProps> = ({ appStore }) => {
  const currentView = appStore.getState().activeView;

  const navItems: Array<{ id: ActiveView; label: string; icon: string }> = [
    { id: 'report', label: 'Report', icon: '📊' },
    { id: 'data', label: 'Data Grid', icon: '▦' },
    { id: 'model', label: 'Semantic', icon: '☊' },
    { id: 'lineage', label: 'Lineage', icon: '🔍' },
    { id: 'settings', label: 'Settings', icon: '⚙' },
  ];

  return (
    <aside className="w-16 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-4 space-y-3 select-none z-10">
      {navItems.map(item => {
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => appStore.setActiveView(item.id)}
            title={item.label}
            className={`w-11 h-11 flex flex-col items-center justify-center rounded-lg transition ${
              isActive
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span className="text-[10px] font-medium tracking-tight mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </aside>
  );
};
