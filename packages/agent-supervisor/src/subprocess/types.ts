import { AgentConfig } from '@gordon/shared-types';

export interface SubprocessAgentOptions {
  agentConfig: AgentConfig;
  scriptPath: string;
  args?: string[];
  sessionId: string;
  taskId: string;
}

export interface SubprocessExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  exitCode?: number;
  durationMs: number;
}
