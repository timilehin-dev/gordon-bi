import { DocumentSearchResult } from '@gordon/shared-types';

export type Cardinality = '1:1' | '1:N' | 'N:1' | 'N:M';

export interface TableRelationship {
  id: string;
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  cardinality: Cardinality;
  isVerified: boolean;
}

export type MeasureAggregation = 'SUM' | 'AVG' | 'COUNT' | 'COUNT_DISTINCT' | 'MIN' | 'MAX' | 'RATIO';

export interface CalculatedMeasure {
  id: string;
  name: string;
  displayName: string;
  tableName: string;
  aggregation: MeasureAggregation;
  expression: string; // e.g. "SUM(quantity * unit_price)" or "SUM(profit) / SUM(revenue)"
  formatString?: string; // e.g. "$#,##0.00" or "0.0%"
  description?: string;
}

export interface CalculatedColumn {
  id: string;
  name: string;
  tableName: string;
  expression: string; // SQL expression e.g. "price * (1.0 - discount_pct)"
  dataType: string;
}

export interface SemanticModelCatalog {
  tables: string[];
  relationships: TableRelationship[];
  measures: CalculatedMeasure[];
  calculatedColumns: CalculatedColumn[];
}

export interface UnifiedQueryResult {
  queryType: 'structured_sql' | 'document_search' | 'hybrid';
  structuredData?: {
    columns: string[];
    rows: any[];
    rowCount: number;
    executionTimeMs: number;
  };
  documentResults?: DocumentSearchResult[];
  executionTimeMs: number;
}
