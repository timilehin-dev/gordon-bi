export class ForecastingError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = 'FORECASTING_ERROR') {
    super(message);
    this.name = 'ForecastingError';
    this.code = code;
  }
}
