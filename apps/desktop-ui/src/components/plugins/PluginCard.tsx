import React from '../../react.js';
import { InstalledPluginState } from './types.js';

interface PluginCardProps {
  key?: string | number;
  plugin: InstalledPluginState;
  onToggle: (enabled: boolean) => void;
  onUninstall: () => void;
}

export const PluginCard: React.FC<PluginCardProps> = ({
  plugin,
  onToggle,
  onUninstall,
}) => {
  const { manifest, isEnabled, isSandboxed } = plugin;

  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 shadow-sm select-none">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h4 className="font-bold text-sm text-slate-100">{manifest.name}</h4>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              v{manifest.version}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-500/40 text-indigo-300">
              {manifest.runtime.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{manifest.description}</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onToggle(!isEnabled)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
              isEnabled
                ? 'bg-emerald-600/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/30'
                : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {isEnabled ? '● Enabled' : '○ Disabled'}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
        <div className="flex items-center space-x-2">
          <span className="text-amber-400">🛡️ {isSandboxed ? 'OS-Sandboxed' : 'In-Process'}</span>
          <span>•</span>
          <span>{manifest.tools.length} Tools Declared</span>
        </div>

        <button
          onClick={onUninstall}
          className="text-rose-400 hover:text-rose-300 transition text-[10px] underline"
        >
          Uninstall
        </button>
      </div>
    </div>
  );
};
