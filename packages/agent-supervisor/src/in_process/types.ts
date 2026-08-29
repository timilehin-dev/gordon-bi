import { AgentConfig, ToolExecutionContext } from '@gordon/shared-types';
import { ScopedToolHandle } from '@gordon/tool-registry';

export interface InProcessAgentTask<TInput = unknown, TOutput = unknown> {
  taskId: string;
  sessionId: string;
  agentConfig: AgentConfig;
  scopedHandle: ScopedToolHandle;
  input: TInput;
  handler: (input: TInput, scopedHandle: ScopedToolHandle, context: ToolExecutionContext) => Promise<TOutput>;
}

export interface InProcessExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  durationMs: number;
}
