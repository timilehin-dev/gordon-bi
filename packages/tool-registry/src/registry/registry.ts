import {
  ToolDefinition,
  ToolExecutionContext,
  ToolResult,
  ToolCapability,
} from '@gordon/shared-types';
import { LineageStore } from '@gordon/data-substrate';
import { ToolRegistryError } from './errors.js';
import { ToolContractValidator } from '../contracts/validator.js';
import { ScopedToolHandle } from './scoped_handle.js';

export class ToolRegistry {
  private tools: Map<string, ToolDefinition<any, any>> = new Map();
  private lineageStore?: LineageStore;

  constructor(lineageStore?: LineageStore) {
    this.lineageStore = lineageStore;
  }

  public register<TInput, TOutput>(tool: ToolDefinition<TInput, TOutput>): void {
    if (this.tools.has(tool.name)) {
      throw new ToolRegistryError(`Tool '${tool.name}' is already registered`, 'DUPLICATE_TOOL_REGISTRATION');
    }
    this.tools.set(tool.name, tool);
  }

  public unregister(toolName: string): boolean {
    return this.tools.delete(toolName);
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public listTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public createScopedHandle(
    agentId: string,
    allowedTools: string[],
    allowedCapabilities: ToolCapability[]
  ): ScopedToolHandle {
    return new ScopedToolHandle(this, agentId, allowedTools, allowedCapabilities);
  }

  public async invoke<TInput = Record<string, unknown>, TOutput = unknown>(
    toolName: string,
    input: TInput,
    context: ToolExecutionContext
  ): Promise<ToolResult<TOutput>> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      const errResult: ToolResult<TOutput> = {
        success: false,
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Tool '${toolName}' not found in registry`,
        },
        durationMs: 0,
      };

      if (this.lineageStore) {
        this.lineageStore.recordToolExecution({
          sessionId: context.sessionId,
          taskId: context.taskId,
          agentId: context.agentId,
          toolName,
          inputArgs: input as any,
          rawOutput: errResult,
          success: false,
          durationMs: 0,
          parentLineageId: context.parentLineageId,
        });
      }

      return errResult;
    }

    const startTime = Date.now();

    try {
      // Validate input against schema
      ToolContractValidator.validateInput(tool.inputSchema, input);

      // Execute tool
      const result = await tool.execute(input, context);
      const durationMs = Date.now() - startTime;
      const finalResult: ToolResult<TOutput> = {
        ...result,
        durationMs: result.durationMs || durationMs,
      };

      // Record to Lineage Store if available
      if (this.lineageStore) {
        this.lineageStore.recordToolExecution({
          sessionId: context.sessionId,
          taskId: context.taskId,
          agentId: context.agentId,
          toolName,
          inputArgs: input as any,
          rawOutput: finalResult.data,
          success: finalResult.success,
          durationMs: finalResult.durationMs,
          parentLineageId: context.parentLineageId,
        });
      }

      return finalResult;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorResult: ToolResult<TOutput> = {
        success: false,
        error: {
          code: err.code || 'TOOL_EXECUTION_EXCEPTION',
          message: err.message || String(err),
          stack: err.stack,
        },
        durationMs,
      };

      if (this.lineageStore) {
        this.lineageStore.recordToolExecution({
          sessionId: context.sessionId,
          taskId: context.taskId,
          agentId: context.agentId,
          toolName,
          inputArgs: input as any,
          rawOutput: errorResult,
          success: false,
          durationMs,
          parentLineageId: context.parentLineageId,
        });
      }

      return errorResult;
    }
  }
}
