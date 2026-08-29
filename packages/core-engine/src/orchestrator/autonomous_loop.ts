import {
  WarehouseEngine,
  LineageStore,
  DocumentStore,
  UnifiedIngestionPipeline,
  TableProfiler,
  TableProfile,
} from '@gordon/data-substrate';
import {
  ToolRegistry,
  TimeSeriesForecasterTool,
  AnomalyDetectionTool,
  DriverAnalysisTool,
  DescriptiveStatsTool,
  TimeSeriesForecastOutput,
  AnomalyDetectionOutput,
  DriverAnalysisOutput,
} from '@gordon/tool-registry';
import { GoalPlanner, PlannedTaskDag } from './goal_planner.js';
import { ForecastingAgent } from '../agents/forecasting/forecasting_agent.js';
import { AnomalyDetectionAgent } from '../agents/anomaly/anomaly_agent.js';
import { TrendCorrelationAgent } from '../agents/trend/trend_agent.js';
import { InsightGenerationAgent } from '../agents/insight/insight_agent.js';
import { CriticVerifierAgent } from '../agents/critic/critic_agent.js';
import { CriticAuditReport } from '../agents/critic/types.js';
import { ExecutiveReport } from '../agents/insight/types.js';

export interface AutonomousLoopRunRequest {
  businessGoal: string;
  sourceFiles: string[];
  targetTableName?: string;
  metricColumn?: string;
  timeColumn?: string;
}

export interface AutonomousLoopRunResult {
  sessionId: string;
  businessGoal: string;
  plan: PlannedTaskDag;
  profiles: TableProfile[];
  executiveReport: ExecutiveReport;
  criticAudit: CriticAuditReport;
  isVerifiedAndApproved: boolean;
  totalDurationMs: number;
}

export class AutonomousExecutionLoop {
  private warehouse: WarehouseEngine;
  private lineageStore: LineageStore;
  private docStore: DocumentStore;
  private toolRegistry: ToolRegistry;

  constructor(
    warehouse: WarehouseEngine,
    lineageStore: LineageStore,
    docStore: DocumentStore
  ) {
    this.warehouse = warehouse;
    this.lineageStore = lineageStore;
    this.docStore = docStore;
    this.toolRegistry = new ToolRegistry(lineageStore);

    // Register all deterministic analytical tools
    this.toolRegistry.register(TimeSeriesForecasterTool);
    this.toolRegistry.register(AnomalyDetectionTool);
    this.toolRegistry.register(DriverAnalysisTool);
    this.toolRegistry.register(DescriptiveStatsTool);
  }

