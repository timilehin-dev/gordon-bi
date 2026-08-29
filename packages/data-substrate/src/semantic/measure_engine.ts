import { CalculatedMeasure, CalculatedColumn } from './types.js';
import { WarehouseEngine } from '../warehouse/engine.js';
import { SemanticModelError } from './errors.js';

export class MeasureEngine {
  private measures: Map<string, CalculatedMeasure> = new Map();
  private calculatedColumns: Map<string, CalculatedColumn> = new Map();
  private warehouse: WarehouseEngine;

  constructor(warehouse: WarehouseEngine) {
    this.warehouse = warehouse;
  }

  public registerMeasure(measure: Omit<CalculatedMeasure, 'id'>): CalculatedMeasure {
    const id = `measure_${measure.tableName}_${measure.name}`.toLowerCase();
    const fullMeasure: CalculatedMeasure = {
      id,
      ...measure,
    };
    this.measures.set(id, fullMeasure);
    return fullMeasure;
  }

  public async registerCalculatedColumn(calcCol: Omit<CalculatedColumn, 'id'>): Promise<CalculatedColumn> {
    const id = `col_${calcCol.tableName}_${calcCol.name}`.toLowerCase();
    const fullCol: CalculatedColumn = {
      id,
      ...calcCol,
    };

    // Add column to DuckDB table
    try {
      await this.warehouse.execute(`
        ALTER TABLE "${calcCol.tableName}" 
        ADD COLUMN "${calcCol.name}" ${calcCol.dataType};
      `);

      await this.warehouse.execute(`
        UPDATE "${calcCol.tableName}" 
        SET "${calcCol.name}" = (${calcCol.expression});
      `);

      this.calculatedColumns.set(id, fullCol);
      return fullCol;
    } catch (err: any) {
      throw new SemanticModelError(
        `Failed to register calculated column '${calcCol.name}' on table '${calcCol.tableName}': ${err.message}`,
        'CALCULATED_COLUMN_ERROR',
        err
      );
    }
  }

  public async evaluateMeasure(
    measureName: string,
    groupByColumns: string[] = [],
    whereClause = ''
  ): Promise<{ columns: string[]; rows: any[]; rowCount: number }> {
    const measure = Array.from(this.measures.values()).find(
      m => m.name.toLowerCase() === measureName.toLowerCase()
    );

    if (!measure) {
      throw new SemanticModelError(`Measure '${measureName}' not found in registry`, 'MEASURE_NOT_FOUND');
    }

    let sql = `SELECT `;
    if (groupByColumns.length > 0) {
      sql += groupByColumns.map(c => `"${c}"`).join(', ') + `, `;
    }

    sql += `${measure.expression} AS "${measure.name}" FROM "${measure.tableName}"`;

    if (whereClause.trim()) {
      sql += ` WHERE ${whereClause}`;
    }

    if (groupByColumns.length > 0) {
      sql += ` GROUP BY ` + groupByColumns.map(c => `"${c}"`).join(', ');
      sql += ` ORDER BY "${measure.name}" DESC`;
    }

    const result = await this.warehouse.execute(sql);
    return {
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
    };
  }

  public listMeasures(): CalculatedMeasure[] {
    return Array.from(this.measures.values());
  }

  public listCalculatedColumns(): CalculatedColumn[] {
    return Array.from(this.calculatedColumns.values());
  }
}
