import { z } from 'zod';

export const SessionRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  goal: z.string(),
  status: z.enum(['active', 'completed', 'failed']),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export const TaskRecordSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  parentTaskId: z.string().optional(),
  title: z.string().min(1),
  description: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'blocked']),
  assignedAgentId: z.string().min(1),
  createdAt: z.number().int().positive(),
  completedAt: z.number().int().positive().optional(),
});

export const AgentRunRecordSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  taskId: z.string().min(1),
  agentId: z.string().min(1),
  executionMode: z.enum(['in_process', 'supervised_subprocess']),
  status: z.enum(['running', 'completed', 'failed']),
  inputPayload: z.string(),
  outputPayload: z.string().optional(),
  tokenUsage: z.number().int().nonnegative().optional(),
  durationMs: z.number().nonnegative().optional(),
  createdAt: z.number().int().positive(),
  completedAt: z.number().int().positive().optional(),
});

export const LineageEdgeSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  sourceType: z.enum(['task', 'tool', 'document', 'table']),
  sourceId: z.string().min(1),
  targetType: z.enum(['task', 'tool', 'claim', 'visual', 'artifact']),
  targetId: z.string().min(1),
  relation: z.enum(['produced_by', 'derived_from', 'verified_by', 'queried_from']),
  createdAt: z.number().int().positive(),
});
