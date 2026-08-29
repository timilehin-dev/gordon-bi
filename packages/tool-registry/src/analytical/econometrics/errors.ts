export class EconometricToolError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string = 'ECONOMETRIC_ERROR', details?: any) {
    super(`[EconometricToolError] ${message} (Code: ${code})`);
    this.name = 'EconometricToolError';
    this.code = code;
    this.details = details;
  }
}
