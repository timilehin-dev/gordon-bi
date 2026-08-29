export class AnomalyDetectionError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = 'ANOMALY_DETECTION_ERROR') {
    super(message);
    this.name = 'AnomalyDetectionError';
    this.code = code;
  }
}
