import { z } from 'zod';

export const ToolCapabilitySchema = z.enum([
  'data:read',
  'data:write',
  'data:profile',
  'stats:compute',
  'ml:forecast',
  'ml:anomaly',
  'sql:query',
  'lineage:read',
  'report:assemble',
  'orchestration:manage',
  'system:exec',
]);

export const ToolParameterSchemaValidator = z.object({
  type: z.string(),
  description: z.string(),
  properties: z.record(z.unknown()).optional(),
  required: z.array(z.string()).optional(),
}).passthrough();

export const ToolExecutionContextSchema = z.object({
  sessionId: z.string().min(1),
  taskId: z.string().min(1),
  agentId: z.string().min(1),
  parentLineageId: z.string().optional(),
  invokedAt: z.number().int().positive(),
});

export const ToolErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
  stack: z.string().optional(),
});

export const ToolResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: ToolErrorSchema.optional(),
  durationMs: z.number().nonnegative(),
  metadata: z.record(z.unknown()).optional(),
});
