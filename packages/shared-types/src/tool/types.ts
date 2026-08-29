/**
 * Tool / Skill Definition and Execution Types
 */

export type ToolCapability =
  | 'data:read'
  | 'data:write'
  | 'data:profile'
  | 'stats:compute'
  | 'ml:forecast'
  | 'ml:anomaly'
  | 'sql:query'
  | 'lineage:read'
  | 'report:assemble'
  | 'orchestration:manage'
  | 'system:exec';

export interface ToolParameterSchema {
  type: string;
  description: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface ToolDefinition<TInput = Record<string, unknown>, TOutput = unknown> {
  name: string;
  description: string;
  version: string;
  capabilities: ToolCapability[];
  inputSchema: ToolParameterSchema;
  outputSchema?: ToolParameterSchema;
  isDeterministic: boolean;
  execute: (input: TInput, context: ToolExecutionContext) => Promise<ToolResult<TOutput>>;
}

export interface ToolExecutionContext {
  sessionId: string;
  taskId: string;
  agentId: string;
  parentLineageId?: string;
  invokedAt: number;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ToolError;
  durationMs: number;
  metadata?: Record<string, unknown>;
}

export interface ToolError {
  code: string;
  message: string;
  details?: unknown;
  stack?: string;
}

export interface ToolExecutionRecord {
  id: string;
  sessionId: string;
  taskId: string;
  agentId: string;
  toolName: string;
  inputArgs: string;
  rawOutput: string;
  success: boolean;
  durationMs: number;
  tokensUsed: number;
  parentLineageId?: string;
  createdAt: number;
}
