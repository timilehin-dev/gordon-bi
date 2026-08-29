import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  WarehouseEngine,
  DocumentStore,
  LineageStore,
  UnifiedIngestionPipeline,
  PiiScanner,
  MeasureEngine,
} from '@gordon/data-substrate';
import {
  ToolRegistry,
  TimeSeriesForecasterTool,
  AnomalyDetectionTool,
} from '@gordon/tool-registry';
import { ClaimExtractor } from '@gordon/core-engine';

test('Phase 2 Edge Cases - RFC 4180 CSV Quotes, Zero-Variance Series, and Negative Number Citations', async () => {
  const testDir = join(tmpdir(), `gordon_edge_cases_${Date.now()}`);
  mkdirSync(testDir, { recursive: true });

  const warehouse = new WarehouseEngine({ dbPath: ':memory:' });
  const lineageStore = new LineageStore({ dbPath: ':memory:' });
  const docStore = new DocumentStore({ dbPath: ':memory:' });
  await warehouse.initialize();

  // 1. Edge Case: CSV with apostrophes, commas inside quotes, and escaped quotes
  const complexCsv = join(testDir, 'complex_quotes.csv');
  writeFileSync(
    complexCsv,
    `id,description,quote_text,cost
1,"John's Special Edition","He said ""Great deal!""",149.99
2,"Acme, Inc.","Standard ""Gold"" tier",299.50
3,"O'Reilly's Books","Special, limited offer",89.00`
  );

  const pipeline = new UnifiedIngestionPipeline(warehouse, docStore);
  const result = await pipeline.ingestFile(complexCsv);
  assert.ok(Array.isArray(result));
  assert.equal(result[0].rowCount, 3);

  const queryRows = await warehouse.execute('SELECT * FROM "complex_quotes" ORDER BY id');
  assert.equal(queryRows.rows[0].description, "John's Special Edition");
  assert.equal(queryRows.rows[0].quote_text, 'He said "Great deal!"');
  assert.equal(queryRows.rows[1].description, 'Acme, Inc.');

  // 2. Edge Case: Zero-variance constant series forecasting
  const session = lineageStore.createSession({ name: 'Edge Case Session', goal: 'Test zero-variance series' });
  const task = lineageStore.startTask({ sessionId: session.id, title: 'Forecast task', description: 'Test forecasting task', assignedAgentId: 'forecaster' });

  const forecasterHandle = new ToolRegistry(lineageStore);
  forecasterHandle.register(TimeSeriesForecasterTool);
  const scopedForecast = forecasterHandle.createScopedHandle('forecaster', ['ts_forecast_multimodel'], ['ml:forecast', 'stats:compute']);

  const constantSeries = [100, 100, 100, 100, 100];
  const forecastRes = await scopedForecast.invoke<any, any>(
    'ts_forecast_multimodel',
    { series: constantSeries, horizon: 3 },
    { sessionId: session.id, taskId: task.id, invokedAt: Date.now() }
  );

  assert.equal(forecastRes.success, true);
  assert.equal(forecastRes.data.trendSlope, 0);
  assert.equal(forecastRes.data.forecasts[0].forecast, 100);
  assert.ok(!isNaN(forecastRes.data.forecasts[0].lower80));
  assert.ok(!isNaN(forecastRes.data.forecasts[0].upper95));

  // 3. Edge Case: Zero-variance anomaly scanning
  forecasterHandle.register(AnomalyDetectionTool);
  const scopedAnomaly = forecasterHandle.createScopedHandle('anomaly', ['stat_anomaly_changepoint_scan'], ['ml:anomaly', 'stats:compute']);
  const anomalyRes = await scopedAnomaly.invoke<any, any>(
    'stat_anomaly_changepoint_scan',
    { series: constantSeries },
    { sessionId: session.id, taskId: task.id, invokedAt: Date.now() }
  );

  assert.equal(anomalyRes.success, true);
  assert.equal(anomalyRes.data.anomalyCount, 0);
  assert.equal(anomalyRes.data.baselineMean, 100);
  assert.equal(anomalyRes.data.baselineStdDev, 0);

  // 4. Edge Case: Negative numbers and currency claims in ClaimExtractor
  const sampleText = `
    1. Operational deficit deepened to -$45,200.50 [cite: tool_1].
    2. Conversion rate dropped by -14.5% during maintenance [cite: tool_2].
    3. Net slope adjustment was -8.25 across all units.
  `;

  const extracted = ClaimExtractor.extractClaims(sampleText);
  assert.ok(extracted.length >= 3);

  const negCurrency = extracted.find(c => c.claimType === 'currency');
  assert.ok(negCurrency);
  assert.equal(negCurrency.extractedNumber, -45200.50);

  const negPct = extracted.find(c => c.claimType === 'percentage');
  assert.ok(negPct);
  assert.equal(negPct.extractedNumber, -14.5);

  const negDec = extracted.find(c => c.claimType === 'decimal');
  assert.ok(negDec);
  assert.equal(negDec.extractedNumber, -8.25);

  // 5. Edge Case: PII Masking
  const piiRecord = PiiScanner.scanColumn('customer_phones', ['(555) 123-4567', '555-987-6543']);
  assert.ok(piiRecord);
  assert.equal(piiRecord.piiType, 'phone_number');
  assert.ok(piiRecord.sampleMatches[0].includes('***'));

  // Cleanup
  await warehouse.close();
  lineageStore.close();
  docStore.close();
  rmSync(testDir, { recursive: true, force: true });
});
