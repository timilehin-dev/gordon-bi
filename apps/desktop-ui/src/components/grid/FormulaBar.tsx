import React, { useState } from '../../react.js';
import { GridStore } from '../../state/grid_store.js';

interface FormulaBarProps {
  gridStore: GridStore;
  selectedCell?: { row: number; col: string };
}

export const FormulaBar: React.FC<FormulaBarProps> = ({ gridStore, selectedCell }) => {
  const [formulaText, setFormulaText] = useState('');

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCell || !formulaText) return;
    gridStore.updateCell(selectedCell.row, selectedCell.col, formulaText, formulaText);
  };

  const handlePromote = () => {
    if (!formulaText) return;
    const name = `Calc_${selectedCell?.col || 'Metric'}`;
    gridStore.promoteToTransformationStep(name, formulaText);
  };

  return (
    <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-xs">
      <div className="font-mono text-slate-400 px-2 py-0.5 bg-slate-950 rounded border border-slate-800 min-w-[60px] text-center">
        {selectedCell ? `${selectedCell.col}${selectedCell.row + 1}` : 'A1'}
      </div>

      <div className="text-slate-500 font-serif italic text-sm">fx</div>

      <form onSubmit={handleApply} className="flex-1 flex space-x-2">
        <input
          type="text"
          value={formulaText}
          onChange={(e: any) => setFormulaText(e.target.value)}
          placeholder="Enter formula, e.g. =[revenue] - [cost] or =SUM([sales])"
          className="flex-1 px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
        />

        <button
          type="submit"
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition"
        >
          Apply
        </button>

        <button
          type="button"
          onClick={handlePromote}
          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition"
        >
          Promote to Step ➔
        </button>
      </form>
    </div>
  );
};
