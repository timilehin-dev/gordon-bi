import { WarehouseEngine } from '@gordon/data-substrate';
import { McpToolDescriptor } from '@gordon/shared-types';

export class LocalSqlMcpAdapter {
  private warehouse: WarehouseEngine;

  constructor(warehouse: WarehouseEngine) {
    this.warehouse = warehouse;
  }

  public getDescriptor(): McpToolDescriptor {
    return {
      name: 'sql_execute',
      description: 'Execute analytical SQL query against local DuckDB warehouse',
      inputSchema: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', description: 'SQL statement to execute' },
        },
      },
    };
  }

  public async execute(params: { query: string }): Promise<any> {
    const result = await this.warehouse.execute(params.query);
    return {
      rowCount: result.rowCount,
      columns: result.columns,
      rows: result.rows,
      executionTimeMs: result.executionTimeMs,
    };
  }
}
