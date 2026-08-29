import { ScopedToolHandle } from '@gordon/tool-registry';
import { AnomalyDetectionOutput } from '@gordon/tool-registry';

export interface AnomalyAgentRunParams {
  sessionId: string;
  taskId: string;
  series: number[];
  labels?: string[];
  sensitivity?: 'low' | 'medium' | 'high';
  metricName: string;
}

export class AnomalyDetectionAgent {
  public async execute(params: AnomalyAgentRunParams, scopedHandle: ScopedToolHandle): Promise<AnomalyDetectionOutput> {
    const result = await scopedHandle.invoke<any, AnomalyDetectionOutput>(
      'stat_anomaly_changepoint_scan',
      {
        series: params.series,
        labels: params.labels,
        sensitivity: params.sensitivity || 'medium',
        metricName: params.metricName,
      },
      {
        sessionId: params.sessionId,
        taskId: params.taskId,
        invokedAt: Date.now(),
      }
    );

    if (!result.success || !result.data) {
      throw new Error(`Anomaly Detection Agent execution failed: ${result.error?.message}`);
    }

    return result.data;
  }
}
