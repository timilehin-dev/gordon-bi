import {
  SessionRecord,
  TaskRecord,
  AgentRunRecord,
  ToolExecutionRecord,
  LineageEdge,
  LineageTrace,
} from '@gordon/shared-types';

export interface LineageStoreConfig {
  dbPath?: string; // ':memory:' or file path
}

export interface CreateSessionParams {
  id?: string;
  name: string;
  goal: string;
}

export interface StartTaskParams {
  id?: string;
  sessionId: string;
  parentTaskId?: string;
  title: string;
  description: string;
  assignedAgentId: string;
}

export interface RecordAgentRunParams {
  id?: string;
  sessionId: string;
  taskId: string;
  agentId: string;
  executionMode: 'in_process' | 'supervised_subprocess';
  inputPayload: Record<string, unknown> | string;
}

export interface RecordToolExecutionParams {
  id?: string;
  sessionId: string;
  taskId: string;
  agentId: string;
  toolName: string;
  inputArgs: Record<string, unknown> | string;
  rawOutput: unknown;
  success: boolean;
  durationMs: number;
  tokensUsed?: number;
  parentLineageId?: string;
}

export interface AddLineageEdgeParams {
  id?: string;
  sessionId: string;
  sourceType: LineageEdge['sourceType'];
  sourceId: string;
  targetType: LineageEdge['targetType'];
  targetId: string;
  relation: LineageEdge['relation'];
}
