import { DocumentRecord, DocumentChunk } from '@gordon/shared-types';

export type IngestionSourceType = 'csv' | 'tsv' | 'xlsx' | 'json' | 'jsonl' | 'markdown' | 'pdf' | 'docx';

export interface IngestionOptions {
  tableName?: string;
  delimiter?: string;
  hasHeader?: boolean;
  sheetName?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  inferSchema?: boolean;
}

export interface StructuredIngestionResult {
  sourcePath: string;
  tableName: string;
  rowCount: number;
  columnCount: number;
  columns: Array<{ name: string; type: string; nullable: boolean }>;
  durationMs: number;
}

export interface UnstructuredIngestionResult {
  sourcePath: string;
  document: DocumentRecord;
  chunks: DocumentChunk[];
  totalChunks: number;
  durationMs: number;
}

export interface UnifiedIngestionResult {
  structured: StructuredIngestionResult[];
  unstructured: UnstructuredIngestionResult[];
  totalFilesProcessed: number;
  totalDurationMs: number;
}
