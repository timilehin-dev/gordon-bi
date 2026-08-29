export type ModelProvider = 'anthropic' | 'openai' | 'ollama' | 'custom_http';

export interface ProviderCredentials {
  provider: ModelProvider;
  apiKey?: string;
  baseUrl?: string;
  organizationId?: string;
  isConfigured: boolean;
}

export interface AgentModelRoute {
  agentId: string;
  provider: ModelProvider;
  modelName: string;
  temperature: number;
  maxTokens: number;
}

export interface ByokVaultConfig {
  providers: Record<ModelProvider, ProviderCredentials>;
  agentRoutes: Record<string, AgentModelRoute>;
}
