import React from '../../react.js';
import { PluginConsentSummary } from '@gordon/sandbox-runtime';

interface PluginConsentCardProps {
  consent: PluginConsentSummary;
  onApprove: () => void;
  onReject: () => void;
}

export const PluginConsentCard: React.FC<PluginConsentCardProps> = ({
  consent,
  onApprove,
  onReject,
}) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <span>🛡️</span>
              <span>Install Community Plugin</span>
            </h3>
            <div className="text-xs text-slate-400 mt-0.5">
              Plugin: <strong className="text-sky-300">{consent.pluginName}</strong> ({consent.runtime.toUpperCase()})
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[10px] font-mono">
            SANDBOXED (UNTRUSTED)
          </span>
        </div>

        <div className="space-y-3 text-xs">
          <p className="text-slate-300">
            This third-party plugin requests the following system capabilities under the OS-isolated sandbox:
          </p>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {consent.plainEnglishPermissions.map((perm: any, idx: number) => {
              const badgeColor =
                perm.riskLevel === 'high'
                  ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                  : perm.riskLevel === 'medium'
                  ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-500/40';

              return (
                <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{perm.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${badgeColor}`}>
                      {perm.riskLevel.toUpperCase()} RISK
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">{perm.description}</div>
                </div>
              );
            })}
          </div>

          <div className="p-2.5 rounded bg-sky-950/40 border border-sky-500/30 text-[11px] text-sky-300">
            🔒 All plugin file/network I/O is strictly mediated via JSON-RPC. Direct OS kernel access is blocked by default.
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
          <button
            onClick={onReject}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
          >
            Deny & Cancel
          </button>
          <button
            onClick={onApprove}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition shadow-lg shadow-emerald-900/20"
          >
            Grant & Install Plugin
          </button>
        </div>
      </div>
    </div>
  );
};
