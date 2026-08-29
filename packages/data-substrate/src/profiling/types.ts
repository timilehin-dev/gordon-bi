export type SemanticColumnType =
  | 'identifier'
  | 'numeric:currency'
  | 'numeric:percentage'
  | 'numeric:quantity'
  | 'temporal:date'
  | 'temporal:timestamp'
  | 'geographic:country'
  | 'geographic:city'
  | 'geographic:zip'
  | 'contact:email'
  | 'contact:phone'
  | 'text:categorical'
  | 'text:freeform';

export interface PiiDetectionRecord {
  columnName: string;
  piiType: 'email' | 'credit_card' | 'ssn' | 'phone_number' | 'ip_address';
  confidence: number;
  sampleMatches: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ColumnProfile {
  columnName: string;
  dataType: string;
  semanticType: SemanticColumnType;
  totalCount: number;
  nullCount: number;
  nullPercentage: number;
  distinctCount: number;
  distinctPercentage: number;
  min?: number | string;
  max?: number | string;
  mean?: number;
  stdDev?: number;
  piiRisk?: PiiDetectionRecord;
  sampleValues: unknown[];
}

export interface TableProfile {
  tableName: string;
  totalRows: number;
  totalColumns: number;
  columns: ColumnProfile[];
  hasPii: boolean;
  profilingDurationMs: number;
}
