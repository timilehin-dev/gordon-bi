import { extname } from 'node:path';
import { WarehouseEngine } from '../warehouse/engine.js';
import { DocumentStore } from '../documents/store.js';
import { CsvIngestionParser } from './csv/parser.js';
import { ExcelIngestionParser } from './excel/parser.js';
import { JsonIngestionFlattener } from './json/flattener.js';
import { MarkdownIngestionParser } from './markdown/parser.js';
import { PdfIngestionParser } from './pdf/parser.js';
import { DocxIngestionParser } from './docx/parser.js';
import { IngestionOptions, UnifiedIngestionResult, StructuredIngestionResult, UnstructuredIngestionResult } from './types.js';
import { IngestionError } from './errors.js';

export class UnifiedIngestionPipeline {
  private csvParser: CsvIngestionParser;
  private excelParser: ExcelIngestionParser;
  private jsonFlattener: JsonIngestionFlattener;
  private markdownParser: MarkdownIngestionParser;
  private pdfParser: PdfIngestionParser;
  private docxParser: DocxIngestionParser;

  constructor(warehouse: WarehouseEngine, docStore: DocumentStore) {
    this.csvParser = new CsvIngestionParser(warehouse);
    this.excelParser = new ExcelIngestionParser(warehouse);
    this.jsonFlattener = new JsonIngestionFlattener(warehouse);
    this.markdownParser = new MarkdownIngestionParser(docStore);
    this.pdfParser = new PdfIngestionParser(docStore);
    this.docxParser = new DocxIngestionParser(docStore);
  }

  public async ingestFile(filePath: string, options: IngestionOptions = {}): Promise<StructuredIngestionResult[] | UnstructuredIngestionResult> {
    const ext = extname(filePath).toLowerCase();

    switch (ext) {
      case '.csv':
      case '.tsv':
        const csvRes = await this.csvParser.parseAndLoad(filePath, options);
        return [csvRes];

      case '.xlsx':
      case '.xls':
        return await this.excelParser.parseAndLoad(filePath, options);

      case '.json':
      case '.jsonl':
        const jsonRes = await this.jsonFlattener.parseAndLoad(filePath, options);
        return [jsonRes];

      case '.md':
      case '.markdown':
        return this.markdownParser.parseAndIndex(filePath, options);

      case '.pdf':
        return await this.pdfParser.parseAndIndex(filePath, options);

      case '.docx':
        return await this.docxParser.parseAndIndex(filePath, options);

      default:
        throw new IngestionError(`Unsupported file format: '${ext}'`, 'UNSUPPORTED_FORMAT', filePath);
    }
  }

  public async ingestBatch(filePaths: string[], options: IngestionOptions = {}): Promise<UnifiedIngestionResult> {
    const startTime = Date.now();
    const structured: StructuredIngestionResult[] = [];
    const unstructured: UnstructuredIngestionResult[] = [];

    for (const filePath of filePaths) {
      const result = await this.ingestFile(filePath, options);
      if (Array.isArray(result)) {
        structured.push(...result);
      } else {
        unstructured.push(result);
      }
    }

    return {
      structured,
      unstructured,
      totalFilesProcessed: filePaths.length,
      totalDurationMs: Date.now() - startTime,
    };
  }
}
