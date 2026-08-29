import { ToolDefinition } from '@gordon/shared-types';

export interface DescriptiveStatsInput {
  values: number[];
  metricName?: string;
}

export interface DescriptiveStatsOutput {
  metricName: string;
  count: number;
  mean: number;
  median: number;
  variance: number;
  stdDev: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  iqr: number;
  outliers: Array<{ index: number; value: number; zScore: number }>;
}

export const DescriptiveStatsTool: ToolDefinition<DescriptiveStatsInput, DescriptiveStatsOutput> = {
  name: 'stat_descriptive_summary',
  description: 'Deterministic descriptive statistics and outlier scan',
  version: '1.0.0',
  capabilities: ['stats:compute'],
  isDeterministic: true,
  inputSchema: {
    type: 'object',
    description: 'Array of numerical values to analyze',
    required: ['values'],
    properties: {
      values: { type: 'array', description: 'List of numbers' },
      metricName: { type: 'string', description: 'Name of the metric' },
    },
  },
  execute: async (input) => {
    const raw = input.values;
    if (!raw || raw.length === 0) {
      return {
        success: false,
        error: {
          code: 'EMPTY_VALUES_ARRAY',
          message: 'The values array cannot be empty',
        },
        durationMs: 1,
      };
    }

    const n = raw.length;
    const sum = raw.reduce((a, b) => a + b, 0);
    const mean = sum / n;

    const sorted = [...raw].sort((a, b) => a - b);
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

    const variance = raw.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n > 1 ? n - 1 : 1);
    const stdDev = Math.sqrt(variance);

    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;

    const outliers: Array<{ index: number; value: number; zScore: number }> = [];
    if (stdDev > 0) {
      raw.forEach((val, idx) => {
        const zScore = (val - mean) / stdDev;
        if (Math.abs(zScore) > 2.0) {
          outliers.push({ index: idx, value: val, zScore: Number(zScore.toFixed(3)) });
        }
      });
    }

    return {
      success: true,
      data: {
        metricName: input.metricName || 'metric',
        count: n,
        mean: Number(mean.toFixed(4)),
        median: Number(median.toFixed(4)),
        variance: Number(variance.toFixed(4)),
        stdDev: Number(stdDev.toFixed(4)),
        min: sorted[0],
        max: sorted[n - 1],
        q1,
        q3,
        iqr,
        outliers,
      },
      durationMs: 2,
    };
  },
};
