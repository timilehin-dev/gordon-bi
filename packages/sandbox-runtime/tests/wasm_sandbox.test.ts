import test from 'node:test';
import assert from 'node:assert/strict';
import { AdHocCodeSandbox } from '../src/wasm/executor.js';
import { PythonCodeSandbox } from '../src/python/executor.js';

test('AdHocCodeSandbox - default 120s timeout and analytical helper libraries', async () => {
  const sandbox = new AdHocCodeSandbox();
  assert.equal(sandbox.getDefaultTimeoutMs(), 120000, 'Default timeout must be 120s');

  const code = `
    console.log("Starting data transformation...");
    const values = inputs.values;
    const mean = Stats.mean(values);
    const stdDev = Stats.stdDev(values);
    const movingAvg = Stats.movingAverage(values, 3);
    
    console.info("Calculated mean:", mean);
    
    return {
      mean,
      stdDev: Number(stdDev.toFixed(2)),
      movingAvg,
      count: values.length
    };
  `;

  const result = await sandbox.runSnippet<{ mean: number; stdDev: number; movingAvg: number[]; count: number }>(code, {
    values: [10, 20, 30, 40, 50],
  });

  assert.equal(result.success, true);
  assert.equal(result.result?.mean, 30);
  assert.equal(result.result?.stdDev, 15.81);
  assert.deepEqual(result.result?.movingAvg, [20, 30, 40]);
  assert.equal(result.logs.length, 2);
  assert.equal(result.logs[0].message, 'Starting data transformation...');
});

test('AdHocCodeSandbox - DataOps grouping and sorting', async () => {
  const sandbox = new AdHocCodeSandbox();

  const code = `
    const records = inputs.records;
    const grouped = DataOps.groupBy(records, 'region');
    const sorted = DataOps.sortBy(records, 'sales', 'desc');
    return { grouped, topSale: sorted[0] };
  `;

  const records = [
    { region: 'East', sales: 100 },
    { region: 'West', sales: 250 },
    { region: 'East', sales: 150 },
  ];

  const result = await sandbox.runSnippet<{ grouped: Record<string, any[]>; topSale: any }>(code, { records });
  assert.equal(result.success, true);
  assert.equal(result.result?.grouped['East'].length, 2);
  assert.equal(result.result?.topSale.sales, 250);
});

test('AdHocCodeSandbox - terminate on infinite loop timeout with custom limit', async () => {
  const sandbox = new AdHocCodeSandbox();

  const infiniteLoopCode = `
    while (true) {}
  `;

  const result = await sandbox.runSnippet(infiniteLoopCode, {}, { timeoutMs: 100 });
  assert.equal(result.success, false);
  assert.ok(result.error?.includes('timed out'));
});

test('PythonCodeSandbox - execute Python analytical snippet with JSON output', async () => {
  const pySandbox = new PythonCodeSandbox();

  const pyCode = `
values = inputs.get('values', [])
mean_val = sum(values) / len(values) if values else 0
variance = sum((x - mean_val) ** 2 for x in values) / (len(values) - 1) if len(values) > 1 else 0
std_dev = math.sqrt(variance)

export_result({
    "count": len(values),
    "mean": mean_val,
    "std_dev": round(std_dev, 2)
})
`;

  const result = await pySandbox.runSnippet<{ count: number; mean: number; std_dev: number }>(pyCode, {
    values: [100, 200, 300, 400],
  });

  assert.equal(result.success, true);
  assert.equal(result.result?.count, 4);
  assert.equal(result.result?.mean, 250);
  assert.equal(result.result?.std_dev, 129.1);
});
