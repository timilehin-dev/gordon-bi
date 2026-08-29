export class FundamentalAnalysisError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string = 'FUNDAMENTAL_ERROR', details?: any) {
    super(`[FundamentalAnalysisError] ${message} (Code: ${code})`);
    this.name = 'FundamentalAnalysisError';
    this.code = code;
    this.details = details;
  }
}
