export class PythonSandboxError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string = 'PYTHON_SANDBOX_ERROR', details?: unknown) {
    super(message);
    this.name = 'PythonSandboxError';
    this.code = code;
    this.details = details;
  }
}
