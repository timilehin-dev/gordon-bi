import { WarehouseEngine } from '@gordon/data-substrate';
import { SqlAgentQueryRequest, SqlAgentQueryResult } from './types.js';
import { SqlAgentError } from './errors.js';

export class SqlAgent {
  private warehouse: WarehouseEngine;

  constructor(warehouse: WarehouseEngine) {
    this.warehouse = warehouse;
  }

  public async query(request: SqlAgentQueryRequest): Promise<SqlAgentQueryResult> {
    const startTime = Date.now();
    const sql = this.translateNlToSql(request);

    // 1. Dry run validation
    const dryRunResult = await this.warehouse.dryRun(sql);
    if (!dryRunResult.isValid) {
      throw new SqlAgentError(`Generated SQL failed validation: ${dryRunResult.error}`, 'SQL_SYNTAX_ERROR', sql);
    }

    // 2. Execution
    const execResult = await this.warehouse.execute(sql);
    const executionTimeMs = Date.now() - startTime;

    return {
      generatedSql: sql,
      isValid: true,
      rows: execResult.rows,
      rowCount: execResult.rowCount,
      columns: execResult.columns,
      executionTimeMs,
      explanation: `Executed aggregation over table '${request.tableName}'`,
    };
  }

  private translateNlToSql(request: SqlAgentQueryRequest): string {
    const q = request.naturalLanguageQuery.toLowerCase();
    const table = `"${request.tableName}"`;
    const cols = request.tableColumns;

    // Find numeric and categorical columns
    const numericCols = cols.filter(c => c.type.includes('INT') || c.type.includes('DOUBLE') || c.type.includes('FLOAT') || c.type.includes('DECIMAL') || c.type.includes('BIGINT'));
    const textCols = cols.filter(c => c.type.includes('VARCHAR') || c.type.includes('TEXT'));

    const numCol = numericCols[0] ? `"${numericCols[0].name}"` : '*';
    const catCol = textCols[0] ? `"${textCols[0].name}"` : undefined;

    if (q.includes('total') || q.includes('sum')) {
      if (catCol && (q.includes('by') || q.includes('per'))) {
        return `SELECT ${catCol}, SUM(${numCol}) as total FROM ${table} GROUP BY ${catCol} ORDER BY total DESC`;
      }
      return `SELECT SUM(${numCol}) as total FROM ${table}`;
    }

    if (q.includes('average') || q.includes('avg') || q.includes('mean')) {
      if (catCol && (q.includes('by') || q.includes('per'))) {
        return `SELECT ${catCol}, AVG(${numCol}) as average FROM ${table} GROUP BY ${catCol} ORDER BY average DESC`;
      }
      return `SELECT AVG(${numCol}) as average FROM ${table}`;
    }

    if (q.includes('count') || q.includes('how many')) {
      if (catCol && (q.includes('by') || q.includes('per'))) {
        return `SELECT ${catCol}, COUNT(*) as count FROM ${table} GROUP BY ${catCol} ORDER BY count DESC`;
      }
      return `SELECT COUNT(*) as count FROM ${table}`;
    }

    if (q.includes('top') || q.includes('highest') || q.includes('best')) {
      return `SELECT * FROM ${table} ORDER BY ${numCol} DESC LIMIT 10`;
    }

    // Default SELECT
    return `SELECT * FROM ${table} LIMIT 50`;
  }
}
