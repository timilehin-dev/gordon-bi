import { statSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { DocumentStore } from '../../documents/store.js';
import { PythonCodeSandbox } from '@gordon/sandbox-runtime';
import { IngestionOptions, UnstructuredIngestionResult } from '../types.js';
import { IngestionError } from '../errors.js';
import { DocumentChunk } from '@gordon/shared-types';

export class PdfIngestionParser {
  private docStore: DocumentStore;
  private pythonSandbox: PythonCodeSandbox;

  constructor(docStore: DocumentStore) {
    this.docStore = docStore;
    this.pythonSandbox = new PythonCodeSandbox({ timeoutMs: 60000 });
  }

  public async parseAndIndex(filePath: string, options: IngestionOptions = {}): Promise<UnstructuredIngestionResult> {
    if (!existsSync(filePath)) {
      throw new IngestionError(`PDF file not found: ${filePath}`, 'FILE_NOT_FOUND', filePath);
    }

    const startTime = Date.now();
    const fileName = basename(filePath);
    const stat = statSync(filePath);

    // Python extractor using pypdf, fitz, or standard stream parser
    const pyScript = `
import os
import json

file_path = inputs.get('filePath')
pages_data = []

try:
    # Try pypdf / pypdf2 / pdfplumber if installed, otherwise stream text parser
    extracted = False
    try:
        import pypdf
        reader = pypdf.PdfReader(file_path)
        for idx, page in enumerate(reader.pages):
            text = page.extract_text() or ''
            pages_data.append({'pageNumber': idx + 1, 'text': text})
        extracted = True
    except Exception:
        pass

    if not extracted:
        try:
            import fitz
            doc = fitz.open(file_path)
            for idx, page in enumerate(doc):
                text = page.get_text() or ''
                pages_data.append({'pageNumber': idx + 1, 'text': text})
            extracted = True
        except Exception:
            pass

    if not extracted:
        # Fallback binary text stream extraction
        with open(file_path, 'rb') as f:
            content = f.read().decode('latin1', errors='ignore')
            # Basic stream text finder
            pages_data.append({'pageNumber': 1, 'text': content[:5000]})

    export_result({'pages': pages_data})
except Exception as e:
    export_result({'error': str(e), 'pages': []})
`;

    const pyResult = await this.pythonSandbox.runSnippet<{ pages?: Array<{ pageNumber: number; text: string }>; error?: string }>(
      pyScript,
      { filePath: filePath.replace(/\\/g, '/') }
    );

    const doc = this.docStore.registerDocument({
      sourcePath: filePath,
      filename: fileName,
      fileType: 'pdf',
      fileSizeBytes: stat.size,
      metadata: { totalPages: pyResult.result?.pages?.length || 1 },
    });

    const chunks: DocumentChunk[] = [];
    const pages = pyResult.result?.pages || [];
    let chunkIndex = 0;

    for (const page of pages) {
      const pageText = page.text.trim();
      if (!pageText) continue;

      // Break page into paragraphs
      const paragraphs = pageText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      for (const para of paragraphs) {
        const chunk = this.docStore.addChunk({
          documentId: doc.id,
          chunkIndex: chunkIndex++,
          content: para.trim(),
          pageNumber: page.pageNumber,
          headingHierarchy: [`Page ${page.pageNumber}`],
        });
        chunks.push(chunk);
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      sourcePath: filePath,
      document: doc,
      chunks,
      totalChunks: chunks.length,
      durationMs,
    };
  }
}
