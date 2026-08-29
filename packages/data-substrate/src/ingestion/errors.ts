export class IngestionError extends Error {
  public readonly code: string;
  public readonly sourcePath?: string;
  public readonly details?: unknown;

  constructor(message: string, code: string = 'INGESTION_ERROR', sourcePath?: string, details?: unknown) {
    super(message);
    this.name = 'IngestionError';
    this.code = code;
    this.sourcePath = sourcePath;
    this.details = details;
  }
}
