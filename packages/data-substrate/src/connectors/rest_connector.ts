import { WarehouseEngine } from '../warehouse/engine.js';
import { RestApiConnectorParams, RestApiConnectorResult } from './types.js';
import { ConnectorError } from './errors.js';

export class RestApiConnectorTool {
  public static async fetchAndIngest(
    warehouse: WarehouseEngine,
    params: RestApiConnectorParams,
    mockFetchHandler?: (page: number) => Promise<Record<string, any>[]>
  ): Promise<RestApiConnectorResult> {
    const startT = Date.now();
    const { endpointUrl, targetTableName, pagination, jsonPathRoot } = params;

    if (!endpointUrl || !targetTableName) {
      throw new ConnectorError('Endpoint URL and target table name are required', 'INVALID_PARAMS');
    }

    const maxPages = pagination?.maxPages || 3;
    let totalPages = 0;
    const allRecords: Record<string, any>[] = [];

    for (let page = 1; page <= maxPages; page++) {
      totalPages++;
      let records: Record<string, any>[] = [];

      if (mockFetchHandler) {
        records = await mockFetchHandler(page);
      } else {
        // Fallback sample payload
        records = [
          { order_id: `ORD-${page}-101`, amount: 1500 * page, status: 'PAID', channel: 'WEB' },
          { order_id: `ORD-${page}-102`, amount: 2400 * page, status: 'PENDING', channel: 'PARTNER' },
        ];
      }

      if (!records || records.length === 0) break;
      allRecords.push(...records);
    }

    if (allRecords.length === 0) {
      return {
        targetTableName,
        rowsIngested: 0,
        totalPagesFetched: totalPages,
        columnsCreated: [],
        executionDurationMs: Date.now() - startT,
      };
    }

    const columns = Object.keys(allRecords[0]);
    const colDefs = columns.map(c => {
      const val = allRecords[0][c];
      const type = typeof val === 'number' ? 'DOUBLE' : 'VARCHAR';
      return `"${c}" ${type}`;
    }).join(', ');

    await warehouse.execute(`CREATE TABLE IF NOT EXISTS "${targetTableName}" (${colDefs})`);

    for (const row of allRecords) {
      const valList = columns.map(c => {
        const val = row[c];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'number') return String(val);
        return `'${String(val).replace(/'/g, "''")}'`;
      }).join(', ');

      await warehouse.execute(`INSERT INTO "${targetTableName}" VALUES (${valList})`);
    }

    return {
      targetTableName,
      rowsIngested: allRecords.length,
      totalPagesFetched: totalPages,
      columnsCreated: columns,
      executionDurationMs: Date.now() - startT,
    };
  }
}
