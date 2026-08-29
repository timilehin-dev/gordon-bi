export class VisualizationError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = 'VISUALIZATION_ERROR') {
    super(message);
    this.name = 'VisualizationError';
    this.code = code;
  }
}
