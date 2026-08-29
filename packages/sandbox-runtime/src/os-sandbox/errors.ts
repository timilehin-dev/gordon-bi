export class OsSandboxSecurityError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string, details?: any) {
    super(`[OsSandboxSecurityError] ${message} (Code: ${code})`);
    this.name = 'OsSandboxSecurityError';
    this.code = code;
    this.details = details;
  }
}

export class FailClosedPolicyError extends OsSandboxSecurityError {
  constructor(reason: string) {
    super(`Execution refused under Fail-Closed policy: ${reason}`, 'FAIL_CLOSED_VIOLATION');
    this.name = 'FailClosedPolicyError';
  }
}

export class SandboxCapabilityViolationError extends OsSandboxSecurityError {
  constructor(capability: string, scope: string) {
    super(`Unauthorized capability access attempt: '${capability}' on scope '${scope}'`, 'CAPABILITY_VIOLATION');
    this.name = 'SandboxCapabilityViolationError';
  }
}
