import React, { useState } from '../../react.js';
import { TaskRecord, LineageTrace } from '@gordon/shared-types';
import { LiveTaskGraph } from './LiveTaskGraph.js';
import { ToolTraceInspector } from './ToolTraceInspector.js';

interface DockableAgentPanelProps {
  tasks: TaskRecord[];
  toolExecutions: LineageTrace['toolExecutions'];
  onExecuteGoal: (goal: string) => Promise<void>;
  isLoading?: boolean;
}

export const DockableAgentPanel: React.FC<DockableAgentPanelProps> = ({
  tasks,
  toolExecutions,
  onExecuteGoal,
  isLoading = false,
}) => {
  const [goalInput, setGoalInput] = useState('');
  const [activeTab, setActiveTab] = useState<'dag' | 'trace'>('dag');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalInput.trim() || isLoading) return;
    const g = goalInput;
    setGoalInput('');
    await onExecuteGoal(g);
  };

  return (
    <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full select-none">
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold text-xs text-slate-100 tracking-wide">AGENT SUPERVISOR</span>
        </div>

        <div className="flex space-x-1 bg-slate-950 p-0.5 rounded border border-slate-800">
          <button
            onClick={() => setActiveTab('dag')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
              activeTab === 'dag' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            DAG Graph
          </button>
          <button
            onClick={() => setActiveTab('trace')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
              activeTab === 'trace' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tool Trace
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'dag' ? (
          <LiveTaskGraph tasks={tasks} />
        ) : (
          <ToolTraceInspector toolExecutions={toolExecutions} />
        )}
      </div>

      {/* Goal Input Bar */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-950/80">
        <div className="text-[10px] font-semibold text-slate-400 mb-1">Autonomous Goal Prompt</div>
        <div className="flex space-x-1.5">
          <input
            type="text"
            value={goalInput}
            onChange={(e: any) => setGoalInput(e.target.value)}
            disabled={isLoading}
            placeholder="e.g. Forecast Q4 revenue and flag outliers..."
            className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none focus:border-sky-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !goalInput.trim()}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium text-xs rounded transition flex items-center justify-center"
          >
            {isLoading ? '...' : '▶'}
          </button>
        </div>
      </form>
    </aside>
  );
};
