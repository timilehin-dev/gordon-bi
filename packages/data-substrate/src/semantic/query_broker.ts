import { WarehouseEngine } from '../warehouse/engine.js';
import { DocumentStore } from '../documents/store.js';
import { RelationshipGraph } from './relationship_graph.js';
import { MeasureEngine } from './measure_engine.js';
import { UnifiedQueryResult } from './types.js';

export class UnifiedQueryBroker {
  private warehouse: WarehouseEngine;
  private docStore: DocumentStore;
  private relationshipGraph: RelationshipGraph;
  private measureEngine: MeasureEngine;

  constructor(
    warehouse: WarehouseEngine,
    docStore: DocumentStore,
    relationshipGraph: RelationshipGraph,
    measureEngine: MeasureEngine
  ) {
    this.warehouse = warehouse;
    this.docStore = docStore;
    this.relationshipGraph = relationshipGraph;
    this.measureEngine = measureEngine;
  }

  public async queryStructured(sql: string): Promise<UnifiedQueryResult> {
    const startTime = Date.now();
    const result = await this.warehouse.execute(sql);
    const durationMs = Date.now() - startTime;

    return {
      queryType: 'structured_sql',
      structuredData: {
        columns: result.columns,
        rows: result.rows,
        rowCount: result.rowCount,
        executionTimeMs: result.executionTimeMs,
      },
      executionTimeMs: durationMs,
    };
  }

  public searchUnstructured(query: string, limit = 10): UnifiedQueryResult {
    const startTime = Date.now();
    const results = this.docStore.search({ query, limit });
    const durationMs = Date.now() - startTime;

    return {
      queryType: 'document_search',
      documentResults: results,
      executionTimeMs: durationMs,
    };
  }

  public async hybridQuery(sql: string, textQuery: string): Promise<UnifiedQueryResult> {
    const startTime = Date.now();
    const sqlResult = await this.warehouse.execute(sql);
    const docResults = this.docStore.search({ query: textQuery, limit: 5 });
    const durationMs = Date.now() - startTime;

    return {
      queryType: 'hybrid',
      structuredData: {
        columns: sqlResult.columns,
        rows: sqlResult.rows,
        rowCount: sqlResult.rowCount,
        executionTimeMs: sqlResult.executionTimeMs,
      },
      documentResults: docResults,
      executionTimeMs: durationMs,
    };
  }

  public getRelationshipGraph(): RelationshipGraph {
    return this.relationshipGraph;
  }

  public getMeasureEngine(): MeasureEngine {
    return this.measureEngine;
  }
}
