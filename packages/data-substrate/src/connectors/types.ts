export type DatabaseEngineType = 'postgres' | 'mysql' | 'snowflake' | 'bigquery' | 'sqlite' | 'clickhouse';

export interface DatabaseConnectionConfig {
  engine: DatabaseEngineType;
  host?: string;
  port?: number;
  database: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  warehouse?: string; // Snowflake / BigQuery
  schema?: string;
}

export interface DbQueryIngestParams {
  connection: DatabaseConnectionConfig;
  query: string;
  targetTableName: string;
  maxRows?: number;
}

export interface DbQueryIngestResult {
  targetTableName: string;
  rowsIngested: number;
  columnsCreated: string[];
  executionDurationMs: number;
  engineUsed: DatabaseEngineType;
}

export interface RestApiConnectorParams {
  endpointUrl: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  authBearerToken?: string;
  pagination?: {
    type: 'page_number' | 'cursor' | 'offset_limit';
    pageParamName?: string;
    maxPages?: number;
    pageSize?: number;
  };
  jsonPathRoot?: string;
  targetTableName: string;
}

export interface RestApiConnectorResult {
  targetTableName: string;
  rowsIngested: number;
  totalPagesFetched: number;
  columnsCreated: string[];
  executionDurationMs: number;
}
