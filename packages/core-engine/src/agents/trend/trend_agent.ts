import { ScopedToolHandle } from '@gordon/tool-registry';
import { DriverAnalysisOutput } from '@gordon/tool-registry';

export interface TrendAgentRunParams {
  sessionId: string;
  taskId: string;
  targetMetric: string;
  targetValues: number[];
  features: Record<string, number[]>;
}

export class TrendCorrelationAgent {
  public async execute(params: TrendAgentRunParams, scopedHandle: ScopedToolHandle): Promise<DriverAnalysisOutput> {
    const result = await scopedHandle.invoke<any, DriverAnalysisOutput>(
      'stat_driver_attribution',
      {
        targetMetric: params.targetMetric,
        targetValues: params.targetValues,
        features: params.features,
      },
      {
        sessionId: params.sessionId,
        taskId: params.taskId,
        invokedAt: Date.now(),
      }
    );

    if (!result.success || !result.data) {
      throw new Error(`Trend Correlation Agent execution failed: ${result.error?.message}`);
    }

    return result.data;
  }
}
