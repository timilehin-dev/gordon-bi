export class WatcherError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string = 'WATCHER_ERROR', details?: any) {
    super(`[WatcherError] ${message} (Code: ${code})`);
    this.name = 'WatcherError';
    this.code = code;
    this.details = details;
  }
}
