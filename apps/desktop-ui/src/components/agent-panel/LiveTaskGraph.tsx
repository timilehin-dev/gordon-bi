import React from '../../react.js';
import { TaskRecord } from '@gordon/shared-types';

interface LiveTaskGraphProps {
  tasks: TaskRecord[];
  activeTaskId?: string;
  onTaskSelect?: (taskId: string) => void;
}

export const LiveTaskGraph: React.FC<LiveTaskGraphProps> = ({
  tasks,
  activeTaskId,
  onTaskSelect,
}) => {
  if (tasks.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500 text-xs italic">
        No active execution graph. Launch a business goal to trigger autonomous multi-agent planning.
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
      <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
        Autonomous Multi-Agent DAG
      </div>
      <div className="space-y-1.5">
        {tasks.map((task, idx) => {
          const isSelected = task.id === activeTaskId;
          const statusColors: Record<string, string> = {
            running: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse',
            completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
            failed: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
            pending: 'bg-slate-800 text-slate-400 border-slate-700',
          };

          return (
            <div
              key={task.id}
              onClick={() => onTaskSelect?.(task.id)}
              className={`p-2 rounded border text-xs cursor-pointer transition flex items-center justify-between ${
                isSelected
                  ? 'bg-indigo-950/60 border-indigo-500/80 shadow-sm'
                  : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                <div>
                  <div className="font-medium text-slate-200">{task.title}</div>
                  <div className="text-[10px] text-slate-400">Agent: {task.assignedAgentId || 'Orchestrator'}</div>
                </div>
              </div>

              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize ${
                  statusColors[task.status] || statusColors.pending
                }`}
              >
                {task.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
