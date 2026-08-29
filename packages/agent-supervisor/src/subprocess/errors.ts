export class SubprocessSupervisorError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string = 'SUBPROCESS_SUPERVISOR_ERROR', details?: unknown) {
    super(message);
    this.name = 'SubprocessSupervisorError';
    this.code = code;
    this.details = details;
  }
}
