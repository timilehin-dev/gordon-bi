import { ToolCapability } from '@gordon/shared-types';

export interface TaskDagNode {
  id: string;
  title: string;
  description: string;
  assignedAgentId: string;
  requiredCapabilities: ToolCapability[];
  toolName: string;
  input: Record<string, unknown>;
  dependencies: string[]; // List of task node IDs that must complete first
}

export interface TaskDag {
  id: string;
  goal: string;
  nodes: TaskDagNode[];
}

export interface TaskNodeExecutionResult {
  nodeId: string;
  toolName: string;
  success: boolean;
  data?: unknown;
  error?: string;
  durationMs: number;
}

export interface DagExecutionResult {
  sessionId: string;
  goal: string;
  success: boolean;
  results: Map<string, TaskNodeExecutionResult>;
  totalDurationMs: number;
}
