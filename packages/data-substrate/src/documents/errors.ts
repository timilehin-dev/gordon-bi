export class DocumentStoreError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string = 'DOCUMENT_STORE_ERROR', details?: unknown) {
    super(message);
    this.name = 'DocumentStoreError';
    this.code = code;
    this.details = details;
  }
}
