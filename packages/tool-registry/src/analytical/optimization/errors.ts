export class OptimizationError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string = 'OPTIMIZATION_ERROR', details?: any) {
    super(`[OptimizationError] ${message} (Code: ${code})`);
    this.name = 'OptimizationError';
    this.code = code;
    this.details = details;
  }
}
