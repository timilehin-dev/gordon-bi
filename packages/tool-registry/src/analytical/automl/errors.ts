export class AutoMlError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string = 'AUTOML_ERROR', details?: any) {
    super(`[AutoMlError] ${message} (Code: ${code})`);
    this.name = 'AutoMlError';
    this.code = code;
    this.details = details;
  }
}
