export class StatisticsToolError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string = 'STATISTICS_ERROR', details?: any) {
    super(`[StatisticsToolError] ${message} (Code: ${code})`);
    this.name = 'StatisticsToolError';
    this.code = code;
    this.details = details;
  }
}
