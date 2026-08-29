import {
  WarehouseEngine,
  DocumentStore,
  LineageStore,
  UnifiedIngestionPipeline,
  MeasureEngine,
  RelationshipGraph,
  TableProfiler,
  PiiScanner,
  TableProfile,
} from '@gordon/data-substrate';
import {
  ToolRegistry,
  TimeSeriesForecasterTool,
  AnomalyDetectionTool,
  DriverAnalysisTool,
} from '@gordon/tool-registry';
import {
  AutonomousExecutionLoop,
  AutonomousLoopRunResult,
  KeyVault,
  VisualizationAgent,
  ReportExportManager,
  HtmlBundleGenerator,
} from '@gordon/core-engine';
import { ChartSpec, ReportCanvasLayout, ByokVaultConfig } from '@gordon/shared-types';

export class EngineBridge {
  public warehouse: WarehouseEngine;
  public lineageStore: LineageStore;
  public docStore: DocumentStore;
  public ingestionPipeline: UnifiedIngestionPipeline;
  public toolRegistry: ToolRegistry;
  public measureEngine: MeasureEngine;
  public relationshipGraph: RelationshipGraph;
  public keyVault: KeyVault;
  public visualizationAgent: VisualizationAgent;
  public exportManager: ReportExportManager;
  public loop: AutonomousExecutionLoop;
  public profiler: TableProfiler;

  constructor(dbPath: string = ':memory:') {
    this.warehouse = new WarehouseEngine({ dbPath });
    this.lineageStore = new LineageStore({ dbPath });
    this.docStore = new DocumentStore({ dbPath });
    this.ingestionPipeline = new UnifiedIngestionPipeline(this.warehouse, this.docStore);
    this.toolRegistry = new ToolRegistry(this.lineageStore);
    this.toolRegistry.register(TimeSeriesForecasterTool);
    this.toolRegistry.register(AnomalyDetectionTool);
    this.toolRegistry.register(DriverAnalysisTool);

    this.measureEngine = new MeasureEngine(this.warehouse);
    this.relationshipGraph = new RelationshipGraph(this.warehouse);
    this.keyVault = new KeyVault();
    this.visualizationAgent = new VisualizationAgent();
    this.exportManager = new ReportExportManager();
    this.profiler = new TableProfiler(this.warehouse);

    this.loop = new AutonomousExecutionLoop(
      this.warehouse,
      this.lineageStore,
      this.docStore
    );
  }

  public async initialize(): Promise<void> {
    await this.warehouse.initialize();
  }

  public async ingestFile(filePath: string) {
    return this.ingestionPipeline.ingestFile(filePath);
  }

  public async runAutonomousGoal(goal: string, sourceFiles: string[] = []): Promise<AutonomousLoopRunResult> {
    return this.loop.run({
      businessGoal: goal,
      sourceFiles,
    });
  }

  public async queryTable(sql: string) {
    return this.warehouse.execute(sql);
  }

  public async profileTable(tableName: string): Promise<TableProfile> {
    return this.profiler.profileTable(tableName);
  }

  public async close(): Promise<void> {
    await this.warehouse.close();
    this.lineageStore.close();
    this.docStore.close();
  }
}
