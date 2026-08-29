export interface WarehouseColumn {
  name: string;
  type: string;
  nullable: boolean;
}

export interface WarehouseTableSchema {
  tableName: string;
  columns: WarehouseColumn[];
  rowCount?: number;
}

export interface WarehouseQueryResult<T = Record<string, unknown>> {
  columns: string[];
  rows: T[];
  rowCount: number;
  executionTimeMs: number;
}

export interface WarehouseConfig {
  dbPath?: string; // ':memory:' or file path
  maxMemoryMb?: number;
  threads?: number;
}
