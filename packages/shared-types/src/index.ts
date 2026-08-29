export * from './tool/types.js';
export * from './tool/schema.js';
export * from './lineage/types.js';
export * from './agent/types.js';
export * from './agent/schema.js';
export * from './document/types.js';
export * from './mcp/types.js';
export * from './visual/types.js';
export * from './auth/types.js';

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
  distinctCount: number;
  nullPercentage?: number;
  totalCount?: number;
  nullCount?: number;
  distinctPercentage?: number;
  min?: number | string;
  max?: number | string;
  mean?: number;
  stdDev?: number;
  piiRisk?: PiiDetectionRecord;
  sampleValues?: unknown[];
}

export interface TableProfile {
  tableName: string;
  rowCount?: number;
  totalRows?: number;
  columnCount?: number;
  totalColumns?: number;
  columns: ColumnProfile[];
  hasPii?: boolean;
  riskScore?: number;
  profilingDurationMs?: number;
}
