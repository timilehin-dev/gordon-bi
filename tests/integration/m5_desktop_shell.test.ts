import test from 'node:test';
import assert from 'node:assert/strict';
import { EngineBridge, AppStore, GridStore } from '@gordon/desktop-ui';
import { KeyVault } from '@gordon/core-engine';

test('Milestone 5 Acceptance Test - Desktop Shell, Spreadsheet Grid Formulas, & BYOK Key Vault', async () => {
  const startTime = Date.now();

  // 1. Initialize Engine Bridge
  const bridge = new EngineBridge(':memory:');
  await bridge.initialize();

  // 2. Test AppStore state management
  const appStore = new AppStore();
  assert.equal(appStore.getState().activeView, 'report');
  assert.equal(appStore.getState().theme, 'dark');

  appStore.setActiveView('data');
  assert.equal(appStore.getState().activeView, 'data');

  appStore.setLoadedTables(['orders', 'customers', 'products']);
  assert.equal(appStore.getState().loadedTables.length, 3);
  assert.equal(appStore.getState().selectedTable, 'orders');

  // 3. Test GridStore & Formula Evaluation
  const gridStore = new GridStore();
  const sampleRows = [
    { id: 1, product: 'Widget A', revenue: 100, cost: 40 },
    { id: 2, product: 'Widget B', revenue: 250, cost: 90 },
    { id: 3, product: 'Widget C', revenue: 400, cost: 150 },
  ];
  gridStore.setTableData('orders', ['id', 'product', 'revenue', 'cost'], sampleRows);

  assert.equal(gridStore.getRows().length, 3);
  assert.equal(gridStore.getColumns().length, 4);

  // Test cell update with case-insensitive formula: =[Revenue] - [Cost]
  gridStore.updateCell(0, 'profit', 0, '=[Revenue] - [Cost]');
  const updatedRows = gridStore.getRows();
  assert.equal(updatedRows[0].profit, 60);

  // Test division by zero formula protection
  const divZeroVal = gridStore.evaluateFormula('=[Revenue] / 0', sampleRows[0]);
  assert.equal(divZeroVal, 0);

  // Test Promote to Transformation Step
  const step = gridStore.promoteToTransformationStep('Profit Calculation', '=[revenue] - [cost]');
  assert.equal(step.name, 'Profit Calculation');
  assert.equal(gridStore.getTransformations().length, 1);

  // 4. Test KeyVault BYOK & Model Routing
  const keyVault = new KeyVault();
  keyVault.setProviderCredentials({
    provider: 'anthropic',
    apiKey: 'sk-ant-test-token-12345',
    isConfigured: true,
  });

  const creds = keyVault.getProviderCredentials('anthropic');
  assert.ok(creds);
  assert.equal(creds.isConfigured, true);
  assert.equal(creds.apiKey, 'sk-ant-test-token-12345');

  // Check agent model routing
  const criticRoute = keyVault.getAgentRoute('critic_verifier_agent');
  assert.equal(criticRoute.provider, 'anthropic');
  assert.equal(criticRoute.temperature, 0.0);

  const exportedVault = keyVault.exportConfig();
  assert.equal(exportedVault.providers.anthropic.apiKey, '********'); // Masked

  const durationMs = Date.now() - startTime;
  console.log(`[M5 Benchmark] Shell, Grid, and BYOK Verification Duration: ${durationMs}ms`);

  await bridge.close();
});
