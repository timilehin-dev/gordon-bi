import { MarketplacePluginEntry, MarketplaceInstallResult, MarketplaceCategory } from './types.js';
import { MarketplaceError } from './errors.js';
import { CURATED_MARKETPLACE_CATALOG, signPluginPayload } from './catalog.js';

export class MarketplaceManagerTool {
  private installedPlugins: Map<string, MarketplacePluginEntry> = new Map();

  public listAvailablePlugins(category?: MarketplaceCategory): MarketplacePluginEntry[] {
    if (!category) return [...CURATED_MARKETPLACE_CATALOG];
    return CURATED_MARKETPLACE_CATALOG.filter(p => p.category === category);
  }

  public searchPlugins(query: string): MarketplacePluginEntry[] {
    const q = query.toLowerCase();
    return CURATED_MARKETPLACE_CATALOG.filter(
      p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
    );
  }

  public verifyPluginSignature(entry: MarketplacePluginEntry): boolean {
    if (!entry.digitalSignature) return false;
    const computed = signPluginPayload(entry);
    return computed === entry.digitalSignature;
  }

  public installPlugin(pluginId: string): MarketplaceInstallResult {
    const entry = CURATED_MARKETPLACE_CATALOG.find(p => p.id === pluginId);
    if (!entry) {
      throw new MarketplaceError(`Plugin with ID '${pluginId}' not found in marketplace`, 'PLUGIN_NOT_FOUND');
    }

    // Cryptographic signature check
    if (!this.verifyPluginSignature(entry)) {
      throw new MarketplaceError(`Plugin '${pluginId}' failed cryptographic signature verification`, 'UNVERIFIED_SIGNATURE');
    }

    if (this.installedPlugins.has(pluginId)) {
      return {
        pluginId,
        name: entry.name,
        status: 'already_installed',
        installedAt: Date.now(),
      };
    }

    this.installedPlugins.set(pluginId, entry);

    return {
      pluginId,
      name: entry.name,
      status: 'installed',
      installedAt: Date.now(),
    };
  }

  public getInstalledPlugins(): MarketplacePluginEntry[] {
    return Array.from(this.installedPlugins.values());
  }

  public uninstallPlugin(pluginId: string): boolean {
    return this.installedPlugins.delete(pluginId);
  }
}
