import { WarehouseEngine } from '../warehouse/engine.js';
import { TableProfile, ColumnProfile, SemanticColumnType } from './types.js';
import { PiiScanner } from './pii_scanner.js';
import { ProfilingError } from './errors.js';

export class TableProfiler {
  private warehouse: WarehouseEngine;

  constructor(warehouse: WarehouseEngine) {
    this.warehouse = warehouse;
  }

  public async profileTable(tableName: string): Promise<TableProfile> {
    const startTime = Date.now();
    const schema = await this.warehouse.getTableSchema(tableName);

    // Fetch table rows
    const dataResult = await this.warehouse.execute(`SELECT * FROM "${tableName}" LIMIT 5000`);
    const rows = dataResult.rows;
    const totalRows = rows.length;

    const columnProfiles: ColumnProfile[] = [];
    let tableHasPii = false;

    for (const col of schema.columns) {
      const values = rows.map(r => r[col.name]);
      const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
      const nullCount = totalRows - nonNullValues.length;
      const nullPercentage = totalRows ? Number(((nullCount / totalRows) * 100).toFixed(2)) : 0;

      const distinctSet = new Set(nonNullValues);
      const distinctCount = distinctSet.size;
      const distinctPercentage = nonNullValues.length ? Number(((distinctCount / nonNullValues.length) * 100).toFixed(2)) : 0;

      // Classify semantic type
      const semanticType = this.classifySemanticType(col.name, col.type, nonNullValues);

      // Check PII
      const piiRisk = PiiScanner.scanColumn(col.name, nonNullValues);
      if (piiRisk) tableHasPii = true;

      // Numeric stats if applicable
      let min: number | string | undefined;
      let max: number | string | undefined;
      let mean: number | undefined;
      let stdDev: number | undefined;

      const isNumeric = col.type.includes('INT') || col.type.includes('DOUBLE') || col.type.includes('FLOAT') || col.type.includes('DECIMAL') || col.type.includes('BIGINT');

      if (isNumeric && nonNullValues.length > 0) {
        const numValues = nonNullValues.map(Number).filter(n => !isNaN(n));
        if (numValues.length > 0) {
          min = Math.min(...numValues);
          max = Math.max(...numValues);
          const sum = numValues.reduce((a, b) => a + b, 0);
          mean = Number((sum / numValues.length).toFixed(4));
          const variance = numValues.reduce((acc, v) => acc + Math.pow(v - (mean || 0), 2), 0) / (numValues.length > 1 ? numValues.length - 1 : 1);
          stdDev = Number(Math.sqrt(variance).toFixed(4));
        }
      } else if (nonNullValues.length > 0) {
        const strValues = nonNullValues.map(String).sort();
        min = strValues[0];
        max = strValues[strValues.length - 1];
      }

      columnProfiles.push({
        columnName: col.name,
        dataType: col.type,
        semanticType,
        totalCount: totalRows,
        nullCount,
        nullPercentage,
        distinctCount,
        distinctPercentage,
        min,
        max,
        mean,
        stdDev,
        piiRisk,
        sampleValues: nonNullValues.slice(0, 5),
      });
    }

    const profilingDurationMs = Date.now() - startTime;

    return {
      tableName,
      totalRows,
      totalColumns: schema.columns.length,
      columns: columnProfiles,
      hasPii: tableHasPii,
      profilingDurationMs,
    };
  }

  private classifySemanticType(name: string, type: string, values: unknown[]): SemanticColumnType {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('id') || lowerName.endsWith('_pk') || lowerName.endsWith('_key')) {
      return 'identifier';
    }
    if (lowerName.includes('revenue') || lowerName.includes('price') || lowerName.includes('amount') || lowerName.includes('cost') || lowerName.includes('salary') || lowerName.includes('sales')) {
      return 'numeric:currency';
    }
    if (lowerName.includes('pct') || lowerName.includes('percent') || lowerName.includes('ratio') || lowerName.includes('rate')) {
      return 'numeric:percentage';
    }
    if (lowerName.includes('qty') || lowerName.includes('quantity') || lowerName.includes('count') || lowerName.includes('units')) {
      return 'numeric:quantity';
    }
    if (type.includes('DATE') || lowerName.includes('date') || lowerName.includes('day') || lowerName.includes('month')) {
      return 'temporal:date';
    }
    if (type.includes('TIME') || lowerName.includes('time') || lowerName.includes('created_at') || lowerName.includes('updated_at')) {
      return 'temporal:timestamp';
    }
    if (lowerName.includes('country') || lowerName.includes('nation')) {
      return 'geographic:country';
    }
    if (lowerName.includes('city') || lowerName.includes('town')) {
      return 'geographic:city';
    }
    if (lowerName.includes('zip') || lowerName.includes('postal')) {
      return 'geographic:zip';
    }
    if (lowerName.includes('email')) {
      return 'contact:email';
    }
    if (lowerName.includes('phone') || lowerName.includes('mobile')) {
      return 'contact:phone';
    }

    const uniqueCount = new Set(values).size;
    if (values.length > 0 && uniqueCount / values.length < 0.2) {
      return 'text:categorical';
    }

    return 'text:freeform';
  }
}
