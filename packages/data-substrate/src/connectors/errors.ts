export class ConnectorError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string = 'CONNECTOR_ERROR', details?: any) {
    super(`[ConnectorError] ${message} (Code: ${code})`);
    this.name = 'ConnectorError';
    this.code = code;
    this.details = details;
  }
}
