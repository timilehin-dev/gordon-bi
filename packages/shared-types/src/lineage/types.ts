/**
 * Lineage and Provenance Store Types
 */

export interface SessionRecord {
  id: string;
  name: string;
  goal: string;
  status: 'active' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
}

export interface TaskRecord {
  id: string;
  sessionId: string;
  parentTaskId?: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'blocked';
  assignedAgentId: string;
  createdAt: number;
  completedAt?: number;
}

export interface AgentRunRecord {
  id: string;
  sessionId: string;
  taskId: string;
  agentId: string;
  executionMode: 'in_process' | 'supervised_subprocess';
  status: 'running' | 'completed' | 'failed';
  inputPayload: string;
  outputPayload?: string;
  tokenUsage?: number;
  durationMs?: number;
  createdAt: number;
  completedAt?: number;
}

export interface LineageEdge {
  id: string;
  sessionId: string;
  sourceType: 'task' | 'tool' | 'document' | 'table';
  sourceId: string;
  targetType: 'task' | 'tool' | 'claim' | 'visual' | 'artifact';
  targetId: string;
  relation: 'produced_by' | 'derived_from' | 'verified_by' | 'queried_from';
  createdAt: number;
}

export interface LineageTrace {
  rootSession: SessionRecord;
  tasks: TaskRecord[];
  agentRuns: AgentRunRecord[];
  toolExecutions: Array<{
    id: string;
    toolName: string;
    inputArgs: string;
    rawOutput: string;
    success: boolean;
    durationMs: number;
    createdAt: number;
  }>;
  edges: LineageEdge[];
}
