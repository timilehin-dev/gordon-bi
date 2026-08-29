import React, { useState, useEffect } from '../../react.js';
import { LineageTrace } from '@gordon/shared-types';
import { ProvenanceAuditCard } from './ProvenanceAuditCard.js';

interface LineageExplorerProps {
  trace?: LineageTrace | null;
  selectedLineageId?: string | null;
  onClearSelectedLineageId?: () => void;
}

export const LineageExplorer: React.FC<LineageExplorerProps> = ({
  trace,
  selectedLineageId,
  onClearSelectedLineageId,
}) => {
  const [selectedTool, setSelectedTool] = useState<LineageTrace['toolExecutions'][number] | null>(null);

  useEffect(() => {
    if (selectedLineageId && trace) {
      const match = trace.toolExecutions.find(t => t.id === selectedLineageId);
      if (match) {
        setSelectedTool(match);
      }
    }
  }, [selectedLineageId, trace]);

  const handleCloseModal = () => {
    setSelectedTool(null);
    onClearSelectedLineageId?.();
  };

  if (!trace || trace.toolExecutions.length === 0) {
    return (
      <div className="flex-1 bg-slate-950 p-8 flex flex-col items-center justify-center text-slate-500 text-xs">
        <div className="text-3xl mb-2">🔍</div>
        <div className="font-semibold text-slate-400">Zero Execution Lineage</div>
        <p className="mt-1">Run an ingestion pipeline or autonomous goal to inspect end-to-end data provenance.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-950 p-6 overflow-y-auto space-y-6">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-lg font-bold text-slate-100">End-to-End Lineage & Provenance Graph</h2>
        <div className="text-xs text-slate-400">
          Session ID: <span className="font-mono text-sky-400">{trace.rootSession.id}</span> | Total Tools Executed:{' '}
          <span className="font-mono text-emerald-400">{trace.toolExecutions.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trace.toolExecutions.map(tool => {
          const parentTask = trace.tasks.find(t => t.id === tool.id || trace.edges.some(e => e.sourceId === tool.id && e.targetId === t.id));
          const isTarget = tool.id === selectedLineageId;

          return (
            <div
              key={tool.id}
              onClick={() => setSelectedTool(tool)}
              className={`p-4 bg-slate-900 border rounded-xl cursor-pointer transition space-y-2 select-none shadow-sm ${
                isTarget
                  ? 'border-indigo-500 ring-2 ring-indigo-500/40 bg-indigo-950/30'
                  : 'border-slate-800 hover:border-sky-500/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-sky-300">{tool.toolName}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {tool.durationMs}ms
                </span>
              </div>

              <div className="text-[10px] text-slate-500 font-mono">ID: {tool.id.slice(0, 16)}...</div>

              {parentTask && (
                <div className="text-xs text-indigo-300 font-medium">Task: {parentTask.title}</div>
              )}

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span className="text-emerald-400">● 100% Deterministic</span>
                <span className="text-sky-400 underline">Inspect Trace ➔</span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedTool && (
        <ProvenanceAuditCard
          toolExecution={selectedTool}
          task={trace.tasks.find(t => t.id === selectedTool.id)}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};
