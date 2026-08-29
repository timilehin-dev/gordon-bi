export class SqlAgentError extends Error {
  public readonly code: string;
  public readonly sql?: string;

  constructor(message: string, code: string = 'SQL_AGENT_ERROR', sql?: string) {
    super(message);
    this.name = 'SqlAgentError';
    this.code = code;
    this.sql = sql;
  }
}
