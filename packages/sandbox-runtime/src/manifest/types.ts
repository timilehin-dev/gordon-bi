export type PluginRuntimeType = 'python' | 'node';

export interface PluginPermissionDeclaration {
  category: 'fs_read' | 'fs_write' | 'network' | 'tool_call' | 'query';
  scope: string;
  description: string;
  required: boolean;
}

export interface PluginToolDeclaration {
  name: string;
  displayName: string;
  description: string;
  parametersSchema?: Record<string, any>;
}

export interface PluginAuthor {
  name: string;
  email?: string;
  url?: string;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  runtime: PluginRuntimeType;
  entryPoint: string;
  author: PluginAuthor;
  permissions: PluginPermissionDeclaration[];
  tools: PluginToolDeclaration[];
  isVerified?: boolean;
  homepage?: string;
}

export interface PluginConsentSummary {
  pluginId: string;
  pluginName: string;
  runtime: PluginRuntimeType;
  plainEnglishPermissions: Array<{
    title: string;
    description: string;
    riskLevel: 'low' | 'medium' | 'high';
  }>;
}
