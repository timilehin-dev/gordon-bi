import { PluginToolDefinition, PluginExecutionContext } from './types.js';
import { PluginManifest } from '@gordon/sandbox-runtime';

export abstract class GordonPlugin {
  public abstract readonly manifest: PluginManifest;
  private tools: Map<string, PluginToolDefinition> = new Map();

  protected registerTool<TParams = any, TResult = any>(tool: PluginToolDefinition<TParams, TResult>): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): PluginToolDefinition | undefined {
    return this.tools.get(name);
  }

  public listTools(): PluginToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public async executeTool(name: string, params: any, context: PluginExecutionContext): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool '${name}' is not registered in plugin '${this.manifest.name}'`);
    }
    return tool.execute(params, context);
  }
}
