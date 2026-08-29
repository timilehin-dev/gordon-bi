export class WorkspaceBundleError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string = 'WORKSPACE_ERROR', details?: any) {
    super(`[WorkspaceBundleError] ${message} (Code: ${code})`);
    this.name = 'WorkspaceBundleError';
    this.code = code;
    this.details = details;
  }
}
