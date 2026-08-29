export interface ScalabilityBenchmarkResult {
  rowCount: number;
  ingestDurationMs: number;
  queryDurationMs: number;
  memoryDeltaMb: number;
  totalRssMb: number;
  throughputRowsPerSec: number;
}

export interface CompetitiveRequirementItem {
  category: string;
  requirement: string;
  comparisonTarget: string; // Power BI / Excel / Julius AI / etc.
  isSupported: boolean;
  verificationMethod: string;
}

export interface CompetitiveMatrixVerification {
  overallCompliant: boolean;
  items: CompetitiveRequirementItem[];
  verifiedAt: number;
}
