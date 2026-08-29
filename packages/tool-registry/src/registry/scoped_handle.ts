import {
  ToolDefinition,
  ToolExecutionContext,
  ToolResult,
  ToolCapability,
} from '@gordon/shared-types';
import { ToolPermissionDeniedError } from './errors.js';
import { ToolRegistry } from './registry.js';

export class ScopedToolHandle {
  private registry: ToolRegistry;
  private agentId: string;
  private allowedTools: Set<string>;
  private allowedCapabilities: Set<ToolCapability>;

  constructor(
    registry: ToolRegistry,
    agentId: string,
    allowedTools: string[],
    allowedCapabilities: ToolCapability[]
  ) {
    this.registry = registry;
    this.agentId = agentId;
    this.allowedTools = new Set(allowedTools);
    this.allowedCapabilities = new Set(allowedCapabilities);
  }

  public getAgentId(): string {
    return this.agentId;
  }

  public isAuthorized(toolName: string): boolean {
    if (this.allowedTools.has('*')) return true;
    if (this.allowedTools.has(toolName)) return true;

    const tool = this.registry.getTool(toolName);
    if (!tool) return false;

    // Check if agent has all capabilities required by tool
    return tool.capabilities.some(c => this.allowedCapabilities.has(c));
  }

  public async invoke<TInput = Record<string, unknown>, TOutput = unknown>(
    toolName: string,
    input: TInput,
    context: Omit<ToolExecutionContext, 'agentId'>
  ): Promise<ToolResult<TOutput>> {
    if (!this.isAuthorized(toolName)) {
      throw new ToolPermissionDeniedError(toolName, this.agentId);
    }

    const fullContext: ToolExecutionContext = {
      ...context,
      agentId: this.agentId,
    };

    return this.registry.invoke<TInput, TOutput>(toolName, input, fullContext);
  }

  public listAvailableTools(): ToolDefinition[] {
    const allTools = this.registry.listTools();
    return allTools.filter(t => this.isAuthorized(t.name));
  }
}
