export class WarehouseError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string = 'WAREHOUSE_ERROR', details?: unknown) {
    super(message);
    this.name = 'WarehouseError';
    this.code = code;
    this.details = details;
  }
}
