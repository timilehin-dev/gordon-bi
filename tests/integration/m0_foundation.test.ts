import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { AgentConfigLoader, StubOrchestrator } from '@gordon/core-engine';
import { LineageStore, WarehouseEngine, DocumentStore } from '@gordon/data-substrate';
import { ToolRegistry, HelloWorldTool } from '@gordon/tool-registry';

test('Milestone 0 Foundation Acceptance Test - Stub Orchestrator & Lineage Provenance', async () => {
  // 1. Initialize Substrates (DuckDB warehouse, SQLite lineage, Document store)
  const lineageStore = new LineageStore({ dbPath: ':memory:' });
  const warehouse = new WarehouseEngine({ dbPath: ':memory:' });
  const docStore = new DocumentStore({ dbPath: ':memory:' });

  await warehouse.initialize();

  // 2. Initialize Tool Registry and register deterministic Hello World tool
  const toolRegistry = new ToolRegistry(lineageStore);
  toolRegistry.register(HelloWorldTool);

  // 3. Load Agent Config from configs/agents/
  const configLoader = new AgentConfigLoader();
  const rootAgentConfig = configLoader.loadFromFile(join(process.cwd(), 'configs/agents/root_analyst.json'));

  assert.equal(rootAgentConfig.id, 'root_business_analyst');
  assert.equal(rootAgentConfig.executionMode, 'in_process');
  assert.ok(rootAgentConfig.allowedTools.includes('hello_world'));

  // 4. Instantiate Stub Orchestrator
  const orchestrator = new StubOrchestrator(toolRegistry, lineageStore);

  // 5. Execute "hello_world" tool through Stub Orchestrator
  const result = await orchestrator.runTool({
    agentConfig: rootAgentConfig,
    toolName: 'hello_world',
    input: { name: 'M0 Clean-Machine Verification', repeat: 3 },
    goal: 'Verify M0 foundation tool execution and lineage logging',
  });

  assert.equal(result.success, true);
  assert.ok(typeof result.data === 'object' && result.data !== null);
  const outputData = result.data as { greeting: string; echoCount: number };
  assert.equal(outputData.echoCount, 3);
  assert.ok(outputData.greeting.includes('M0 Clean-Machine Verification'));

  // 6. Verify Full Lineage Trace in Provenance Store
  const trace = lineageStore.getTrace(result.sessionId);
  assert.ok(trace, 'Trace must exist in lineage store');
  assert.equal(trace.rootSession.status, 'completed');
  assert.equal(trace.rootSession.goal, 'Verify M0 foundation tool execution and lineage logging');

  // Verify task record
  assert.equal(trace.tasks.length, 1);
  assert.equal(trace.tasks[0].id, result.taskId);
  assert.equal(trace.tasks[0].status, 'completed');
  assert.equal(trace.tasks[0].assignedAgentId, 'root_business_analyst');

  // Verify agent run record
  assert.equal(trace.agentRuns.length, 1);
  assert.equal(trace.agentRuns[0].agentId, 'root_business_analyst');
  assert.equal(trace.agentRuns[0].status, 'completed');

  // Verify tool execution record
  assert.equal(trace.toolExecutions.length, 1);
  assert.equal(trace.toolExecutions[0].toolName, 'hello_world');
  assert.equal(trace.toolExecutions[0].success, true);

  // Verify provenance edge
  assert.ok(trace.edges.length >= 1);
  assert.equal(trace.edges[0].sourceType, 'tool');
  assert.equal(trace.edges[0].targetType, 'task');

  // Cleanup
  await warehouse.close();
  docStore.close();
  lineageStore.close();
});
