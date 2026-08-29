export interface SqlAgentQueryRequest {
  naturalLanguageQuery: string;
  tableName: string;
  tableColumns: Array<{ name: string; type: string }>;
}

export interface SqlAgentQueryResult {
  generatedSql: string;
  isValid: boolean;
  rows: any[];
  rowCount: number;
  columns: string[];
  executionTimeMs: number;
  explanation: string;
}
