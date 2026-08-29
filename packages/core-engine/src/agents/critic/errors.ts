export class CriticAuditError extends Error {
  public readonly code: string;
  public readonly auditReport?: any;

  constructor(message: string, code: string = 'CRITIC_AUDIT_REJECTED', auditReport?: any) {
    super(message);
    this.name = 'CriticAuditError';
    this.code = code;
    this.auditReport = auditReport;
  }
}
