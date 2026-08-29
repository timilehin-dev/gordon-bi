export class SecurityVaultError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = 'SECURITY_VAULT_ERROR') {
    super(message);
    this.name = 'SecurityVaultError';
    this.code = code;
  }
}
