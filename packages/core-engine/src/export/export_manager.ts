import { writeFileSync } from 'node:fs';
import { ReportCanvasLayout } from '@gordon/shared-types';
import { ExecutiveReport } from '../agents/insight/types.js';
import { HtmlBundleGenerator } from './html_bundle.js';
import { ExportOptions, ExportResult } from './types.js';
import { ReportExportError } from './errors.js';

export class ReportExportManager {
  public exportReport(
    report: ExecutiveReport,
    layout?: ReportCanvasLayout,
    options: ExportOptions = { format: 'html' }
  ): ExportResult {
    const startTime = Date.now();
    let content = '';

    switch (options.format) {
      case 'html':
      case 'pdf': {
        content = HtmlBundleGenerator.generateHtml(report, layout);
        break;
      }

      case 'markdown': {
        content = report.fullMarkdown;
        break;
      }

      case 'sql': {
        content = `-- Gordon Reproducible Analysis SQL Export
-- Report: ${report.title.replace(/[\r\n]/g, ' ')}
-- Generated: ${new Date(report.generatedAt).toISOString()}

`;
        if (layout) {
          for (const spec of Object.values(layout.specs)) {
            const safeTable = spec.tableName.replace(/"/g, '""');
            const x = spec.encoding.xField || spec.encoding.categoryField;
            const y = spec.encoding.yField || spec.encoding.valueField;
            const agg = spec.encoding.aggregation?.toUpperCase() || 'SUM';

            content += `-- Visual: ${spec.title.replace(/[\r\n]/g, ' ')} (${spec.chartType})\n`;
            if (x && y) {
              const safeX = x.replace(/"/g, '""');
              const safeY = y.replace(/"/g, '""');
              content += `SELECT "${safeX}", ${agg}("${safeY}") AS "${safeY}_${agg.toLowerCase()}" FROM "${safeTable}" GROUP BY "${safeX}";\n\n`;
            } else if (y) {
              const safeY = y.replace(/"/g, '""');
              content += `SELECT ${agg}("${safeY}") AS "total_${safeY}" FROM "${safeTable}";\n\n`;
            } else {
              content += `SELECT * FROM "${safeTable}";\n\n`;
            }
          }
        }
        break;
      }

      default:
        throw new ReportExportError(`Unsupported export format: ${options.format}`, 'UNSUPPORTED_EXPORT_FORMAT');
    }

    if (options.outputPath) {
      writeFileSync(options.outputPath, content, 'utf-8');
    }

    const durationMs = Date.now() - startTime;

    return {
      format: options.format,
      content,
      byteSize: Buffer.byteLength(content, 'utf-8'),
      filePath: options.outputPath,
      durationMs,
    };
  }
}
