import test from 'node:test';
import assert from 'node:assert/strict';
import { WarehouseEngine } from '@gordon/data-substrate';
import {
  KeyVault,
  ScalabilityBenchmarkRunner,
  CompetitiveMatrixAuditor,
} from '@gordon/core-engine';

test('Milestone 9 Acceptance Test - Large-Scale Scalability, Memory Security, & Final Competitive Matrix Sign-Off', async () => {
  const startTime = Date.now();

  // 1. Test KeyVault Memory Sanitization & Zeroing
  const keyVault = new KeyVault();
  keyVault.setProviderCredentials({
    provider: 'anthropic',
    apiKey: 'sk-ant-sensitive-api-token-999',
    isConfigured: true,
  });

  assert.equal(keyVault.getProviderCredentials('anthropic')?.apiKey, 'sk-ant-sensitive-api-token-999');

  // Clear memory
  keyVault.clearMemory();
  assert.equal(keyVault.getProviderCredentials('anthropic'), undefined);

  // 2. Test Large-Scale Scalability & Performance in DuckDB (50,000 rows)
  const warehouse = new WarehouseEngine({ dbPath: ':memory:' });
  await warehouse.initialize();

  const benchResult = await ScalabilityBenchmarkRunner.runBenchmark(warehouse, 50000);
  assert.equal(benchResult.rowCount, 50000);
  assert.ok(benchResult.ingestDurationMs > 0);
  assert.ok(benchResult.queryDurationMs < 2000, `Query duration ${benchResult.queryDurationMs}ms should be < 2000ms`);
  assert.ok(benchResult.throughputRowsPerSec > 10000, `Throughput ${benchResult.throughputRowsPerSec} rows/sec should be > 10k`);

  console.log(
    `[M9 Benchmark] DuckDB Scalability (${benchResult.rowCount} rows): Ingest=${benchResult.ingestDurationMs}ms, Query=${benchResult.queryDurationMs}ms, Throughput=${benchResult.throughputRowsPerSec} rows/sec, RSS=${benchResult.totalRssMb}MB`
  );

  await warehouse.close();

  // 3. Test Final Verification Against Section 2 Competitive Matrix
  const matrixAudit = CompetitiveMatrixAuditor.auditCapabilities();
  assert.equal(matrixAudit.overallCompliant, true);
  assert.equal(matrixAudit.items.length, 8);
  assert.ok(matrixAudit.items.every(i => i.isSupported));

  const durationMs = Date.now() - startTime;
  console.log(`[M9 Benchmark] Scalability, Security, & Competitive Audit Duration: ${durationMs}ms`);
});
