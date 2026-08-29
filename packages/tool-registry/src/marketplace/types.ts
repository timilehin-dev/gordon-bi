export type MarketplaceCategory = 'crm' | 'billing' | 'ecommerce' | 'analytics' | 'project_management' | 'erp';

export interface MarketplacePluginEntry {
  id: string;
  name: string;
  version: string;
  category: MarketplaceCategory;
  description: string;
  author: string;
  isOfficial: boolean;
  signatureVerified: boolean;
  digitalSignature?: string;
  requiredScopes: string[];
  targetTable: string;
  icon: string;
}

export interface MarketplaceInstallResult {
  pluginId: string;
  name: string;
  status: 'installed' | 'already_installed' | 'failed';
  installedAt: number;
}
