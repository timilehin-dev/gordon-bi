import { McpServerConfig, McpToolDescriptor } from '@gordon/shared-types';

export interface RunningMcpServer {
  config: McpServerConfig;
  pid: number;
  tools: McpToolDescriptor[];
  status: 'running' | 'stopped' | 'errored';
  lastHealthCheck: number;
}

export interface McpExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  durationMs: number;
}
