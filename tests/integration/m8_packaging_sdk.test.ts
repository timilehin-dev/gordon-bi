import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GordonPlugin, MockPluginHost } from '@gordon/node-plugin-sdk';
import { CleanMachineAuditor } from '@gordon/core-engine';
import { PluginManifest } from '@gordon/sandbox-runtime';

// Define sample community plugin using Node Plugin SDK
class CohortRetentionPlugin extends GordonPlugin {
  public readonly manifest: PluginManifest = {
    id: 'community_cohort_retention',
    name: 'Customer Cohort Retention Analyzer',
    version: '1.0.0',
    description: 'Computes multi-period cohort retention curves and churn rates.',
    runtime: 'node',
    entryPoint: 'index.js',
    author: { name: 'SaaS Metrics Collective' },
    permissions: [
      { category: 'query', scope: 'table:users', description: 'Read user signup timestamps', required: true },
    ],
    tools: [
      {
        name: 'compute_cohort_retention',
        displayName: 'Cohort Retention Matrix',
        description: 'Calculates percentage retention by month',
      },
    ],
  };

  constructor() {
    super();
    this.registerTool({
      name: 'compute_cohort_retention',
      displayName: 'Cohort Retention Matrix',
      description: 'Calculates percentage retention by month',
      execute: async (params, context) => {
        context.log('Analyzing cohort retention metrics...');
        const data = await context.queryTable('SELECT * FROM "users"');
        const count = data.rowCount;
        return {
          cohortPeriod: params.period || 'monthly',
          totalUsersAnalyzed: count,
          retentionRates: [1.0, 0.72, 0.58, 0.49],
          averageLifetimeMonths: 14.2,
        };
      },
    });
  }
}

test('Milestone 8 Acceptance Test - Node/Python Plugin SDKs & Clean-Machine Packaging Audit', async () => {
  const startTime = Date.now();

  // 1. Test Node Plugin SDK with Mock Host
  const plugin = new CohortRetentionPlugin();
  assert.equal(plugin.manifest.id, 'community_cohort_retention');
  assert.equal(plugin.listTools().length, 1);

  const mockHost = new MockPluginHost({
    mockTables: {
      users: [
        { id: 1, signup_date: '2026-01-01', active: true },
        { id: 2, signup_date: '2026-01-05', active: true },
        { id: 3, signup_date: '2026-01-12', active: false },
      ],
    },
  });

  const result = await mockHost.runTool(plugin, 'compute_cohort_retention', { period: 'monthly' });
  assert.equal(result.totalUsersAnalyzed, 3);
  assert.deepEqual(result.retentionRates, [1.0, 0.72, 0.58, 0.49]);
  assert.ok(mockHost.logs.some(l => l.includes('Analyzing cohort retention metrics...')));

  // 2. Test Python Plugin SDK structure
  const pythonSdkDir = join(process.cwd(), 'packages', 'python-plugin-sdk');
  assert.ok(existsSync(join(pythonSdkDir, 'pyproject.toml')));
  assert.ok(existsSync(join(pythonSdkDir, 'gordon_plugin_sdk', '__init__.py')));
  assert.ok(existsSync(join(pythonSdkDir, 'gordon_plugin_sdk', 'plugin.py')));
  assert.ok(existsSync(join(pythonSdkDir, 'gordon_plugin_sdk', 'mock_host.py')));

  const pyprojectContent = readFileSync(join(pythonSdkDir, 'pyproject.toml'), 'utf-8');
  assert.ok(pyprojectContent.includes('name = "gordon-plugin-sdk"'));

  // 3. Test Clean-Machine Dependency & Resource Auditor
  const audit = CleanMachineAuditor.auditEnvironment();
  assert.equal(audit.hasDockerDependency, false);
  assert.equal(audit.hasBackgroundDaemonDependency, false);
  assert.equal(audit.isLocalFirst, true);
  assert.equal(audit.installerTargetMb, 100);
  assert.equal(audit.memoryIdleTargetMb, 150);
  assert.equal(audit.isCompliant, true);

  const durationMs = Date.now() - startTime;
  console.log(`[M8 Benchmark] Plugin SDKs & Clean-Machine Audit Duration: ${durationMs}ms`);
});
