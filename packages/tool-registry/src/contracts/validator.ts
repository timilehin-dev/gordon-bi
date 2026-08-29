import { z } from 'zod';
import { ToolParameterSchema } from '@gordon/shared-types';
import { ToolRegistryError } from '../registry/errors.js';

export class ToolContractValidator {
  public static validateInput(schema: ToolParameterSchema, input: unknown): Record<string, unknown> {
    if (!input || typeof input !== 'object') {
      throw new ToolRegistryError('Tool input must be an object', 'INVALID_TOOL_INPUT_FORMAT', { input });
    }

    const inputObj = input as Record<string, unknown>;

    // Check required properties
    if (Array.isArray(schema.required)) {
      for (const requiredKey of schema.required) {
        if (inputObj[requiredKey] === undefined || inputObj[requiredKey] === null) {
          throw new ToolRegistryError(
            `Missing required parameter '${requiredKey}' for tool execution`,
            'MISSING_REQUIRED_PARAMETER',
            { missingKey: requiredKey, schema }
          );
        }
      }
    }

    return inputObj;
  }
}
