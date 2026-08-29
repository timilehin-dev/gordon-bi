import React from '../../react.js';
import { ChartSpec, VisualCardLayout } from '@gordon/shared-types';
import { EChartsGenerator } from '@gordon/core-engine';

interface VisualCardWrapperProps {
  key?: string | number;
  card: VisualCardLayout;
  spec: ChartSpec;
  rows: any[];
  onSelectDimension?: (dimension: string, value: string | number) => void;
  onRemove?: () => void;
}

export const VisualCardWrapper: React.FC<VisualCardWrapperProps> = ({
  card,
  spec,
  rows,
  onSelectDimension,
  onRemove,
}) => {
  const option = EChartsGenerator.generateOption(spec, rows);

  return (
    <div
      className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col shadow-sm select-none"
      style={{
        gridColumn: `span ${card.width}`,
        minHeight: `${card.height * 60}px`,
      }}
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div>
          <h4 className="font-semibold text-xs text-slate-200">{spec.title}</h4>
          <div className="text-[10px] text-slate-400 capitalize">
            {spec.chartType.replace('_', ' ')} • {spec.tableName}
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={onRemove}
            className="text-slate-500 hover:text-rose-400 p-1 text-xs transition"
            title="Remove Visual"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Visual Canvas Render Body */}
      <div className="flex-1 flex flex-col justify-center items-center p-2 bg-slate-950/60 rounded border border-slate-800/40">
        {spec.chartType === 'kpi_card' ? (
          <div className="text-center py-4">
            <div className="text-2xl font-bold text-sky-400 font-mono tracking-tight">
              {option.title?.subtext || '$0'}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">{spec.title}</div>
          </div>
        ) : (
          <div className="w-full text-center py-2 space-y-2">
            <div className="text-xs font-mono text-slate-300">
              Series: <span className="text-sky-400">{option.series[0]?.name || spec.title}</span> ({rows.length} rows)
            </div>

            {/* Quick interactive dimension chips for cross-filtering */}
            {spec.encoding.xField && (
              <div className="flex flex-wrap gap-1 justify-center max-h-20 overflow-y-auto">
                {rows.slice(0, 8).map((r, i) => {
                  const val = r[spec.encoding.xField!];
                  return (
                    <button
                      key={i}
                      onClick={() => onSelectDimension?.(spec.encoding.xField!, val)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-slate-700 text-[10px] transition"
                    >
                      {String(val)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
