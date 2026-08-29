import React from '../../react.js';
import { LineageTrace, TaskRecord } from '@gordon/shared-types';

interface ProvenanceAuditCardProps {
  toolExecution?: LineageTrace['toolExecutions'][number] | null;
  task?: TaskRecord | null;
  onClose?: () => void;
}

export const ProvenanceAuditCard: React.FC<ProvenanceAuditCardProps> = ({
  toolExecution,
  task,
  onClose,
}) => {
  if (!toolExecution) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-xl w-full p-5 space-y-4 shadow-2xl text-xs font-mono">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-emerald-400 font-bold">🛡️ Lineage Provenance Stamp</span>
            <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px]">
              VERIFIED
            </span>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1 text-sm font-sans"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          <div className="text-slate-400">
            <strong>Tool Invoked:</strong> <span className="text-sky-300">{toolExecution.toolName}</span>
          </div>
          <div className="text-slate-400">
            <strong>Execution Lineage ID:</strong> <span className="text-slate-200">{toolExecution.id}</span>
          </div>
          <div className="text-slate-400">
            <strong>Execution Time:</strong> <span>{toolExecution.durationMs}ms</span>
          </div>
          {task && (
            <div className="text-slate-400">
              <strong>Parent DAG Task:</strong> <span className="text-indigo-300">{task.title}</span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="text-slate-400 font-semibold">Logged Deterministic Output:</div>
          <pre className="p-3 rounded bg-slate-950 border border-slate-800 text-emerald-300 text-[11px] overflow-auto max-h-48">
            {toolExecution.rawOutput}
          </pre>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-sans text-xs transition"
          >
            Close Audit View
          </button>
        </div>
      </div>
    </div>
  );
};
