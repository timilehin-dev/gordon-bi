export class LineageStoreError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string = 'LINEAGE_STORE_ERROR', details?: unknown) {
    super(message);
    this.name = 'LineageStoreError';
    this.code = code;
    this.details = details;
  }
}
