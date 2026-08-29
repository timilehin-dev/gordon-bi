export class ToolRegistryError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string = 'TOOL_REGISTRY_ERROR', details?: unknown) {
    super(message);
    this.name = 'ToolRegistryError';
    this.code = code;
    this.details = details;
  }
}

export class ToolPermissionDeniedError extends ToolRegistryError {
  constructor(toolName: string, agentId: string) {
    super(
      `Permission denied: Agent '${agentId}' is not authorized to invoke tool '${toolName}'`,
      'TOOL_PERMISSION_DENIED',
      { toolName, agentId }
    );
    this.name = 'ToolPermissionDeniedError';
  }
}
