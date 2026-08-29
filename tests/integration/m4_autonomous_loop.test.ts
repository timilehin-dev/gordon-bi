import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WarehouseEngine, LineageStore, DocumentStore } from '@gordon/data-substrate';
import { AutonomousExecutionLoop } from '@gordon/core-engine';

test('Milestone 4 Acceptance Test - Unattended End-to-End Autonomous Loop Execution', async () => {
  const testDir = join(tmpdir(), `gordon_m4_test_${Date.now()}`);
  mkdirSync(testDir, { recursive: true });

  const warehouse = new WarehouseEngine({ dbPath: ':memory:' });
  const lineageStore = new LineageStore({ dbPath: ':memory:' });
  const docStore = new DocumentStore({ dbPath: ':memory:' });
  await warehouse.initialize();

  // 1. Create mixed business data files
  const csvFile = join(testDir, 'financial_series.csv');
  writeFileSync(
    csvFile,
    `month_index,revenue,opex
1,100,45
2,110,48
3,120,47
4,130,50
5,140,46
6,150,195
7,160,52
8,170,49
9,180,51
10,190,53
11,200,50
12,210,54`
  );

  const mdFile = join(testDir, 'financial_highlights.md');
  writeFileSync(
    mdFile,
    `# Financial Highlights
Secular growth in SaaS subscription revenue remained steady across all 12 months.
Operational expenditure had an anomalous infrastructure spike in Month 6 due to data migration.`
  );

  const autonomousLoop = new AutonomousExecutionLoop(warehouse, lineageStore, docStore);

  const startMem = process.memoryUsage();
  const startTime = Date.now();

  // 2. Execute full autonomous loop with high-level business goal
  const result = await autonomousLoop.run({
    businessGoal: 'Forecast quarterly revenue trajectory, scan for risk anomalies, and synthesize an executive report',
    sourceFiles: [csvFile, mdFile],
    targetTableName: 'financial_series',
    metricColumn: 'revenue',
  });

  const durationMs = Date.now() - startTime;
  const endMem = process.memoryUsage();
  const rssDeltaMb = (endMem.rss - startMem.rss) / (1024 * 1024);
  const totalRssMb = endMem.rss / (1024 * 1024);

  console.log(`[M4 Benchmark] Autonomous Loop Duration: ${durationMs}ms, Memory Delta: ${rssDeltaMb.toFixed(2)} MB, Total RSS: ${totalRssMb.toFixed(2)} MB`);

  // 3. Verify Autonomous Plan & Decomposition
  assert.ok(result.plan.tasks.length >= 4);
  assert.ok(result.plan.tasks.some(t => t.id === 'task_forecasting'));
  assert.ok(result.plan.tasks.some(t => t.id === 'task_anomaly_scan'));
  assert.ok(result.plan.tasks.some(t => t.id === 'task_critic_verification'));

  // 4. Verify Profiles & Ingestion
  assert.ok(result.profiles.length >= 1);
  const finProfile = result.profiles.find(p => p.tableName === 'financial_series');
  assert.ok(finProfile);
  assert.equal(finProfile.totalRows, 12);

  // 5. Verify Executive Report Synthesized
  assert.ok(result.executiveReport.fullMarkdown.includes('Executive Analytics Report'));
  assert.ok(result.executiveReport.fullMarkdown.includes('Predictive Forecast'));
  assert.ok(result.executiveReport.totalCitations >= 1);

  console.log('Critic Audit Report:', JSON.stringify(result.criticAudit, null, 2));

  // 6. Verify Critic / Verifier QA Audit
  assert.equal(result.isVerifiedAndApproved, true, 'Report must be approved by Critic QA');
  assert.equal(result.criticAudit.unsupportedCount, 0, 'Zero unsupported claims permitted');
  assert.equal(result.criticAudit.inconsistentCount, 0, 'Zero inconsistent claims permitted');
  assert.equal(result.criticAudit.auditPassRate, 1.0, '100% verification pass rate required');

  // Verify non-functional budgets
  assert.ok(durationMs < 10000, `Execution latency (${durationMs}ms) must be under 10s`);
  assert.ok(totalRssMb < 250, `RSS Memory (${totalRssMb} MB) must remain under budget`);

  // Cleanup
  await warehouse.close();
  lineageStore.close();
  docStore.close();
  rmSync(testDir, { recursive: true, force: true });
});
