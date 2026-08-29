import test from 'node:test';
import assert from 'node:assert/strict';
import { ToolRegistry } from '../src/registry/registry.js';
import { HelloWorldTool } from '../src/builtin/hello_world.js';
import { DescriptiveStatsTool } from '../src/builtin/stats.js';
import { LineageStore } from '@gordon/data-substrate';

test('ToolRegistry - register, scoped handle enforcement, and execution', async () => {
  const lineageStore = new LineageStore({ dbPath: ':memory:' });
  const registry = new ToolRegistry(lineageStore);

  registry.register(HelloWorldTool);
  registry.register(DescriptiveStatsTool);

  const session = lineageStore.createSession({ name: 'Test Session', goal: 'Test Registry' });
  const task = lineageStore.startTask({ sessionId: session.id, title: 'Test Task', description: 'desc', assignedAgentId: 'agent1' });

  // 1. Scoped handle with permitted tool
  const permittedHandle = registry.createScopedHandle('agent1', ['hello_world'], ['system:exec']);
  const result = await permittedHandle.invoke('hello_world', { name: 'Ada Lovelace', repeat: 2 }, {
    sessionId: session.id,
    taskId: task.id,
    invokedAt: Date.now(),
  });

  assert.equal(result.success, true);
  assert.equal(result.data?.greeting, 'Hello, Ada Lovelace! Hello, Ada Lovelace!');
  assert.equal(result.data?.echoCount, 2);

  // 2. Scoped handle attempting unauthorized tool
  const restrictedHandle = registry.createScopedHandle('restricted_agent', ['hello_world'], []);
  await assert.rejects(async () => {
    await restrictedHandle.invoke('stat_descriptive_summary', { values: [1, 2, 3] }, {
      sessionId: session.id,
      taskId: task.id,
      invokedAt: Date.now(),
    });
  }, (err: any) => {
    return err.code === 'TOOL_PERMISSION_DENIED';
  });

  // 3. Descriptive statistics tool execution
  const statsHandle = registry.createScopedHandle('stats_agent', ['stat_descriptive_summary'], ['stats:compute']);
  const statsResult = await statsHandle.invoke('stat_descriptive_summary', {
    values: [10, 12, 14, 15, 16, 18, 100], // 100 is an outlier
    metricName: 'latency_ms',
  }, {
    sessionId: session.id,
    taskId: task.id,
    invokedAt: Date.now(),
  });

  assert.equal(statsResult.success, true);
  assert.equal(statsResult.data?.count, 7);
  assert.ok(statsResult.data?.mean > 20);
  assert.equal(statsResult.data?.outliers.length, 1);
  assert.equal(statsResult.data?.outliers[0].value, 100);

  lineageStore.close();
});
