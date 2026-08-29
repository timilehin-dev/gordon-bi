export class CorrelationError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = 'CORRELATION_ERROR') {
    super(message);
    this.name = 'CorrelationError';
    this.code = code;
  }
}
