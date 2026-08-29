import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { DocumentRecord, DocumentChunk, DocumentSearchQuery, DocumentSearchResult } from '@gordon/shared-types';
import { DocumentStoreConfig, RegisterDocumentParams, AddChunkParams } from './types.js';
import { DocumentStoreError } from './errors.js';

export class DocumentStore {
  private db: DatabaseSync;

  constructor(config: DocumentStoreConfig = {}) {
    try {
      this.db = new DatabaseSync(config.dbPath || ':memory:');
      this.initSchema();
    } catch (err: any) {
      throw new DocumentStoreError(`Failed to initialize Document Store SQLite DB: ${err.message}`, 'INIT_ERROR', err);
    }
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        source_path TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size_bytes INTEGER NOT NULL,
        total_chunks INTEGER DEFAULT 0,
        metadata TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        page_number INTEGER,
        start_line INTEGER,
        end_line INTEGER,
        heading_hierarchy TEXT NOT NULL,
        metadata TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id)
      );

      CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id);
    `);
  }

  public registerDocument(params: RegisterDocumentParams): DocumentRecord {
    const id = params.id || `doc_${randomUUID()}`;
    const now = Date.now();
    const metaStr = JSON.stringify(params.metadata || {});

    const stmt = this.db.prepare(`
      INSERT INTO documents (id, source_path, filename, file_type, file_size_bytes, total_chunks, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `);
    stmt.run(id, params.sourcePath, params.filename, params.fileType, params.fileSizeBytes, metaStr, now);

    return {
      id,
      sourcePath: params.sourcePath,
      filename: params.filename,
      fileType: params.fileType,
      fileSizeBytes: params.fileSizeBytes,
      totalChunks: 0,
      metadata: params.metadata || {},
      createdAt: now,
    };
  }

  public addChunk(params: AddChunkParams): DocumentChunk {
    const id = params.id || `chunk_${randomUUID()}`;
    const now = Date.now();
    const headingsStr = JSON.stringify(params.headingHierarchy || []);
    const metaStr = JSON.stringify(params.metadata || {});

    const stmt = this.db.prepare(`
      INSERT INTO chunks (id, document_id, chunk_index, content, page_number, start_line, end_line, heading_hierarchy, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      params.documentId,
      params.chunkIndex,
      params.content,
      params.pageNumber || null,
      params.startLine || null,
      params.endLine || null,
      headingsStr,
      metaStr,
      now
    );

    // Update document total_chunks
    this.db.prepare(`UPDATE documents SET total_chunks = total_chunks + 1 WHERE id = ?`).run(params.documentId);

    return {
      id,
      documentId: params.documentId,
      chunkIndex: params.chunkIndex,
      content: params.content,
      pageNumber: params.pageNumber,
      startLine: params.startLine,
      endLine: params.endLine,
      headingHierarchy: params.headingHierarchy || [],
      metadata: params.metadata,
      createdAt: now,
    };
  }

  public search(query: DocumentSearchQuery): DocumentSearchResult[] {
    const limit = query.limit || 10;
    const lowerQuery = query.query.toLowerCase();
    const terms = lowerQuery.split(/\s+/).filter(t => t.length > 1);

    // Query chunks with basic term frequency ranking
    let sql = `
      SELECT c.*, d.filename, d.source_path, d.file_type, d.file_size_bytes, d.metadata as doc_meta, d.total_chunks
      FROM chunks c
      JOIN documents d ON c.document_id = d.id
    `;
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (query.documentIds && query.documentIds.length > 0) {
      const placeholders = query.documentIds.map(() => '?').join(',');
      whereClauses.push(`c.document_id IN (${placeholders})`);
      params.push(...query.documentIds);
    }

    if (query.fileTypes && query.fileTypes.length > 0) {
      const placeholders = query.fileTypes.map(() => '?').join(',');
      whereClauses.push(`d.file_type IN (${placeholders})`);
      params.push(...query.fileTypes);
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ` + whereClauses.join(' AND ');
    }

    const rows = this.db.prepare(sql).all(...params) as any[];

    // Calculate score
    const scored: DocumentSearchResult[] = [];
    for (const row of rows) {
      const contentLower = row.content.toLowerCase();
      let matchCount = 0;

      for (const term of terms) {
        if (contentLower.includes(term)) {
          matchCount++;
        }
      }

      if (matchCount > 0 || terms.length === 0) {
        const relevanceScore = terms.length > 0 ? matchCount / terms.length : 1.0;
        
        let citationText = `${row.filename}`;
        if (row.page_number) citationText += ` (p. ${row.page_number})`;
        if (row.start_line) citationText += ` (lines ${row.start_line}-${row.end_line || row.start_line})`;

        scored.push({
          chunk: {
            id: row.id,
            documentId: row.document_id,
            chunkIndex: Number(row.chunk_index),
            content: row.content,
            pageNumber: row.page_number ? Number(row.page_number) : undefined,
            startLine: row.start_line ? Number(row.start_line) : undefined,
            endLine: row.end_line ? Number(row.end_line) : undefined,
            headingHierarchy: JSON.parse(row.heading_hierarchy || '[]'),
            metadata: JSON.parse(row.metadata || '{}'),
            createdAt: Number(row.created_at),
          },
          document: {
            id: row.document_id,
            sourcePath: row.source_path,
            filename: row.filename,
            fileType: row.file_type,
            fileSizeBytes: Number(row.file_size_bytes),
            totalChunks: Number(row.total_chunks),
            metadata: JSON.parse(row.doc_meta || '{}'),
            createdAt: Number(row.created_at),
          },
          relevanceScore,
          citationText,
        });
      }
    }

    // Sort descending by score and limit
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return scored.slice(0, limit);
  }

  public getDocument(id: string): DocumentRecord | null {
    const stmt = this.db.prepare(`SELECT * FROM documents WHERE id = ?`);
    const r = stmt.get(id) as any;
    if (!r) return null;

    return {
      id: r.id,
      sourcePath: r.source_path,
      filename: r.filename,
      fileType: r.file_type,
      fileSizeBytes: Number(r.file_size_bytes),
      totalChunks: Number(r.total_chunks),
      metadata: JSON.parse(r.metadata || '{}'),
      createdAt: Number(r.created_at),
    };
  }

  public close(): void {
    this.db.close();
  }
}
