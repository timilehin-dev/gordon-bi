import { readFileSync, existsSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { WarehouseEngine } from '../../warehouse/engine.js';
import { IngestionOptions, StructuredIngestionResult } from '../types.js';
import { IngestionError } from '../errors.js';

export class CsvIngestionParser {
  private warehouse: WarehouseEngine;

  constructor(warehouse: WarehouseEngine) {
    this.warehouse = warehouse;
  }

  public async parseAndLoad(filePath: string, options: IngestionOptions = {}): Promise<StructuredIngestionResult> {
    if (!existsSync(filePath)) {
      throw new IngestionError(`CSV file not found: ${filePath}`, 'FILE_NOT_FOUND', filePath);
    }

    const startTime = Date.now();
    const nameWithoutExt = basename(filePath, extname(filePath));
    const tableName = options.tableName || nameWithoutExt.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase().replace(/^_+|_+$/g, '');

    try {
      const rawContent = readFileSync(filePath, 'utf-8');
      const lines = rawContent.split(/\r?\n/).filter(l => l.trim().length > 0);

      if (lines.length === 0) {
        throw new IngestionError('CSV file is empty', 'EMPTY_CSV_FILE', filePath);
      }

      // Auto-detect delimiter
      const firstLine = lines[0];
      const delimiter = options.delimiter || this.detectDelimiter(firstLine);

      // Parse headers
      const headers = this.parseLine(firstLine, delimiter).map(h => h.trim().replace(/[^a-zA-Z0-9_]/g, '_'));

      if (headers.length === 0) {
        throw new IngestionError('No headers detected in CSV file', 'INVALID_HEADERS', filePath);
      }

      // Parse data rows & infer types
      const dataRows = lines.slice(1).map(line => this.parseLine(line, delimiter));
      const columnTypes = this.inferColumnTypes(headers, dataRows);

      // Create DuckDB Table
      const createCols = headers.map(h => `"${h}" ${columnTypes[h] || 'VARCHAR'}`).join(', ');
      await this.warehouse.execute(`DROP TABLE IF EXISTS "${tableName}"`);
      await this.warehouse.execute(`CREATE TABLE "${tableName}" (${createCols})`);

      // Insert in batches
      const batchSize = 500;
      for (let i = 0; i < dataRows.length; i += batchSize) {
        const batch = dataRows.slice(i, i + batchSize);
        const valueClauses = batch.map(row => {
          const formatted = headers.map((h, colIdx) => {
            const rawVal = row[colIdx];
            return this.formatSqlValue(rawVal, columnTypes[h]);
          });
          return `(${formatted.join(', ')})`;
        }).join(', ');

        if (valueClauses.length > 0) {
          await this.warehouse.execute(`INSERT INTO "${tableName}" VALUES ${valueClauses}`);
        }
      }

      const durationMs = Date.now() - startTime;
      const schema = await this.warehouse.getTableSchema(tableName);

      return {
        sourcePath: filePath,
        tableName,
        rowCount: dataRows.length,
        columnCount: headers.length,
        columns: schema.columns,
        durationMs,
      };
    } catch (err: any) {
      if (err instanceof IngestionError) throw err;
      throw new IngestionError(`CSV parsing failed: ${err.message}`, 'CSV_PARSE_FAILED', filePath, err);
    }
  }

  private detectDelimiter(line: string): string {
    const candidates = [',', '\t', ';', '|'];
    let bestDelimiter = ',';
    let maxCount = -1;

    for (const d of candidates) {
      const count = (line.match(new RegExp(`\\${d}`, 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = d;
      }
    }

    return bestDelimiter;
  }

  private parseLine(line: string, delimiter: string): string[] {
    const entries: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        // Escaped double-quote: "" -> "
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        entries.push(this.cleanCell(current));
        current = '';
      } else {
        current += char;
      }
    }
    entries.push(this.cleanCell(current));
    return entries;
  }

  private cleanCell(val: string): string {
    let trimmed = val.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
      trimmed = trimmed.slice(1, -1);
    }
    return trimmed;
  }

  private inferColumnTypes(headers: string[], rows: string[][]): Record<string, string> {
    const types: Record<string, string> = {};

    for (let colIdx = 0; colIdx < headers.length; colIdx++) {
      const header = headers[colIdx];
      let isInt = true;
      let isFloat = true;
      let isDate = true;
      let isBool = true;
      let hasNonEmpty = false;

      for (const row of rows) {
        const val = row[colIdx];
        if (val === undefined || val === '' || val === null || val === 'null' || val === 'NULL') {
          continue;
        }

        hasNonEmpty = true;

        if (!/^-?\d+$/.test(val)) isInt = false;
        if (!/^-?\d+(\.\d+)?$/.test(val)) isFloat = false;
        if (!/^(true|false|1|0|yes|no)$/i.test(val)) isBool = false;
        if (isNaN(Date.parse(val)) || !/^\d{4}[-/]\d{2}[-/]\d{2}/.test(val)) isDate = false;
      }

      if (!hasNonEmpty) {
        types[header] = 'VARCHAR';
      } else if (isInt) {
        types[header] = 'BIGINT';
      } else if (isFloat) {
        types[header] = 'DOUBLE';
      } else if (isBool) {
        types[header] = 'BOOLEAN';
      } else if (isDate) {
        types[header] = 'DATE';
      } else {
        types[header] = 'VARCHAR';
      }
    }

    return types;
  }

  private formatSqlValue(val: string | undefined, type: string): string {
    if (val === undefined || val === '' || val === null || val.toUpperCase() === 'NULL') {
      return 'NULL';
    }

    if (type === 'BIGINT' || type === 'INTEGER') {
      const num = parseInt(val, 10);
      return isNaN(num) ? 'NULL' : String(num);
    }

    if (type === 'DOUBLE' || type === 'FLOAT') {
      const num = parseFloat(val);
      return isNaN(num) ? 'NULL' : String(num);
    }

    if (type === 'BOOLEAN') {
      return /^(true|1|yes)$/i.test(val) ? 'TRUE' : 'FALSE';
    }

    // String / Date escaping
    return `'${val.replace(/'/g, "''")}'`;
  }
}
