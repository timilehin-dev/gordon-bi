export class WasmSandboxError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string = 'WASM_SANDBOX_ERROR', details?: unknown) {
    super(message);
    this.name = 'WasmSandboxError';
    this.code = code;
    this.details = details;
  }
}
