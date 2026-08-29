import { readFileSync, existsSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { WarehouseEngine } from '../../warehouse/engine.js';
import { IngestionOptions, StructuredIngestionResult } from '../types.js';
import { IngestionError } from '../errors.js';

export class JsonIngestionFlattener {
  private warehouse: WarehouseEngine;

  constructor(warehouse: WarehouseEngine) {
    this.warehouse = warehouse;
  }

  public async parseAndLoad(filePath: string, options: IngestionOptions = {}): Promise<StructuredIngestionResult> {
    if (!existsSync(filePath)) {
      throw new IngestionError(`JSON file not found: ${filePath}`, 'FILE_NOT_FOUND', filePath);
    }

    const startTime = Date.now();
    const nameWithoutExt = basename(filePath, extname(filePath));
    const tableName = options.tableName || nameWithoutExt.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase().replace(/^_+|_+$/g, '');

    try {
      const rawContent = readFileSync(filePath, 'utf-8');
      let records: any[] = [];

      // Check if JSONL or standard JSON
      if (filePath.endsWith('.jsonl')) {
        const lines = rawContent.split(/\r?\n/).filter(l => l.trim().length > 0);
        records = lines.map(l => JSON.parse(l));
      } else {
        const parsed = JSON.parse(rawContent);
        if (Array.isArray(parsed)) {
          records = parsed;
        } else if (typeof parsed === 'object' && parsed !== null) {
          // If object contains an array property (e.g. { data: [...] } or { items: [...] })
          const arrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
          if (arrayKey) {
            records = parsed[arrayKey];
          } else {
            records = [parsed];
          }
        }
      }

      if (records.length === 0) {
        throw new IngestionError('JSON contains no records to ingest', 'EMPTY_JSON', filePath);
      }

      // Flatten each record recursively
      const flattenedRecords = records.map(r => this.flattenObject(r));

      // Collect all unique keys
      const allKeys = Array.from(new Set(flattenedRecords.flatMap(r => Object.keys(r))));
      const safeKeys = allKeys.map(k => k.replace(/[^a-zA-Z0-9_]/g, '_'));
      const keyMap: Record<string, string> = {};
      allKeys.forEach((k, i) => { keyMap[k] = safeKeys[i]; });

      // Create table
      const createCols = safeKeys.map(k => `"${k}" VARCHAR`).join(', ');
      await this.warehouse.execute(`DROP TABLE IF EXISTS "${tableName}"`);
      await this.warehouse.execute(`CREATE TABLE "${tableName}" (${createCols})`);

      // Insert rows
      const batchSize = 250;
      for (let i = 0; i < flattenedRecords.length; i += batchSize) {
        const batch = flattenedRecords.slice(i, i + batchSize);
        const valueClauses = batch.map(row => {
          const formatted = allKeys.map(k => {
            const val = row[k];
            if (val === undefined || val === null) return 'NULL';
            const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
            return `'${valStr.replace(/'/g, "''")}'`;
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
        rowCount: flattenedRecords.length,
        columnCount: safeKeys.length,
        columns: schema.columns,
        durationMs,
      };
    } catch (err: any) {
      if (err instanceof IngestionError) throw err;
      throw new IngestionError(`JSON ingestion failed: ${err.message}`, 'JSON_PARSE_ERROR', filePath, err);
    }
  }

  private flattenObject(obj: any, prefix = ''): Record<string, any> {
    const flattened: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const propName = prefix ? `${prefix}_${key}` : key;

      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(flattened, this.flattenObject(value, propName));
      } else if (Array.isArray(value)) {
        flattened[propName] = JSON.stringify(value);
      } else {
        flattened[propName] = value;
      }
    }

    return flattened;
  }
}
