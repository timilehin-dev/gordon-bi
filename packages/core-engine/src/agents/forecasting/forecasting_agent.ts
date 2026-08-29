import { ScopedToolHandle } from '@gordon/tool-registry';
import { TimeSeriesForecastOutput } from '@gordon/tool-registry';

export interface ForecastingAgentRunParams {
  sessionId: string;
  taskId: string;
  series: number[];
  horizon: number;
  metricName: string;
}

export class ForecastingAgent {
  public async execute(params: ForecastingAgentRunParams, scopedHandle: ScopedToolHandle): Promise<TimeSeriesForecastOutput> {
    const result = await scopedHandle.invoke<any, TimeSeriesForecastOutput>(
      'ts_forecast_multimodel',
      {
        series: params.series,
        horizon: params.horizon,
        metricName: params.metricName,
      },
      {
        sessionId: params.sessionId,
        taskId: params.taskId,
        invokedAt: Date.now(),
      }
    );

    if (!result.success || !result.data) {
      throw new Error(`Forecasting Agent execution failed: ${result.error?.message}`);
    }

    return result.data;
  }
}
