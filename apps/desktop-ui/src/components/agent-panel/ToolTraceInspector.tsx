import React, { useState } from '../../react.js';
import { LineageTrace } from '@gordon/shared-types';

interface ToolTraceInspectorProps {
  toolExecutions: LineageTrace['toolExecutions'];
}

export const ToolTraceInspector: React.FC<ToolTraceInspectorProps> = ({ toolExecutions }) => {
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);

  if (toolExecutions.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500 text-xs italic">
        No deterministic tool executions recorded yet.
      </div>
    );
  }

  const activeTool = toolExecutions.find(t => t.id === selectedToolId) || toolExecutions[toolExecutions.length - 1];

  return (
    <div className="p-3 border-t border-slate-800 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Tool Trace Inspector ({toolExecutions.length})
        </div>
      </div>

      {/* Tool invocation chips */}
      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto py-1">
        {toolExecutions.map(t => {
          const isSelected = t.id === activeTool?.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedToolId(t.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                isSelected
                  ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-semibold'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.toolName} ({t.durationMs}ms)
            </button>
          );
        })}
      </div>

      {/* Active tool details */}
      {activeTool && (
        <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs space-y-1.5 font-mono">
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1">
            <span className="text-sky-400 font-bold">{activeTool.toolName}</span>
            <span className="text-emerald-400">{activeTool.durationMs}ms</span>
          </div>

          <div className="text-[10px] text-slate-400">Lineage ID: {activeTool.id}</div>

          <div>
            <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Input Parameters:</div>
            <pre className="p-1.5 rounded bg-slate-900 text-[10px] text-slate-300 overflow-x-auto max-h-24">
              {activeTool.inputArgs}
            </pre>
          </div>

          <div>
            <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Logged Output:</div>
            <pre className="p-1.5 rounded bg-slate-900 text-[10px] text-emerald-300 overflow-x-auto max-h-28">
              {activeTool.rawOutput}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
