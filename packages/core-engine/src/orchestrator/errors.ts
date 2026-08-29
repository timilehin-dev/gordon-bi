export class OrchestratorError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string = 'ORCHESTRATOR_ERROR', details?: unknown) {
    super(message);
    this.name = 'OrchestratorError';
    this.code = code;
    this.details = details;
  }
}
