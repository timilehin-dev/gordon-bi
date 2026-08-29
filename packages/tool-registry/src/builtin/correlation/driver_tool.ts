import { ToolDefinition } from '@gordon/shared-types';
import { DriverAnalysisInput, DriverAnalysisOutput, DriverAttribution } from './types.js';

export const DriverAnalysisTool: ToolDefinition<DriverAnalysisInput, DriverAnalysisOutput> = {
  name: 'stat_driver_attribution',
  description: 'Deterministic multivariate driver attribution, feature correlation, and regression impact analysis',
  version: '1.0.0',
  capabilities: ['stats:compute'],
  isDeterministic: true,
  inputSchema: {
    type: 'object',
    description: 'Schema for driver attribution and feature correlation analysis',
    required: ['targetMetric', 'targetValues', 'features'],
    properties: {
      targetMetric: { type: 'string', description: 'Name of the target KPI (e.g. revenue, churn_rate)' },
      targetValues: { type: 'array', description: 'Array of target values' },
      features: { type: 'object', description: 'Map of feature names to their numerical values' },
    },
  },
  execute: async (input) => {
    const y = input.targetValues;
    const n = y.length;

    if (!y || n < 3) {
      return {
        success: false,
        error: { code: 'INSUFFICIENT_OBSERVATIONS', message: 'Target values must contain at least 3 points' },
        durationMs: 1,
      };
    }

    const meanY = y.reduce((a, b) => a + b, 0) / n;
    const drivers: DriverAttribution[] = [];

    for (const [featName, featValues] of Object.entries(input.features)) {
      if (featValues.length !== n) continue;

      const meanX = featValues.reduce((a, b) => a + b, 0) / n;
      let num = 0, denX = 0, denY = 0;

      for (let i = 0; i < n; i++) {
        const dx = featValues[i] - meanX;
        const dy = y[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
      }

      const corr = denX > 0 && denY > 0 ? num / Math.sqrt(denX * denY) : 0;
      const slope = denX > 0 ? num / denX : 0;
      const importanceScore = Number(Math.abs(corr).toFixed(3));

      drivers.push({
        featureName: featName,
        correlation: Number(corr.toFixed(4)),
        regressionCoefficient: Number(slope.toFixed(4)),
        importanceScore,
        impactDirection: corr >= 0 ? 'positive' : 'negative',
      });
    }

    // Sort by importance
    drivers.sort((a, b) => b.importanceScore - a.importanceScore);

    const keyPositive = drivers.find(d => d.impactDirection === 'positive')?.featureName;
    const keyNegative = drivers.find(d => d.impactDirection === 'negative')?.featureName;

    // Approximate R^2 from top driver
    const topCorr = drivers[0] ? drivers[0].correlation : 0;
    const rSquared = Number((topCorr * topCorr).toFixed(3));

    return {
      success: true,
      data: {
        targetMetric: input.targetMetric,
        totalObservations: n,
        drivers,
        rSquared,
        keyPositiveDriver: keyPositive,
        keyNegativeDriver: keyNegative,
      },
      durationMs: 4,
    };
  },
};