  public async run(request: AutonomousLoopRunRequest): Promise<AutonomousLoopRunResult> {
    const startTime = Date.now();

    // 1. Create Session
    const session = this.lineageStore.createSession({
      name: `Autonomous Run: ${request.businessGoal.slice(0, 50)}`,
      goal: request.businessGoal,
    });

    // 2. Goal Planning
    const plan = GoalPlanner.planGoal(request.businessGoal);

    // 3. Ingestion Task
    const ingestTask = this.lineageStore.startTask({
      sessionId: session.id,
      title: 'Unified Ingestion & Profiling',
      description: 'Ingest source files and profile table columns',
      assignedAgentId: 'data_engineering_agent',
    });

    const pipeline = new UnifiedIngestionPipeline(this.warehouse, this.docStore);
    await pipeline.ingestBatch(request.sourceFiles);

    const tables = await this.warehouse.getTables();
    const primaryTable = request.targetTableName || tables[0] || 'default_table';

    const profiler = new TableProfiler(this.warehouse);
    const profiles: TableProfile[] = [];
    for (const t of tables) {
      profiles.push(await profiler.profileTable(t));
    }

    this.lineageStore.completeTask(ingestTask.id, 'completed');

    // 4. Fetch table data for analytical modeling
    const tableData = await this.warehouse.execute(`SELECT * FROM "${primaryTable}"`);
    const numericCols = profiles[0]?.columns.filter(c => c.dataType.includes('INT') || c.dataType.includes('DOUBLE') || c.dataType.includes('FLOAT') || c.dataType.includes('BIGINT')) || [];
    const metricCol = request.metricColumn || (numericCols[0]?.columnName || 'value');

    const seriesValues = tableData.rows.map(r => Number(r[metricCol])).filter(v => !isNaN(v));

    let forecastData: { output: TimeSeriesForecastOutput; toolExecutionId: string } | undefined;
    let anomalyData: { output: AnomalyDetectionOutput; toolExecutionId: string } | undefined;
    let driverData: { output: DriverAnalysisOutput; toolExecutionId: string } | undefined;

    // 5. Run Forecasting if in plan
    if (plan.tasks.some(t => t.id === 'task_forecasting') && seriesValues.length >= 3) {
      const fTask = this.lineageStore.startTask({
        sessionId: session.id,
        title: 'Forecast Metric Projections',
        description: 'Multi-model forecast with backtesting',
        assignedAgentId: 'forecasting_agent',
      });

      const handle = this.toolRegistry.createScopedHandle('forecasting_agent', ['ts_forecast_multimodel'], ['ml:forecast', 'stats:compute']);
      const forecaster = new ForecastingAgent();
      const output = await forecaster.execute(
        {
          sessionId: session.id,
          taskId: fTask.id,
          series: seriesValues,
          horizon: 3,
          metricName: metricCol,
        },
        handle
      );

      const trace = this.lineageStore.getTrace(session.id);
      const toolExec = trace?.toolExecutions.slice().reverse().find(t => t.toolName === 'ts_forecast_multimodel');

      forecastData = {
        output,
        toolExecutionId: toolExec?.id || 'tool_forecast',
      };

      this.lineageStore.completeTask(fTask.id, 'completed');
    }

    // 6. Run Anomaly Detection if in plan
    if (plan.tasks.some(t => t.id === 'task_anomaly_scan') && seriesValues.length >= 3) {
      const aTask = this.lineageStore.startTask({
        sessionId: session.id,
        title: 'Scan for Cost & Revenue Anomalies',
        description: 'Z-score & change-point outlier scan',
        assignedAgentId: 'anomaly_detection_agent',
      });

      const handle = this.toolRegistry.createScopedHandle('anomaly_detection_agent', ['stat_anomaly_changepoint_scan'], ['ml:anomaly', 'stats:compute']);
      const detector = new AnomalyDetectionAgent();
      const output = await detector.execute(
        {
          sessionId: session.id,
          taskId: aTask.id,
          series: seriesValues,
          sensitivity: 'medium',
          metricName: metricCol,
        },
        handle
      );

      const trace = this.lineageStore.getTrace(session.id);
      const toolExec = trace?.toolExecutions.slice().reverse().find(t => t.toolName === 'stat_anomaly_changepoint_scan');

      anomalyData = {
        output,
        toolExecutionId: toolExec?.id || 'tool_anomaly',
      };

      this.lineageStore.completeTask(aTask.id, 'completed');
    }

    // 7. Run Insight Generation Agent
    const insightTask = this.lineageStore.startTask({
      sessionId: session.id,
      title: 'Synthesize Executive Report',
      description: 'Synthesize findings with 100% lineage citations',
      assignedAgentId: 'insight_generation_agent',
    });

    const insightAgent = new InsightGenerationAgent();
    const executiveReport = insightAgent.synthesizeReport({
      businessGoal: request.businessGoal,
      tableName: primaryTable,
      totalRecords: tableData.rowCount,
      forecast: forecastData,
      anomalies: anomalyData,
      drivers: driverData,
    });

    this.lineageStore.completeTask(insightTask.id, 'completed');

    // 8. Run Critic / Verifier QA Pass
    const criticTask = this.lineageStore.startTask({
      sessionId: session.id,
      title: 'Adversarial Lineage QA Audit',
      description: 'Verify 100% of numerical assertions against raw lineage',
      assignedAgentId: 'critic_verifier_agent',
    });

    const critic = new CriticVerifierAgent(this.lineageStore);
    const criticAudit = critic.auditNarrative(session.id, executiveReport.fullMarkdown);

    this.lineageStore.completeTask(criticTask.id, criticAudit.isApproved ? 'completed' : 'failed');

    const totalDurationMs = Date.now() - startTime;

    return {
      sessionId: session.id,
      businessGoal: request.businessGoal,
      plan,
      profiles,
      executiveReport,
      criticAudit,
      isVerifiedAndApproved: criticAudit.isApproved,
      totalDurationMs,
    };
  }
}
