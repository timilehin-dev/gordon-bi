import test from 'node:test';
import assert from 'node:assert/strict';
import { LineageStore } from '../src/lineage/store.js';

test('LineageStore - create session, tasks, runs, tool execs, and trace graph', () => {
  const store = new LineageStore({ dbPath: ':memory:' });

  // 1. Create Session
  const session = store.createSession({
    name: 'Q3 Financial Analysis',
    goal: 'Analyze revenue variance and detect anomalies',
  });
  assert.ok(session.id.startsWith('session_'));
  assert.equal(session.name, 'Q3 Financial Analysis');
  assert.equal(session.status, 'active');

  // 2. Start Task
  const task = store.startTask({
    sessionId: session.id,
    title: 'Run descriptive statistics',
    description: 'Summarize quarterly numbers',
    assignedAgentId: 'forecasting_agent',
  });
  assert.ok(task.id.startsWith('task_'));
  assert.equal(task.assignedAgentId, 'forecasting_agent');

  // 3. Record Agent Run
  const run = store.recordAgentRun({
    sessionId: session.id,
    taskId: task.id,
    agentId: 'forecasting_agent',
    executionMode: 'in_process',
    inputPayload: { metric: 'revenue' },
  });
  assert.ok(run.id.startsWith('run_'));

  // 4. Record Tool Execution
  const toolExec = store.recordToolExecution({
    sessionId: session.id,
    taskId: task.id,
    agentId: 'forecasting_agent',
    toolName: 'stat_descriptive_summary',
    inputArgs: { values: [100, 120, 150, 300] },
    rawOutput: { mean: 167.5, max: 300 },
    success: true,
    durationMs: 5,
  });
  assert.ok(toolExec.id.startsWith('tool_'));
  assert.equal(toolExec.success, true);

  // 5. Complete task & session
  store.completeAgentRun(run.id, { summary: 'Calculated mean 167.5' }, 'completed', 10);
  store.completeTask(task.id, 'completed');
  store.completeSession(session.id, 'completed');

  // 6. Verify Lineage Trace
  const trace = store.getTrace(session.id);
  assert.ok(trace);
  assert.equal(trace.rootSession.status, 'completed');
  assert.equal(trace.tasks.length, 1);
  assert.equal(trace.tasks[0].status, 'completed');
  assert.equal(trace.agentRuns.length, 1);
  assert.equal(trace.agentRuns[0].status, 'completed');
  assert.equal(trace.toolExecutions.length, 1);
  assert.equal(trace.toolExecutions[0].toolName, 'stat_descriptive_summary');
  assert.ok(trace.edges.length >= 1);

  store.close();
});
