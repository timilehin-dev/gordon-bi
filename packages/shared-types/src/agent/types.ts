import { ToolCapability } from '../tool/types.js';

export type AgentExecutionMode = 'in_process' | 'supervised_subprocess';

export interface AgentResourceLimits {
  maxMemoryMb: number;
  timeoutMs: number;
  cpuQuotaPercent?: number;
  maxRestarts?: number;
}

export interface AgentConfig {
  id: string;
  name: string;
  version: string;
  role: string;
  description: string;
  executionMode: AgentExecutionMode;
  allowedCapabilities: ToolCapability[];
  allowedTools: string[];
  systemPrompt: string;
  resourceLimits: AgentResourceLimits;
}
