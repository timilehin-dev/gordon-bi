export class MarketplaceError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string = 'MARKETPLACE_ERROR', details?: any) {
    super(`[MarketplaceError] ${message} (Code: ${code})`);
    this.name = 'MarketplaceError';
    this.code = code;
    this.details = details;
  }
}
