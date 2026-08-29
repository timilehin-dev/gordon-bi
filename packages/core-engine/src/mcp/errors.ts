export class McpManagerError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string = 'MCP_MANAGER_ERROR', details?: unknown) {
    super(message);
    this.name = 'McpManagerError';
    this.code = code;
    this.details = details;
  }
}
