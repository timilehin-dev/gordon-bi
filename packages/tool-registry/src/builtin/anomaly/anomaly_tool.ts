import { ToolDefinition } from '@gordon/shared-types';
import { AnomalyDetectionInput, AnomalyDetectionOutput, AnomalyItem, ChangePoint } from './types.js';

export const AnomalyDetectionTool: ToolDefinition<AnomalyDetectionInput, AnomalyDetectionOutput> = {
  name: 'stat_anomaly_changepoint_scan',
  description: 'Deterministic statistical outlier and structural change-point scan',
  version: '1.0.0',
  capabilities: ['ml:anomaly', 'stats:compute'],
  isDeterministic: true,
  inputSchema: {
    type: 'object',
    description: 'Schema for statistical anomaly and change-point detection parameters',
    required: ['series'],
    properties: {
      series: { type: 'array', description: 'Numerical series to scan for anomalies' },
      labels: { type: 'array', description: 'Period labels (optional)' },
      sensitivity: { type: 'string', description: 'Scan sensitivity: low (3.0 sigma), medium (2.0 sigma), high (1.5 sigma)' },
      metricName: { type: 'string', description: 'Metric name' },
    },
  },
  execute: async (input) => {
    const raw = input.series;
    if (!raw || raw.length === 0) {
      return {
        success: false,
        error: { code: 'EMPTY_SERIES', message: 'Input series cannot be empty' },
        durationMs: 1,
      };
    }

    const n = raw.length;
    const sum = raw.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const variance = raw.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n > 1 ? n - 1 : 1);
    const stdDev = Math.sqrt(variance);

    const thresholdMultiplier =
      input.sensitivity === 'high' ? 1.5 : input.sensitivity === 'low' ? 3.0 : 2.0;

    const anomalies: AnomalyItem[] = [];

    // 1. Z-Score / StdDev Scan
    if (stdDev > 0) {
      for (let i = 0; i < n; i++) {
        const val = raw[i];
        const z = (val - mean) / stdDev;
        const absZ = Math.abs(z);

        if (absZ >= thresholdMultiplier) {
          let severity: AnomalyItem['severity'] = 'low';
          if (absZ >= 3.5) severity = 'critical';
          else if (absZ >= 2.5) severity = 'high';
          else if (absZ >= 2.0) severity = 'medium';

          anomalies.push({
            index: i,
            periodLabel: input.labels ? input.labels[i] : `Period ${i + 1}`,
            actualValue: val,
            expectedBaseline: Number(mean.toFixed(2)),
            deviation: Number((val - mean).toFixed(2)),
            zScore: Number(z.toFixed(3)),
            severity,
            detectionMethod: 'z_score',
          });
        }
      }
    }

    // 2. Sliding-Window Change-Point Detection
    const changePoints: ChangePoint[] = [];
    const windowSize = Math.max(3, Math.floor(n / 4));

    if (n >= windowSize * 2) {
      for (let split = windowSize; split <= n - windowSize; split++) {
        const left = raw.slice(split - windowSize, split);
        const right = raw.slice(split, split + windowSize);

        const leftMean = left.reduce((a, b) => a + b, 0) / left.length;
        const rightMean = right.reduce((a, b) => a + b, 0) / right.length;
        const diff = Math.abs(rightMean - leftMean);

        if (stdDev > 0 && diff > 1.8 * stdDev) {
          const shiftPct = leftMean !== 0 ? ((rightMean - leftMean) / leftMean) * 100 : 0;
          changePoints.push({
            index: split,
            periodLabel: input.labels ? input.labels[split] : `Period ${split + 1}`,
            beforeMean: Number(leftMean.toFixed(2)),
            afterMean: Number(rightMean.toFixed(2)),
            shiftDelta: Number((rightMean - leftMean).toFixed(2)),
            shiftPercentage: Number(shiftPct.toFixed(2)),
          });
          // Jump ahead by window size to prevent duplicate change-point clustering
          split += windowSize - 1;
        }
      }
    }

    return {
      success: true,
      data: {
        metricName: input.metricName || 'metric',
        totalPoints: n,
        anomalyCount: anomalies.length,
        anomalies,
        changePoints,
        baselineMean: Number(mean.toFixed(2)),
        baselineStdDev: Number(stdDev.toFixed(2)),
      },
      durationMs: 3,
    };
  },
};
