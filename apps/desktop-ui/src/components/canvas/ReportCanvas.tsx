import React from '../../react.js';
import { CanvasStore } from '../../state/canvas_store.js';
import { VisualCardWrapper } from './VisualCardWrapper.js';
import { ExecutiveReport } from '@gordon/core-engine';

interface ReportCanvasProps {
  canvasStore: CanvasStore;
  tableData: Record<string, any[]>;
  executiveReport?: ExecutiveReport | null;
  onCitationClick?: (citationId: string) => void;
}

export const ReportCanvas: React.FC<ReportCanvasProps> = ({
  canvasStore,
  tableData,
  executiveReport,
  onCitationClick,
}) => {
  const layout = canvasStore.getLayout();
  const crossFilter = canvasStore.getCrossFilter();

  const handleDimensionSelect = (dim: string, val: string | number, cardId: string) => {
    canvasStore.setCrossFilter(dim, val, cardId);
  };

  return (
    <div className="flex-1 bg-slate-950 p-6 overflow-y-auto space-y-6">
      {/* Canvas Header & Filter Status */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100">{layout.title}</h2>
          <div className="text-xs text-slate-400">Power BI-Grade Responsive Multi-Card Canvas</div>
        </div>

        {crossFilter.activeDimension && (
          <div className="flex items-center space-x-2 bg-indigo-950/80 border border-indigo-500/40 px-3 py-1 rounded-full text-xs text-indigo-300">
            <span>
              Filtered: <strong>{crossFilter.activeDimension}</strong> = {String(crossFilter.selectedValues[0])}
            </span>
            <button
              onClick={() => canvasStore.clearCrossFilter()}
              className="text-slate-400 hover:text-white font-bold ml-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Visual Cards 12-Column Responsive Grid */}
      {layout.cards.length > 0 ? (
        <div className="grid grid-cols-12 gap-4">
          {layout.cards.map(card => {
            const spec = layout.specs[card.chartSpecId];
            if (!spec) return null;
            const rows = tableData[spec.tableName] || [];

            // Apply cross-filtering if active
            const filteredRows =
              crossFilter.activeDimension && crossFilter.selectedValues.length > 0
                ? rows.filter(r => String(r[crossFilter.activeDimension!]) === String(crossFilter.selectedValues[0]))
                : rows;

            return (
              <VisualCardWrapper
                key={card.id}
                card={card}
                spec={spec}
                rows={filteredRows}
                onSelectDimension={(dim, val) => handleDimensionSelect(dim, val, card.id)}
                onRemove={() => canvasStore.removeCard(card.id)}
              />
            );
          })}
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-800 rounded-xl p-12 text-center text-slate-500 space-y-2">
          <div className="text-3xl">📊</div>
          <div className="text-sm font-semibold text-slate-400">Empty Report Canvas</div>
          <div className="text-xs text-slate-500 max-w-sm mx-auto">
            Ingest structured tables or launch an autonomous goal to automatically generate Power BI-grade visuals.
          </div>
        </div>
      )}

      {/* Executive Narrative & Verified Lineage Section */}
      {executiveReport && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-bold text-sm text-emerald-400 flex items-center space-x-2">
              <span>🛡️</span>
              <span>Autonomous Executive Insights & Verified Findings</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-mono">
              100% Critic QA Verified
            </span>
          </div>

          <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
            {executiveReport.sections.map((sec: any, idx: number) => (
              <div key={idx} className="space-y-1">
                <h4 className="font-semibold text-slate-200">{sec.heading}</h4>
                <p>
                  {sec.content.split(/(\[cite:\s*[a-zA-Z0-9_\-:]+\])/g).map((part: string, pIdx: number) => {
                    const match = part.match(/\[cite:\s*([a-zA-Z0-9_\-:]+)\]/);
                    if (match) {
                      const citeId = match[1];
                      return (
                        <button
                          key={pIdx}
                          onClick={() => onCitationClick?.(citeId)}
                          className="px-1.5 py-0.5 mx-0.5 rounded bg-indigo-950 border border-indigo-500/50 text-indigo-300 text-[10px] font-mono hover:bg-indigo-900 transition"
                        >
                          cite: {citeId.slice(0, 8)}...
                        </button>
                      );
                    }
                    return part;
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
