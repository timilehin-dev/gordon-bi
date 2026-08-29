import { readFileSync, statSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { DocumentStore } from '../../documents/store.js';
import { IngestionOptions, UnstructuredIngestionResult } from '../types.js';
import { IngestionError } from '../errors.js';
import { DocumentChunk } from '@gordon/shared-types';

export class MarkdownIngestionParser {
  private docStore: DocumentStore;

  constructor(docStore: DocumentStore) {
    this.docStore = docStore;
  }

  public parseAndIndex(filePath: string, options: IngestionOptions = {}): UnstructuredIngestionResult {
    if (!existsSync(filePath)) {
      throw new IngestionError(`Markdown file not found: ${filePath}`, 'FILE_NOT_FOUND', filePath);
    }

    const startTime = Date.now();
    const fileName = basename(filePath);
    const stat = statSync(filePath);

    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split(/\r?\n/);

      // Register document
      const doc = this.docStore.registerDocument({
        sourcePath: filePath,
        filename: fileName,
        fileType: 'markdown',
        fileSizeBytes: stat.size,
        metadata: { lineCount: lines.length },
      });

      // Parse headings and sections
      const chunks: DocumentChunk[] = [];
      const currentHeadings: string[] = [];
      let currentSectionLines: string[] = [];
      let startLine = 1;
      let chunkIndex = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);

        if (headingMatch) {
          // Flush existing section if it has content
          if (currentSectionLines.length > 0) {
            const chunkContent = currentSectionLines.join('\n').trim();
            if (chunkContent.length > 0) {
              const chunk = this.docStore.addChunk({
                documentId: doc.id,
                chunkIndex: chunkIndex++,
                content: chunkContent,
                startLine,
                endLine: i,
                headingHierarchy: [...currentHeadings],
              });
              chunks.push(chunk);
            }
            currentSectionLines = [];
          }

          const level = headingMatch[1].length;
          const headingText = headingMatch[2].trim();

          // Adjust heading hierarchy
          while (currentHeadings.length >= level) {
            currentHeadings.pop();
          }
          currentHeadings.push(headingText);
          startLine = i + 1;
        } else {
          currentSectionLines.push(line);
        }
      }

      // Flush final section
      if (currentSectionLines.length > 0) {
        const chunkContent = currentSectionLines.join('\n').trim();
        if (chunkContent.length > 0) {
          const chunk = this.docStore.addChunk({
            documentId: doc.id,
            chunkIndex: chunkIndex++,
            content: chunkContent,
            startLine,
            endLine: lines.length,
            headingHierarchy: [...currentHeadings],
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
    } catch (err: any) {
      if (err instanceof IngestionError) throw err;
      throw new IngestionError(`Markdown parsing failed: ${err.message}`, 'MARKDOWN_PARSE_ERROR', filePath, err);
    }
  }
}
