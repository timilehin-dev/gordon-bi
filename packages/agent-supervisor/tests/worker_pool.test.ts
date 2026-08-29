import test from 'node:test';
import assert from 'node:assert/strict';
import { InProcessWorkerPool } from '../src/in_process/worker_pool.js';
import { LineageStore } from '@gordon/data-substrate';
import { ToolRegistry } from '@gordon/tool-registry';
import { AgentConfig } from '@gordon/shared-types';

test('InProcessWorkerPool - execute async agent task with lineage and timeout', async () => {
  const lineageStore = new LineageStore({ dbPath: ':memory:' });
  const toolRegistry = new ToolRegistry(lineageStore);
  const workerPool = new InProcessWorkerPool(lineageStore);

  const agentConfig: AgentConfig = {
    id: 'test_forecaster',
    name: 'Test Forecaster',
    version: '1.0.0',
    role: 'Forecast',
    description: 'Test agent',
    executionMode: 'in_process',
    allowedCapabilities: ['stats:compute'],
    allowedTools: ['stat_descriptive_summary'],
    systemPrompt: 'Test prompt',
    resourceLimits: {
      maxMemoryMb: 256,
      timeoutMs: 5000,
    },
  };

  const scopedHandle = toolRegistry.createScopedHandle(
    agentConfig.id,
    agentConfig.allowedTools,
    agentConfig.allowedCapabilities
  );

  const session = lineageStore.createSession({ name: 'Worker Pool Test', goal: 'Test in-process tasks' });
  const task = lineageStore.startTask({ sessionId: session.id, title: 'In-process task', description: 'desc', assignedAgentId: agentConfig.id });

  const executionResult = await workerPool.runTask<{ series: number[] }, { forecastNext: number }>({
    sessionId: session.id,
    taskId: task.id,
    agentConfig,
    scopedHandle,
    input: { series: [10, 20, 30, 40] },
    handler: async (input) => {
      // Simulate linear extrapolation
      const last = input.series[input.series.length - 1];
      const diff = input.series[input.series.length - 1] - input.series[input.series.length - 2];
      return { forecastNext: last + diff };
    },
  });

  assert.equal(executionResult.success, true);
  assert.equal(executionResult.data?.forecastNext, 50);

  // Verify Lineage Store trace
  const trace = lineageStore.getTrace(session.id);
  assert.ok(trace);
  assert.equal(trace.agentRuns.length, 1);
  assert.equal(trace.agentRuns[0].status, 'completed');

  lineageStore.close();
});
