import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  WarehouseEngine,
  DocumentStore,
  UnifiedIngestionPipeline,
  TableProfiler,
  RelationshipGraph,
  MeasureEngine,
  UnifiedQueryBroker,
} from '@gordon/data-substrate';

test('Milestone 2 Acceptance Test - Unified Ingestion, Schema Profiling, & Semantic Modeling', async () => {
  const testDir = join(tmpdir(), `gordon_m2_test_${Date.now()}`);
  mkdirSync(testDir, { recursive: true });

  const warehouse = new WarehouseEngine({ dbPath: ':memory:' });
  const docStore = new DocumentStore({ dbPath: ':memory:' });
  await warehouse.initialize();

  // 1. Create sample multi-format business files
  const csvFile = join(testDir, 'customer_orders.csv');
  writeFileSync(
    csvFile,
    `order_id,customer_name,email,order_amount,order_date
101,John Doe,john.doe@example.com,250.50,2026-03-01
102,Jane Smith,jane.smith@example.com,480.00,2026-03-02
103,Alice Johnson,alice@example.com,1250.75,2026-03-03
104,Bob Brown,bob.brown@example.com,310.20,2026-03-04`
  );

  const jsonFile = join(testDir, 'products.json');
  writeFileSync(
    jsonFile,
    JSON.stringify([
      { product_id: 'P1', name: 'Cloud Analytics Pro', category: 'Software', base_price: 199.99 },
      { product_id: 'P2', name: 'Database Vector Accelerator', category: 'Infrastructure', base_price: 499.00 },
      { product_id: 'P3', name: 'Enterprise BI Connector', category: 'Software', base_price: 299.50 },
    ])
  );

  const mdFile = join(testDir, 'q1_business_review.md');
  writeFileSync(
    mdFile,
    `# Q1 2026 Business Review

## Financial Performance
Enterprise revenue grew by 32% quarter-over-quarter driven by Cloud Analytics adoption.
Average deal size expanded from $12,000 to $18,500.

## Customer Growth
Total active customer accounts reached 1,420 with net retention rate at 118%.
The highest performing segment was the mid-market SaaS tier.

## Risk & Anomalies
Customer support ticket volume spiked in late February following the v2.1 deployment.`
  );

  // 2. Ingest multi-format bundle via UnifiedIngestionPipeline
  const pipeline = new UnifiedIngestionPipeline(warehouse, docStore);
  const ingestionResult = await pipeline.ingestBatch([csvFile, jsonFile, mdFile]);

  assert.equal(ingestionResult.totalFilesProcessed, 3);
  assert.equal(ingestionResult.structured.length, 2);
  assert.equal(ingestionResult.unstructured.length, 1);

  // Verify DuckDB tables exist
  const tables = await warehouse.getTables();
  assert.ok(tables.includes('customer_orders'));
  assert.ok(tables.includes('products'));

  // 3. Schema Profiling & PII Detection
  const profiler = new TableProfiler(warehouse);
  const ordersProfile = await profiler.profileTable('customer_orders');

  assert.equal(ordersProfile.totalRows, 4);
  assert.equal(ordersProfile.totalColumns, 5);
  assert.equal(ordersProfile.hasPii, true, 'Must detect email PII');

  const emailCol = ordersProfile.columns.find(c => c.columnName === 'email');
  assert.ok(emailCol);
  assert.equal(emailCol.semanticType, 'contact:email');
  assert.equal(emailCol.piiRisk?.piiType, 'email');

  const amountCol = ordersProfile.columns.find(c => c.columnName === 'order_amount');
  assert.ok(amountCol);
  assert.equal(amountCol.semanticType, 'numeric:currency');
  assert.ok(amountCol.mean && amountCol.mean > 500);

  // 4. Semantic Modeling: Relationship Graph & Measures
  const relGraph = new RelationshipGraph(warehouse);
  const measureEngine = new MeasureEngine(warehouse);

  // Register business measure: Total Order Value
  measureEngine.registerMeasure({
    name: 'Total Order Value',
    displayName: 'Total Revenue ($)',
    tableName: 'customer_orders',
    aggregation: 'SUM',
    expression: 'SUM(order_amount)',
  });

  // Evaluate measure
  const measureResult = await measureEngine.evaluateMeasure('Total Order Value');
  assert.equal(measureResult.rowCount, 1);
  const totalRev = measureResult.rows[0]['Total Order Value'];
  assert.ok(Math.abs(totalRev - 2291.45) < 0.01);

  // 5. Unified Query Broker (Structured SQL + Cited Document Search)
  const broker = new UnifiedQueryBroker(warehouse, docStore, relGraph, measureEngine);

  // Hybrid query: query SQL order stats and search strategy document
  const hybridResult = await broker.hybridQuery(
    'SELECT COUNT(*) as total_orders, AVG(order_amount) as avg_order FROM customer_orders',
    'enterprise revenue retention'
  );

  assert.equal(hybridResult.queryType, 'hybrid');
  assert.equal(Number(hybridResult.structuredData?.rows[0].total_orders), 4);
  assert.ok(hybridResult.documentResults && hybridResult.documentResults.length >= 1);
  assert.ok(hybridResult.documentResults[0].chunk.content.includes('revenue grew by 32%'));
  assert.ok(hybridResult.documentResults[0].citationText.includes('q1_business_review.md'));

  // Cleanup
  await warehouse.close();
  docStore.close();
  rmSync(testDir, { recursive: true, force: true });
});
