export interface TimeSeriesPoint {
  periodIndex: number;
  label?: string;
  value: number;
}

export interface ForecastPoint {
  periodIndex: number;
  label?: string;
  forecast: number;
  lower80: number;
  upper80: number;
  lower95: number;
  upper95: number;
}

export interface ModelBacktestScore {
  modelName: 'linear_trend' | 'exponential_smoothing' | 'moving_average' | 'autoregressive';
  rmse: number;
  mape: number;
  mae: number;
}

export interface TimeSeriesForecastInput {
  series: number[] | TimeSeriesPoint[];
  horizon: number; // e.g. 3, 6, 12 periods ahead
  seasonalityPeriod?: number; // e.g. 4 for quarterly, 12 for monthly
  metricName?: string;
}

export interface TimeSeriesForecastOutput {
  metricName: string;
  selectedModel: string;
  candidateScores: ModelBacktestScore[];
  trendSlope: number;
  confidenceLevels: number[];
  seasonalIndices?: number[];
  historicalCount: number;
  forecasts: ForecastPoint[];
  backtestRmse: number;
  backtestMape: number;
}
