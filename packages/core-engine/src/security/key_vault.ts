import { ModelProvider, ProviderCredentials, AgentModelRoute, ByokVaultConfig } from '@gordon/shared-types';
import { SecurityVaultError } from './errors.js';

export class KeyVault {
  private providers: Map<ModelProvider, ProviderCredentials> = new Map();
  private secretBuffers: Map<ModelProvider, Buffer> = new Map();
  private agentRoutes: Map<string, AgentModelRoute> = new Map();

  constructor() {
    this.initDefaultRoutes();
  }

  public setProviderCredentials(creds: ProviderCredentials): void {
    if (!creds.provider) {
      throw new SecurityVaultError('Provider identifier is required', 'INVALID_PROVIDER');
    }
    const existing = this.providers.get(creds.provider);
    const effectiveApiKey = creds.apiKey || existing?.apiKey;

    if (effectiveApiKey) {
      // Store in zeroable memory buffer
      const buf = Buffer.from(effectiveApiKey, 'utf-8');
      this.secretBuffers.set(creds.provider, buf);
    }

    this.providers.set(creds.provider, {
      ...existing,
      ...creds,
      apiKey: effectiveApiKey,
      isConfigured: Boolean(effectiveApiKey || creds.baseUrl || existing?.baseUrl),
    });
  }

  public getProviderCredentials(provider: ModelProvider): ProviderCredentials | undefined {
    return this.providers.get(provider);
  }

  public removeProviderCredentials(provider: ModelProvider): void {
    const buf = this.secretBuffers.get(provider);
    if (buf) {
      buf.fill(0);
      this.secretBuffers.delete(provider);
    }
    this.providers.delete(provider);
  }

  public setAgentRoute(route: AgentModelRoute): void {
    this.agentRoutes.set(route.agentId, { ...route });
  }

  public getAgentRoute(agentId: string): AgentModelRoute {
    const route = this.agentRoutes.get(agentId);
    if (route) return route;

    // Fallback default
    return {
      agentId,
      provider: 'anthropic',
      modelName: 'claude-3-5-haiku',
      temperature: 0.2,
      maxTokens: 4096,
    };
  }

  public clearMemory(): void {
    // 1. Physically zero-out allocated byte buffers
    this.secretBuffers.forEach((buf) => {
      buf.fill(0);
    });
    this.secretBuffers.clear();

    // 2. Clear object maps
    this.providers.clear();
    this.agentRoutes.clear();
    this.initDefaultRoutes();
  }

  public exportConfig(): ByokVaultConfig {
    const providersObj = {} as Record<ModelProvider, ProviderCredentials>;
    this.providers.forEach((v, k) => {
      providersObj[k] = { ...v, apiKey: v.apiKey ? '********' : undefined };
    });

    const routesObj = {} as Record<string, AgentModelRoute>;
    this.agentRoutes.forEach((v, k) => {
      routesObj[k] = { ...v };
    });

    return {
      providers: providersObj,
      agentRoutes: routesObj,
    };
  }

  private initDefaultRoutes(): void {
    this.setDefaultRoute('root_business_analyst', 'anthropic', 'claude-3-7-sonnet', 0.2);
    this.setDefaultRoute('critic_verifier_agent', 'anthropic', 'claude-3-7-sonnet', 0.0);
    this.setDefaultRoute('sql_agent', 'anthropic', 'claude-3-5-haiku', 0.0);
    this.setDefaultRoute('insight_generation_agent', 'anthropic', 'claude-3-7-sonnet', 0.3);
    this.setDefaultRoute('forecasting_agent', 'anthropic', 'claude-3-5-haiku', 0.1);
    this.setDefaultRoute('anomaly_detection_agent', 'anthropic', 'claude-3-5-haiku', 0.1);
  }

  private setDefaultRoute(agentId: string, provider: ModelProvider, modelName: string, temperature: number) {
    this.agentRoutes.set(agentId, {
      agentId,
      provider,
      modelName,
      temperature,
      maxTokens: 4096,
    });
  }
}
