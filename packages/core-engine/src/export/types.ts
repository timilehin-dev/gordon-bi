import { ReportCanvasLayout, ChartSpec } from '@gordon/shared-types';
import { ExecutiveReport } from '../agents/insight/types.js';

export type ExportFormat = 'html' | 'pdf' | 'markdown' | 'sql';

export interface ExportOptions {
  format: ExportFormat;
  includeData?: boolean;
  includeLineage?: boolean;
  title?: string;
  outputPath?: string;
}

export interface ExportResult {
  format: ExportFormat;
  content: string;
  byteSize: number;
  filePath?: string;
  durationMs: number;
}
