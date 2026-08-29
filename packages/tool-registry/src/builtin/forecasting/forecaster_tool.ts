import { ToolDefinition } from '@gordon/shared-types';
import { TimeSeriesForecastInput, TimeSeriesForecastOutput, TimeSeriesPoint } from './types.js';
import { ForecastingEngine } from './candidate_models.js';

export const TimeSeriesForecasterTool: ToolDefinition<TimeSeriesForecastInput, TimeSeriesForecastOutput> = {
  name: 'ts_forecast_multimodel',
  description: 'Deterministic time-series forecasting with candidate model backtesting, RMSE evaluation, and confidence intervals',
  version: '1.0.0',
  capabilities: ['ml:forecast', 'stats:compute'],
  isDeterministic: true,
  inputSchema: {
    type: 'object',
    description: 'Schema for multi-model time-series forecasting parameters',
    required: ['series', 'horizon'],
    properties: {
      series: { type: 'array', description: 'Historical time-series numerical array' },
      horizon: { type: 'number', description: 'Number of periods ahead to forecast' },
      seasonalityPeriod: { type: 'number', description: 'Seasonal period (e.g. 4 for quarterly, 12 for monthly)' },
      metricName: { type: 'string', description: 'Name of the metric' },
    },
  },
  execute: async (input) => {
    let rawValues: number[] = [];

    if (Array.isArray(input.series)) {
      if (input.series.length > 0 && typeof input.series[0] === 'object') {
        rawValues = (input.series as TimeSeriesPoint[]).map(p => p.value);
      } else {
        rawValues = input.series as number[];
      }
    }

    if (rawValues.length < 3) {
      return {
        success: false,
        error: {
          code: 'INSUFFICIENT_TIME_SERIES_DATA',
          message: 'At least 3 historical points are required for time-series forecasting',
        },
        durationMs: 1,
      };
    }

    const horizon = Math.max(1, Math.min(input.horizon || 3, 24));
    const candidateScores = ForecastingEngine.backtest(rawValues, Math.min(3, Math.floor(rawValues.length / 3)));

    // Select candidate model with lowest RMSE
    const bestScore = [...candidateScores].sort((a, b) => a.rmse - b.rmse)[0];
    const selectedModel = bestScore ? bestScore.modelName : 'linear_trend';

    const { forecasts, slope, rmse } = ForecastingEngine.generateForecasts(
      rawValues,
      horizon,
      selectedModel === 'exponential_smoothing' ? 'exponential_smoothing' : 'linear_trend'
    );

    return {
      success: true,
      data: {
        metricName: input.metricName || 'metric',
        selectedModel,
        candidateScores,
        trendSlope: Number(slope.toFixed(4)),
        confidenceLevels: [80, 95],
        historicalCount: rawValues.length,
        forecasts,
        backtestRmse: bestScore ? bestScore.rmse : rmse,
        backtestMape: bestScore ? bestScore.mape : 0,
      },
      durationMs: 5,
    };
  },
};
