import React, { useState } from '../../react.js';
import { KeyVault } from '@gordon/core-engine';
import { ModelProvider } from '@gordon/shared-types';

interface ByokKeyManagerProps {
  keyVault: KeyVault;
}

export const ByokKeyManager: React.FC<ByokKeyManagerProps> = ({ keyVault }) => {
  const config = keyVault.exportConfig();
  const [provider, setProvider] = useState<ModelProvider>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    keyVault.setProviderCredentials({
      provider,
      apiKey: apiKey || undefined,
      baseUrl: baseUrl || undefined,
      isConfigured: true,
    });
    setSaveStatus(`Saved credentials for ${provider.toUpperCase()}`);
    setApiKey('');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const providersList: ModelProvider[] = ['anthropic', 'openai', 'ollama', 'custom_http'];

  return (
    <div className="flex-1 bg-slate-950 p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-lg font-bold text-slate-100">BYOK Key Management & Model Routing</h2>
        <div className="text-slate-400">
          Configure secure LLM providers and route specialized models to sub-agents.
        </div>
      </div>

      {/* Provider API Key Form */}
      <form onSubmit={handleSave} className="max-w-xl bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold text-sm text-sky-400">Add / Update Provider Credentials</h3>

        <div className="space-y-1">
          <label className="text-slate-400 font-medium">Model Provider</label>
          <select
            value={provider}
            onChange={(e: any) => setProvider(e.target.value as ModelProvider)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-sky-500"
          >
            {providersList.map(p => (
              <option key={p} value={p}>
                {p.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-slate-400 font-medium">API Key / Secret</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e: any) => setApiKey(e.target.value)}
            placeholder="sk-ant-... or sk-proj-..."
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200 font-mono focus:outline-none focus:border-sky-500"
          />
        </div>

        {provider === 'ollama' || provider === 'custom_http' ? (
          <div className="space-y-1">
            <label className="text-slate-400 font-medium">Custom Endpoint URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e: any) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:11434/v1"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200 font-mono focus:outline-none focus:border-sky-500"
            />
          </div>
        ) : null}

        <div className="flex items-center justify-between pt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded transition"
          >
            Save Key Securely
          </button>
          {saveStatus && <span className="text-emerald-400 font-medium">{saveStatus}</span>}
        </div>
      </form>

      {/* Configured Providers Overview */}
      <div className="max-w-xl bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-sm">
        <h3 className="font-semibold text-sm text-slate-200">Configured Providers</h3>
        <div className="grid grid-cols-2 gap-3">
          {providersList.map(p => {
            const isConf = config.providers[p]?.isConfigured;
            return (
              <div
                key={p}
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  isConf
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950/50 border-slate-800 text-slate-500'
                }`}
              >
                <span className="font-bold uppercase text-[11px]">{p}</span>
                <span className="text-[10px]">{isConf ? '● Active' : '○ Not configured'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
