export class DaxFormulaError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string = 'DAX_FORMULA_ERROR', details?: any) {
    super(`[DaxFormulaError] ${message} (Code: ${code})`);
    this.name = 'DaxFormulaError';
    this.code = code;
    this.details = details;
  }
}
