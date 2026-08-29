import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { AgentConfigLoader, DagOrchestratorEngine, LocalSqlMcpAdapter } from '@gordon/core-engine';
import { LineageStore, WarehouseEngine } from '@gordon/data-substrate';
import { ToolRegistry, HelloWorldTool, DescriptiveStatsTool } from '@gordon/tool-registry';
import { InProcessWorkerPool } from '@gordon/agent-supervisor';

test('Milestone 1 Agent Runtime Acceptance Test - Multi-Agent DAG, Scoped Tool Security, & MCP Execution', async () => {
  const memStart = process.memoryUsage().rss / (1024 * 1024);

  // 1. Initialize Substrates
  const lineageStore = new LineageStore({ dbPath: ':memory:' });
  const warehouse = new WarehouseEngine({ dbPath: ':memory:' });
  await warehouse.initialize();

  // 2. Populate sample warehouse data
  await warehouse.execute(`
    CREATE TABLE monthly_revenue (
      month_index INT,
      month_name VARCHAR,
      revenue_usd DOUBLE
    );
    INSERT INTO monthly_revenue VALUES
      (1, 'Jan', 100000.0),
      (2, 'Feb', 115000.0),
      (3, 'Mar', 122000.0),
      (4, 'Apr', 128000.0),
      (5, 'May', 135000.0),
      (6, 'Jun', 290000.0); -- Outlier spike in June
  `);

  // 3. Register tools
  const toolRegistry = new ToolRegistry(lineageStore);
  toolRegistry.register(HelloWorldTool);
  toolRegistry.register(DescriptiveStatsTool);

  // 4. Load all 5 built-in agent configs
  const configLoader = new AgentConfigLoader();
  const agents = configLoader.loadFromDirectory(join(process.cwd(), 'configs/agents'));
  assert.equal(agents.length, 5, 'Must load all 5 built-in agent configurations');

  const rootConfig = configLoader.getConfig('root_business_analyst')!;
  const dataEngConfig = configLoader.getConfig('data_engineering_agent')!;
  const forecastingConfig = configLoader.getConfig('forecasting_agent')!;
  const anomalyConfig = configLoader.getConfig('anomaly_detection_agent')!;
  const insightConfig = configLoader.getConfig('insight_generation_agent')!;

  assert.ok(rootConfig && dataEngConfig && forecastingConfig && anomalyConfig && insightConfig);
  assert.equal(dataEngConfig.executionMode, 'supervised_subprocess');
  assert.equal(forecastingConfig.executionMode, 'in_process');

  // 5. Test Capability-Scoped Tool Handle Security
  const forecastingHandle = toolRegistry.createScopedHandle(
    forecastingConfig.id,
    forecastingConfig.allowedTools,
    forecastingConfig.allowedCapabilities
  );
  assert.equal(forecastingHandle.isAuthorized('stat_descriptive_summary'), true);
  assert.equal(forecastingHandle.isAuthorized('duckdb_schema_create'), false);

  // 6. Test Local SQL MCP Adapter
  const sqlAdapter = new LocalSqlMcpAdapter(warehouse);
  const sqlResult = await sqlAdapter.execute({
    query: 'SELECT month_name, revenue_usd FROM monthly_revenue ORDER BY month_index ASC',
  });
  assert.equal(sqlResult.rowCount, 6);
  assert.equal(sqlResult.rows[5].month_name, 'Jun');
  assert.equal(sqlResult.rows[5].revenue_usd, 290000.0);

  // 7. Multi-Agent DAG Orchestration Run
  const dagEngine = new DagOrchestratorEngine(toolRegistry, lineageStore, configLoader);
  const revenueValues = sqlResult.rows.map((r: any) => r.revenue_usd);

  const dagResult = await dagEngine.executeDag({
    id: 'm1_revenue_audit_dag',
    goal: 'Analyze monthly revenue distribution and identify anomalies across specialized sub-agents',
    nodes: [
      {
        id: 'node_1_ingest_check',
        title: 'Ingestion Health Check',
        description: 'Verify system execution readiness',
        assignedAgentId: 'root_business_analyst',
        requiredCapabilities: ['system:exec'],
        toolName: 'hello_world',
        input: { name: 'Data Pipeline', repeat: 1 },
        dependencies: [],
      },
      {
        id: 'node_2_stat_summary',
        title: 'Descriptive Stats & Outlier Scan',
        description: 'Calculate distribution metrics and flag statistical outliers',
        assignedAgentId: 'forecasting_agent',
        requiredCapabilities: ['stats:compute'],
        toolName: 'stat_descriptive_summary',
        input: { values: revenueValues, metricName: 'monthly_revenue_usd' },
        dependencies: ['node_1_ingest_check'],
      },
    ],
  });

  assert.equal(dagResult.success, true, 'DAG execution must succeed');
  assert.equal(dagResult.results.size, 2);

  const statOutput = dagResult.results.get('node_2_stat_summary')?.data as any;
  assert.ok(statOutput);
  assert.equal(statOutput.count, 6);
  assert.equal(statOutput.outliers.length, 1);
  assert.equal(statOutput.outliers[0].value, 290000.0); // Correctly caught the spike

  // 8. Verify Lineage Provenance
  const trace = lineageStore.getTrace(dagResult.sessionId);
  assert.ok(trace);
  assert.equal(trace.tasks.length, 2);
  assert.equal(trace.agentRuns.length, 2);
  assert.equal(trace.toolExecutions.length, 2);
  assert.ok(trace.edges.length >= 3); // dependency edge + tool produced_by edges

  // 9. Footprint & Memory Benchmark
  const memEnd = process.memoryUsage().rss / (1024 * 1024);
  const memDelta = Math.max(0, memEnd - memStart);
  console.log(`[M1 Benchmark] Total Duration: ${dagResult.totalDurationMs}ms, Memory Delta: ${memDelta.toFixed(2)} MB, Total RSS: ${memEnd.toFixed(2)} MB`);

  assert.ok(memEnd < 150, 'Idle/runtime memory must be under 150MB target');

  // Cleanup
  await warehouse.close();
  lineageStore.close();
});
