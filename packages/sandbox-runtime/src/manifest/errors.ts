export class PluginManifestValidationError extends Error {
  public errors: string[];

  constructor(message: string, errors: string[] = []) {
    super(`[PluginManifestValidationError] ${message}: ${errors.join(', ')}`);
    this.name = 'PluginManifestValidationError';
    this.errors = errors;
  }
}
