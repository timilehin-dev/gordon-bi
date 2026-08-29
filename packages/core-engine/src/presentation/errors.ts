export class PresentationBuilderError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string = 'PRESENTATION_ERROR', details?: any) {
    super(`[PresentationBuilderError] ${message} (Code: ${code})`);
    this.name = 'PresentationBuilderError';
    this.code = code;
    this.details = details;
  }
}
