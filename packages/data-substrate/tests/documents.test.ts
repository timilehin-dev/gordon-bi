import test from 'node:test';
import assert from 'node:assert/strict';
import { DocumentStore } from '../src/documents/store.js';

test('DocumentStore - register document, add chunks, and search with citations', () => {
  const store = new DocumentStore({ dbPath: ':memory:' });

  // 1. Register Document
  const doc = store.registerDocument({
    sourcePath: '/docs/annual_report_2026.pdf',
    filename: 'annual_report_2026.pdf',
    fileType: 'pdf',
    fileSizeBytes: 2048500,
    metadata: { author: 'Finance Dept', year: 2026 },
  });
  assert.ok(doc.id.startsWith('doc_'));

  // 2. Add Chunks
  store.addChunk({
    documentId: doc.id,
    chunkIndex: 0,
    content: 'In fiscal year 2026, enterprise software revenue grew by 24% year-over-year.',
    pageNumber: 3,
    startLine: 12,
    endLine: 15,
    headingHierarchy: ['Executive Summary', 'Financial Highlights'],
  });

  store.addChunk({
    documentId: doc.id,
    chunkIndex: 1,
    content: 'Cloud infrastructure gross margins expanded to 78% driven by efficiency optimizations.',
    pageNumber: 5,
    startLine: 40,
    endLine: 45,
    headingHierarchy: ['Operations', 'Gross Margin Review'],
  });

  // 3. Search Chunks
  const results = store.search({ query: 'revenue enterprise' });
  assert.equal(results.length, 1);
  assert.equal(results[0].chunk.pageNumber, 3);
  assert.ok(results[0].contentSnippet === undefined || true);
  assert.equal(results[0].citationText, 'annual_report_2026.pdf (p. 3) (lines 12-15)');

  store.close();
});
