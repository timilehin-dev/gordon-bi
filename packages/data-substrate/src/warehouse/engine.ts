import { WarehouseConfig, WarehouseQueryResult, WarehouseTableSchema } from './types.js';
import { WarehouseError } from './errors.js';

export class WarehouseEngine {
  private db: any = null;
  private isInitialized = false;
  private config: WarehouseConfig;

  constructor(config: WarehouseConfig = {}) {
    this.config = {
      dbPath: config.dbPath || ':memory:',
      maxMemoryMb: config.maxMemoryMb || 512,
      threads: config.threads || 4,
    };
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Dynamically load duckdb
      const duckdb = await import('duckdb');
      const Database = (duckdb.default as any)?.Database || (duckdb as any).Database;
      
      await new Promise<void>((resolve, reject) => {
        this.db = new Database(this.config.dbPath, (err: any) => {
          if (err) reject(new WarehouseError(`Failed to initialize DuckDB: ${err.message}`, 'DUCKDB_INIT_ERROR', err));
          else resolve();
        });
      });

      this.isInitialized = true;
    } catch (err: any) {
      throw new WarehouseError(`DuckDB Engine initialization failed: ${err.message}`, 'DUCKDB_LOAD_ERROR', err);
    }
  }

  public async execute<T = Record<string, unknown>>(sql: string): Promise<WarehouseQueryResult<T>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      this.db.all(sql, (err: any, rows: any[]) => {
        const executionTimeMs = Date.now() - startTime;
        if (err) {
          return reject(new WarehouseError(`Query execution error: ${err.message}`, 'QUERY_EXECUTION_ERROR', { sql, err }));
        }

        const sampleRow = rows && rows.length > 0 ? rows[0] : {};
        const columns = Object.keys(sampleRow);

        resolve({
          columns,
          rows: (rows || []) as T[],
          rowCount: rows ? rows.length : 0,
          executionTimeMs,
        });
      });
    });
  }

  public async dryRun(sql: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      await this.execute(`EXPLAIN ${sql}`);
      return { isValid: true };
    } catch (err: any) {
      return { isValid: false, error: err.message || String(err) };
    }
  }

  public async getTables(): Promise<string[]> {
    const result = await this.execute<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='main'"
    );
    return result.rows.map(r => r.table_name);
  }

  public async getTableSchema(tableName: string): Promise<WarehouseTableSchema> {
    const safeTableName = tableName.replace(/'/g, "''");
    const result = await this.execute<{ column_name: string; data_type: string; is_nullable: string }>(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='${safeTableName}'`
    );

    if (result.rows.length === 0) {
      throw new WarehouseError(`Table '${tableName}' not found`, 'TABLE_NOT_FOUND');
    }

    return {
      tableName,
      columns: result.rows.map(r => ({
        name: r.column_name,
        type: r.data_type,
        nullable: r.is_nullable === 'YES',
      })),
    };
  }

  public async close(): Promise<void> {
    if (this.db) {
      await new Promise<void>((resolve) => {
        this.db.close(() => {
          this.db = null;
          this.isInitialized = false;
          resolve();
        });
      });
    }
  }
}
