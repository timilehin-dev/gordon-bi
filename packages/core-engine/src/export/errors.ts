export class ReportExportError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = 'REPORT_EXPORT_ERROR') {
    super(message);
    this.name = 'ReportExportError';
    this.code = code;
  }
}
