import test from 'node:test';
import assert from 'node:assert/strict';
import { WarehouseEngine, RelationshipGraph, DaxEvaluator } from '@gordon/data-substrate';
import { WorkspaceBundlerTool, WorkspaceExportData } from '@gordon/core-engine';

test('Milestone 13 Acceptance Test - Portable .gordon Workspace Bundles & Advanced DAX Formula Engine', async () => {
  const startTime = Date.now();

  const warehouse = new WarehouseEngine({ dbPath: ':memory:' });
  await warehouse.initialize();

  // Seed sample sales data in DuckDB
  await warehouse.execute(`
    CREATE TABLE "Sales" (
      "OrderID" VARCHAR,
      "Region" VARCHAR,
      "Quantity" DOUBLE,
      "UnitPrice" DOUBLE
    );
  `);
  await warehouse.execute(`
    INSERT INTO "Sales" VALUES
      ('ORD-1', 'EMEA', 10.0, 150.0),
      ('ORD-2', 'EMEA', 5.0, 200.0),
      ('ORD-3', 'APAC', 20.0, 120.0),
      ('ORD-4', 'NAM', 15.0, 180.0);
  `);

  const relationships = new RelationshipGraph(warehouse);

  // 1. Test DAX Formula Engine
  // Test A: Simple SUM
  const sumDax = await DaxEvaluator.evaluate(warehouse, relationships, 'SUM([Quantity])', {
    activeTable: 'Sales',
  });
  assert.equal(sumDax.result, 50.0);

  // Test B: CALCULATE(SUM([Quantity]), [Region] = 'EMEA')
  const calcDax = await DaxEvaluator.evaluate(
    warehouse,
    relationships,
    "CALCULATE(SUM([Quantity]), [Region] = 'EMEA')",
    { activeTable: 'Sales' }
  );
  assert.equal(calcDax.result, 15.0);

  // Test C: SUMX(Sales, [Quantity] * [UnitPrice])
  const sumxDax = await DaxEvaluator.evaluate(
    warehouse,
    relationships,
    'SUMX(Sales, [Quantity] * [UnitPrice])',
    { activeTable: 'Sales' }
  );
  // (10*150) + (5*200) + (20*120) + (15*180) = 1500 + 1000 + 2400 + 2700 = 7600
  assert.equal(sumxDax.result, 7600.0);

  // Test D: COUNTROWS(Sales)
  const countRowsDax = await DaxEvaluator.evaluate(warehouse, relationships, 'COUNTROWS(Sales)', {
    activeTable: 'Sales',
  });
  assert.equal(countRowsDax.result, 4);

  // 2. Test Portable .gordon Workspace Archive Bundler
  const exportData: WorkspaceExportData = {
    manifest: {
      version: '1.0.0',
      projectName: 'Q3 Enterprise Analytics',
      author: 'Root Business Analyst',
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now(),
      tablesCount: 1,
      documentsCount: 1,
      visualsCount: 2,
      checksum: '',
    },
    duckdbTables: {
      RestoredSales: {
        schema: '"id" VARCHAR, "amount" DOUBLE',
        rows: [
          { id: 'S1', amount: 1000.0 },
          { id: 'S2', amount: 2500.0 },
        ],
      },
    },
    documents: [
      {
        id: 'doc_strategy',
        title: 'Q3 Growth Strategy.pdf',
        chunks: [{ chunkId: 'c1', content: 'Enterprise revenue target is $10M', page: 1 }],
      },
    ],
    canvasSpec: {
      title: 'Executive Dashboard',
      layout: [
        { id: 'card_1', x: 0, y: 0, w: 6, h: 4, cardType: 'chart', config: { type: 'bar' } },
        { id: 'card_2', x: 6, y: 0, w: 6, h: 4, cardType: 'kpi', config: { metric: 'NDR' } },
      ],
    },
    lineageAuditRecords: [
      { id: 'rec_1', taskName: 'Ingest', toolName: 'csv_profile_load', durationMs: 12, status: 'verified' },
    ],
    appSettings: {
      theme: 'dark',
      autoAnalyzeOnLoad: true,
    },
  };

  // Pack
  const { archiveBuffer, packResult } = WorkspaceBundlerTool.pack(exportData, 'c:/Users/HP/Downloads/q3_project.gordon');
  assert.ok(archiveBuffer.byteLength > 100);
  assert.equal(packResult.manifest.projectName, 'Q3 Enterprise Analytics');
  assert.ok(packResult.manifest.checksum.length > 0);

  // Unpack into fresh memory warehouse
  const freshWarehouse = new WarehouseEngine({ dbPath: ':memory:' });
  await freshWarehouse.initialize();

  const { data: unpackedData, unpackResult } = await WorkspaceBundlerTool.unpack(archiveBuffer, freshWarehouse);
  assert.equal(unpackResult.manifest.projectName, 'Q3 Enterprise Analytics');
  assert.equal(unpackResult.restoredTables.length, 1);
  assert.equal(unpackResult.restoredTables[0], 'RestoredSales');
  assert.equal(unpackResult.restoredDocuments.length, 1);
  assert.equal(unpackResult.restoredVisualsCount, 2);

  // Verify restored data inside DuckDB
  const restoredCheck = await freshWarehouse.execute('SELECT COUNT(*) AS c, SUM(amount) AS total FROM "RestoredSales"');
  assert.equal(Number(restoredCheck.rows[0].c), 2);
  assert.equal(restoredCheck.rows[0].total, 3500.0);

  await warehouse.close();
  await freshWarehouse.close();

  const durationMs = Date.now() - startTime;
  console.log(`[M13 Benchmark] Workspace Bundles & DAX Engine Suite Duration: ${durationMs}ms`);
});
