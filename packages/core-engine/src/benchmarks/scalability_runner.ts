import { WarehouseEngine } from '@gordon/data-substrate';
import { ScalabilityBenchmarkResult } from './types.js';

export class ScalabilityBenchmarkRunner {
  public static async runBenchmark(
    warehouse: WarehouseEngine,
    rowCount: number = 50000
  ): Promise<ScalabilityBenchmarkResult> {
    const startMemory = process.memoryUsage().rss;
    const ingestStart = Date.now();

    await warehouse.execute(`
      CREATE TABLE "benchmark_large_dataset" (
        id INTEGER,
        customer_region VARCHAR,
        product_category VARCHAR,
        revenue DOUBLE,
        cost DOUBLE,
        created_date DATE
      )
    `);

    // Ingest generated rows in batches using SQL range functions for high throughput
    await warehouse.execute(`
      INSERT INTO "benchmark_large_dataset"
      SELECT 
        range AS id,
        CASE WHEN range % 4 = 0 THEN 'North' WHEN range % 4 = 1 THEN 'South' WHEN range % 4 = 2 THEN 'East' ELSE 'West' END AS customer_region,
        CASE WHEN range % 3 = 0 THEN 'Software' WHEN range % 3 = 1 THEN 'Hardware' ELSE 'Services' END AS product_category,
        (range % 1000) * 1.5 + 50.0 AS revenue,
        (range % 500) * 0.8 + 20.0 AS cost,
        DATE '2026-01-01' + INTERVAL (range % 365) DAY AS created_date
      FROM range(${rowCount})
    `);

    const ingestDurationMs = Date.now() - ingestStart;

    // Execute analytical OLAP query
    const queryStart = Date.now();
    const queryResult = await warehouse.execute(`
      SELECT 
        customer_region,
        product_category,
        COUNT(*) AS total_transactions,
        SUM(revenue) AS total_revenue,
        AVG(revenue - cost) AS avg_profit,
        STDDEV(revenue) AS revenue_stddev
      FROM "benchmark_large_dataset"
      GROUP BY customer_region, product_category
      ORDER BY total_revenue DESC
    `);

    const queryDurationMs = Date.now() - queryStart;
    const endMemory = process.memoryUsage().rss;

    const memoryDeltaMb = Number(((endMemory - startMemory) / (1024 * 1024)).toFixed(2));
    const totalRssMb = Number((endMemory / (1024 * 1024)).toFixed(2));
    const throughputRowsPerSec = Math.round((rowCount / Math.max(1, ingestDurationMs)) * 1000);

    return {
      rowCount,
      ingestDurationMs,
      queryDurationMs,
      memoryDeltaMb,
      totalRssMb,
      throughputRowsPerSec,
    };
  }
}
