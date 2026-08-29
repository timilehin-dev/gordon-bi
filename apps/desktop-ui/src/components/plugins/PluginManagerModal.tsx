import React, { useState } from '../../react.js';
import { InstalledPluginState } from './types.js';
import { PluginCard } from './PluginCard.js';
import { PluginConsentCard } from './PluginConsentCard.js';
import { PluginManifest, PluginManifestValidator } from '@gordon/sandbox-runtime';

interface PluginManagerModalProps {
  plugins: InstalledPluginState[];
  onInstallPlugin: (manifest: PluginManifest) => void;
  onTogglePlugin: (pluginId: string, enabled: boolean) => void;
  onUninstallPlugin: (pluginId: string) => void;
  onClose: () => void;
}

export const PluginManagerModal: React.FC<PluginManagerModalProps> = ({
  plugins,
  onInstallPlugin,
  onTogglePlugin,
  onUninstallPlugin,
  onClose,
}) => {
  const [pendingManifest, setPendingManifest] = useState<PluginManifest | null>(null);

  const sampleCommunityManifest: PluginManifest = {
    id: 'community_monte_carlo',
    name: 'Monte Carlo Financial Risk Simulator',
    version: '1.0.0',
    description: 'Runs 10,000 statistical iterations over revenue forecasts to assess VaR and tail-risk distribution.',
    runtime: 'python',
    entryPoint: 'risk_sim.py',
    author: { name: 'Quant Community Labs' },
    permissions: [
      { category: 'query', scope: 'table:*', description: 'Read tabular dataset rows for variance inputs', required: true },
      { category: 'tool_call', scope: 'ts_forecast_multimodel', description: 'Fetch baseline projection array', required: true },
    ],
    tools: [
      {
        name: 'monte_carlo_var_sim',
        displayName: 'Monte Carlo Value at Risk',
        description: 'Simulates financial paths and returns VaR 95% and VaR 99% metrics',
      },
    ],
    isVerified: true,
  };

  const handleStartInstall = () => {
    try {
      const validated = PluginManifestValidator.validate(sampleCommunityManifest);
      setPendingManifest(validated);
    } catch (err: any) {
      alert(`Manifest error: ${err.message}`);
    }
  };

  const handleConsentApprove = () => {
    if (pendingManifest) {
      onInstallPlugin(pendingManifest);
      setPendingManifest(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-40 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
              <span>🧩</span>
              <span>Community Agent & Tool Plugin Manager</span>
            </h2>
            <p className="text-xs text-slate-400">
              Extend Gordon with open-source Python and Node.js analytical plugins under strict OS sandboxing.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1 text-sm font-sans"
          >
            ✕
          </button>
        </div>

        {/* Plugin List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {plugins.length > 0 ? (
            plugins.map(p => (
              <PluginCard
                key={p.manifest.id}
                plugin={p}
                onToggle={en => onTogglePlugin(p.manifest.id, en)}
                onUninstall={() => onUninstallPlugin(p.manifest.id)}
              />
            ))
          ) : (
            <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-500 space-y-2">
              <div className="text-2xl">📦</div>
              <div className="text-sm font-semibold text-slate-400">No Community Plugins Installed</div>
              <div className="text-xs text-slate-500">
                Install verified community tools or write your own with the Gordon Plugin SDK.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={handleStartInstall}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition shadow-md flex items-center space-x-1.5"
          >
            <span>+</span>
            <span>Install Sample Plugin Package</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
          >
            Close
          </button>
        </div>
      </div>

      {pendingManifest && (
        <PluginConsentCard
          consent={PluginManifestValidator.generateConsentSummary(pendingManifest)}
          onApprove={handleConsentApprove}
          onReject={() => setPendingManifest(null)}
        />
      )}
    </div>
  );
};
