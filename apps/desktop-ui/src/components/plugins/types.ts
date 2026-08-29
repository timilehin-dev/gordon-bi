import { PluginManifest, PluginConsentSummary } from '@gordon/sandbox-runtime';

export interface InstalledPluginState {
  manifest: PluginManifest;
  consent: PluginConsentSummary;
  isEnabled: boolean;
  isSandboxed: boolean;
  installedAt: number;
}
