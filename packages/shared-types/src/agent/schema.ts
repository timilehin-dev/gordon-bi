import { z } from 'zod';
import { ToolCapabilitySchema } from '../tool/schema.js';

export const AgentExecutionModeSchema = z.enum(['in_process', 'supervised_subprocess']);

export const AgentResourceLimitsSchema = z.object({
  maxMemoryMb: z.number().int().positive(),
  timeoutMs: z.number().int().positive(),
  cpuQuotaPercent: z.number().min(1).max(100).optional(),
  maxRestarts: z.number().int().nonnegative().optional(),
});

export const AgentConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  role: z.string().min(1),
  description: z.string(),
  executionMode: AgentExecutionModeSchema,
  allowedCapabilities: z.array(ToolCapabilitySchema),
  allowedTools: z.array(z.string()),
  systemPrompt: z.string(),
  resourceLimits: AgentResourceLimitsSchema,
});
