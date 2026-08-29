import React, { useState } from '../../react.js';
import { GridStore } from '../../state/grid_store.js';
import { FormulaBar } from './FormulaBar.js';

interface SpreadsheetGridProps {
  gridStore: GridStore;
}

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({ gridStore }) => {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: string } | undefined>(undefined);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const rows = gridStore.getRows();
  const columns = gridStore.getColumns();
  const transformations = gridStore.getTransformations();

  const handleCellClick = (rowIdx: number, colName: string) => {
    setSelectedCell({ row: rowIdx, col: colName });
  };

  const handleDoubleClick = (rowIdx: number, colName: string, currentVal: any) => {
    setEditingCell({ row: rowIdx, col: colName });
    setEditValue(String(currentVal ?? ''));
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCell) {
      gridStore.updateCell(editingCell.row, editingCell.col, editValue);
      setEditingCell(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      <FormulaBar gridStore={gridStore} selectedCell={selectedCell} />

      {/* Grid Container */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs select-none">
          <thead>
            <tr className="bg-slate-900 sticky top-0 border-b border-slate-800 text-slate-400 font-mono">
              <th className="w-12 px-2 py-1.5 border-r border-slate-800 text-center text-slate-600 bg-slate-900/90">#</th>
              {columns.map(col => (
                <th key={col} className="px-3 py-1.5 border-r border-slate-800 text-left font-semibold text-slate-300">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                <td className="px-2 py-1 border-r border-slate-800 text-center font-mono text-[10px] text-slate-600 bg-slate-900/30">
                  {rowIdx + 1}
                </td>
                {columns.map(col => {
                  const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === col;
                  const isEditing = editingCell?.row === rowIdx && editingCell?.col === col;
                  const val = row[col];

                  return (
                    <td
                      key={col}
                      onClick={() => handleCellClick(rowIdx, col)}
                      onDoubleClick={() => handleDoubleClick(rowIdx, col, val)}
                      className={`px-3 py-1 border-r border-slate-800/60 font-mono cursor-cell transition ${
                        isSelected ? 'bg-sky-500/20 ring-1 ring-sky-500' : ''
                      }`}
                    >
                      {isEditing ? (
                        <form onSubmit={handleEditSubmit}>
                          <input
                            type="text"
                            autoFocus
                            value={editValue}
                            onChange={(e: any) => setEditValue(e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            className="w-full bg-slate-900 text-sky-200 outline-none px-1 rounded"
                          />
                        </form>
                      ) : (
                        <span>{val === null || val === undefined ? <em className="text-slate-600">null</em> : String(val)}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Transformation Pipeline Steps Footer */}
      {transformations.length > 0 && (
        <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 text-xs flex items-center space-x-3">
          <span className="text-[11px] font-semibold text-slate-400">Transformation Steps:</span>
          <div className="flex space-x-2">
            {transformations.map(t => (
              <span key={t.id} className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-[10px] font-mono">
                ⚡ {t.name} ({t.expression})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
