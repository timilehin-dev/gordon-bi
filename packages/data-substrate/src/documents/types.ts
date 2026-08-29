import { DocumentRecord, DocumentChunk, DocumentSearchQuery, DocumentSearchResult } from '@gordon/shared-types';

export interface DocumentStoreConfig {
  dbPath?: string; // ':memory:' or file path
}

export interface RegisterDocumentParams {
  id?: string;
  sourcePath: string;
  filename: string;
  fileType: DocumentRecord['fileType'];
  fileSizeBytes: number;
  metadata?: Record<string, unknown>;
}

export interface AddChunkParams {
  id?: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  pageNumber?: number;
  startLine?: number;
  endLine?: number;
  headingHierarchy?: string[];
  metadata?: Record<string, unknown>;
}
