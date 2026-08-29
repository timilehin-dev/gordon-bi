export class OsSandboxError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string = 'OS_SANDBOX_ERROR', details?: unknown) {
    super(message);
    this.name = 'OsSandboxError';
    this.code = code;
    this.details = details;
  }
}
