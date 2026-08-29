import React from '../../react.js';
import { AppStore } from '../../state/app_store.js';

interface HeaderRibbonProps {
  appStore: AppStore;
  onIngestClick?: () => void;
  onExportClick?: () => void;
  onAnalyzeClick?: () => void;
}

export const HeaderRibbon: React.FC<HeaderRibbonProps> = ({
  appStore,
  onIngestClick,
  onExportClick,
  onAnalyzeClick,
}) => {
  const state = appStore.getState();

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-slate-100 select-none">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-xs text-white">
            G
          </div>
          <span className="font-semibold tracking-wide text-sm text-slate-100">GORDON BI</span>
        </div>

        <nav className="flex space-x-1 border-l border-slate-700 pl-4">
          <button
            onClick={onIngestClick}
            className="px-3 py-1 text-xs font-medium rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
          >
            + Ingest File
          </button>
          <button
            onClick={onAnalyzeClick}
            className="px-3 py-1 text-xs font-medium rounded hover:bg-slate-800 text-sky-400 hover:text-sky-300 transition"
          >
            ⚡ Auto-Analyze
          </button>
          <button
            onClick={onExportClick}
            className="px-3 py-1 text-xs font-medium rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
          >
            Export Report
          </button>
        </nav>
      </div>

      <div className="flex items-center space-x-3">
        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          {state.loadedTables.length} Table{state.loadedTables.length === 1 ? '' : 's'} Loaded
        </span>

        <button
          onClick={() => appStore.toggleAgentPanel()}
          className={`px-3 py-1 text-xs font-medium rounded border transition ${
            state.agentPanelOpen
              ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-200'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
          }`}
        >
          🤖 Agent Telemetry
        </button>
      </div>
    </header>
  );
};
