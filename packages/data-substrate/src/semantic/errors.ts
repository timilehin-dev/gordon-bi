export class SemanticModelError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string = 'SEMANTIC_MODEL_ERROR', details?: unknown) {
    super(message);
    this.name = 'SemanticModelError';
    this.code = code;
    this.details = details;
  }
}
