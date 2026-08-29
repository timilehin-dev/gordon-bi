import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { AgentConfig, AgentConfigSchema } from '@gordon/shared-types';
import { AgentConfigError } from './errors.js';

export class AgentConfigLoader {
  private configs: Map<string, AgentConfig> = new Map();

  public loadFromObject(data: unknown): AgentConfig {
    const parseResult = AgentConfigSchema.safeParse(data);
    if (!parseResult.success) {
      throw new AgentConfigError(
        `Invalid agent configuration: ${parseResult.error.message}`,
        'INVALID_AGENT_SCHEMA',
        parseResult.error.format()
      );
    }

    const config = parseResult.data;
    this.configs.set(config.id, config);
    return config;
  }

  public loadFromFile(filePath: string): AgentConfig {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      return this.loadFromObject(parsed);
    } catch (err: any) {
      throw new AgentConfigError(`Failed to load agent config from '${filePath}': ${err.message}`, 'FILE_LOAD_ERROR', err);
    }
  }

  public loadFromDirectory(dirPath: string): AgentConfig[] {
    try {
      const entries = readdirSync(dirPath);
      const loaded: AgentConfig[] = [];

      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        if (statSync(fullPath).isFile() && (entry.endsWith('.json') || entry.endsWith('.agent.json'))) {
          loaded.push(this.loadFromFile(fullPath));
        }
      }

      return loaded;
    } catch (err: any) {
      throw new AgentConfigError(`Failed to load agent configs from directory '${dirPath}': ${err.message}`, 'DIR_LOAD_ERROR', err);
    }
  }

  public getConfig(agentId: string): AgentConfig | undefined {
    return this.configs.get(agentId);
  }

  public listConfigs(): AgentConfig[] {
    return Array.from(this.configs.values());
  }
}
