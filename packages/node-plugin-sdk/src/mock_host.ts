import { GordonPlugin } from './plugin.js';
import { PluginExecutionContext } from './types.js';

export interface MockHostOptions {
  mockTables?: Record<string, any[]>;
  mockTools?: Record<string, (params: any) => Promise<any>>;
}

export class MockPluginHost {
  private options: MockHostOptions;
  public logs: string[] = [];

  constructor(options: MockHostOptions = {}) {
    this.options = options;
  }

  public createExecutionContext(pluginId: string): PluginExecutionContext {
    return {
      pluginId,
      queryTable: async (sql: string) => {
        this.logs.push(`[MOCK QUERY]: ${sql}`);
        // Simple mock table extraction
        const match = sql.match(/FROM\s+["']?([a-zA-Z0-9_]+)["']?/i);
        const tableName = match ? match[1] : 'default';
        const rows = this.options.mockTables?.[tableName] || [];
        return { rows, rowCount: rows.length };
      },
      invokeHostTool: async (toolName: string, params: Record<string, any>) => {
        this.logs.push(`[MOCK TOOL INVOKE]: ${toolName}`);
        const handler = this.options.mockTools?.[toolName];
        if (!handler) {
          return { status: 'mock_success', toolName, params };
        }
        return handler(params);
      },
      log: (message: string) => {
        this.logs.push(`[PLUGIN LOG]: ${message}`);
      },
    };
  }

  public async runTool(plugin: GordonPlugin, toolName: string, params: any): Promise<any> {
    const context = this.createExecutionContext(plugin.manifest.id);
    return plugin.executeTool(toolName, params, context);
  }
}
