export class InsightSynthesisError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = 'INSIGHT_SYNTHESIS_ERROR') {
    super(message);
    this.name = 'InsightSynthesisError';
    this.code = code;
  }
}
