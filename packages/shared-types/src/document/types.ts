/**
 * Document and Chunk Store Types
 */

export interface DocumentRecord {
  id: string;
  sourcePath: string;
  filename: string;
  fileType: 'pdf' | 'docx' | 'markdown' | 'csv' | 'xlsx' | 'json';
  fileSizeBytes: number;
  totalChunks: number;
  metadata: Record<string, unknown>;
  createdAt: number;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  pageNumber?: number;
  startLine?: number;
  endLine?: number;
  headingHierarchy: string[];
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface DocumentSearchQuery {
  query: string;
  fileTypes?: Array<DocumentRecord['fileType']>;
  documentIds?: string[];
  limit?: number;
}

export interface DocumentSearchResult {
  chunk: DocumentChunk;
  document: DocumentRecord;
  relevanceScore: number;
  citationText: string;
}
