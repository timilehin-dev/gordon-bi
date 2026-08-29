export class AgentConfigError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string = 'AGENT_CONFIG_ERROR', details?: unknown) {
    super(message);
    this.name = 'AgentConfigError';
    this.code = code;
    this.details = details;
  }
}
