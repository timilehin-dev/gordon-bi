export class ProfilingError extends Error {
  public readonly code: string;
  public readonly tableName?: string;

  constructor(message: string, code: string = 'PROFILING_ERROR', tableName?: string) {
    super(message);
    this.name = 'ProfilingError';
    this.code = code;
    this.tableName = tableName;
  }
}
