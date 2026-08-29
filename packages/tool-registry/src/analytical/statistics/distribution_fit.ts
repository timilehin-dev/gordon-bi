import { DistributionFitParams, DistributionFitResult, FittedDistributionSummary, DistributionType } from './types.js';
import { StatisticsToolError } from './errors.js';

export class DistributionFitTool {
  public static fit(params: DistributionFitParams): DistributionFitResult {
    const { data, targetDistribution } = params;

    if (!Array.isArray(data) || data.length < 5) {
      throw new StatisticsToolError(`Need at least 5 data points for distribution fitting (received ${data?.length || 0})`, 'INSUFFICIENT_DATA');
    }

    const n = data.length;
    const sorted = [...data].sort((a, b) => a - b);
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const variance = data.reduce((acc, x) => acc + (x - mean) * (x - mean), 0) / n;
    const stdDev = Math.sqrt(Math.max(1e-6, variance));

    const candidatesToTest: DistributionType[] = targetDistribution
      ? [targetDistribution]
      : ['normal', 'lognormal', 'exponential', 'poisson'];

    const allCandidates: FittedDistributionSummary[] = [];

    for (const dist of candidatesToTest) {
      try {
        let paramsMap: Record<string, number> = {};
        let cdfFn: (x: number) => number = () => 0;
        let numParams = 2;
        let logLikelihood = 0;

        if (dist === 'normal') {
          paramsMap = { mean: Number(mean.toFixed(4)), stdDev: Number(stdDev.toFixed(4)) };
          cdfFn = (x) => this.normalCdf((x - mean) / stdDev);
          numParams = 2;
          logLikelihood = -n * Math.log(stdDev * Math.sqrt(2 * Math.PI)) - n / 2;
        } else if (dist === 'lognormal') {
          const positiveOnly = data.filter(x => x > 0);
          if (positiveOnly.length < 5) continue;
          const logData = positiveOnly.map(x => Math.log(x));
          const mu = logData.reduce((a, b) => a + b, 0) / logData.length;
          const sigma = Math.sqrt(logData.reduce((acc, l) => acc + (l - mu) * (l - mu), 0) / logData.length);
          paramsMap = { mu: Number(mu.toFixed(4)), sigma: Number(sigma.toFixed(4)) };
          cdfFn = (x) => x > 0 ? this.normalCdf((Math.log(x) - mu) / (sigma || 1e-6)) : 0;
          numParams = 2;
          const sumLogX = logData.reduce((a, b) => a + b, 0);
          logLikelihood = -sumLogX - positiveOnly.length * Math.log(sigma * Math.sqrt(2 * Math.PI)) - positiveOnly.length / 2;
        } else if (dist === 'exponential') {
          const positiveOnly = data.filter(x => x >= 0);
          if (positiveOnly.length < 5) continue;
          const rate = 1 / (mean || 1e-6);
          paramsMap = { lambda: Number(rate.toFixed(4)) };
          cdfFn = (x) => x >= 0 ? 1 - Math.exp(-rate * x) : 0;
          numParams = 1;
          const sumX = positiveOnly.reduce((a, b) => a + b, 0);
          logLikelihood = positiveOnly.length * Math.log(rate) - rate * sumX;
        } else if (dist === 'poisson') {
          const nonNegativeOnly = data.filter(x => x >= 0);
          if (nonNegativeOnly.length < 5) continue;
          const lambda = Math.max(0.1, mean);
          paramsMap = { lambda: Number(lambda.toFixed(4)) };
          cdfFn = (x) => this.poissonCdf(Math.floor(x), lambda);
          numParams = 1;
          const sumX = nonNegativeOnly.reduce((a, b) => a + b, 0);
          logLikelihood = sumX * Math.log(lambda) - nonNegativeOnly.length * lambda;
        }

        // Kolmogorov-Smirnov test
        let maxD = 0;
        for (let i = 0; i < n; i++) {
          const x = sorted[i];
          const empiricalCdf = (i + 1) / n;
          const theoreticalCdf = cdfFn(x);
          const d = Math.abs(empiricalCdf - theoreticalCdf);
          if (d > maxD) maxD = d;
        }

        const ksStat = Number(maxD.toFixed(4));
        const pValue = Number(Math.max(0, Math.min(1, 2 * Math.exp(-2 * n * maxD * maxD))).toFixed(4));
        const isGoodFit = pValue >= 0.05;

        // BIC calculation: k * ln(n) - 2 * logLikelihood
        const bic = Number((numParams * Math.log(n) - 2 * logLikelihood).toFixed(2));

        allCandidates.push({
          distribution: dist,
          parameters: paramsMap,
          ksStatistic: ksStat,
          pValue,
          logLikelihood: Number(logLikelihood.toFixed(2)),
          bic,
          isGoodFit,
        });
      } catch {}
    }

    if (allCandidates.length === 0) {
      throw new StatisticsToolError('Failed to fit any candidate distribution', 'FIT_FAILED');
    }

    // Sort by smallest KS statistic (best fit)
    allCandidates.sort((a, b) => a.ksStatistic - b.ksStatistic);
    const bestFit = allCandidates[0];

    return {
      bestFit,
      allCandidates,
    };
  }

  private static normalCdf(z: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = z < 0 ? -1 : 1;
    const absX = Math.abs(z);
    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
    return 0.5 * (1 + sign * y);
  }

  private static poissonCdf(k: number, lambda: number): number {
    if (k < 0) return 0;
    let sum = 0;
    let term = Math.exp(-lambda);
    sum += term;
    for (let i = 1; i <= k && i < 100; i++) {
      term *= lambda / i;
      sum += term;
    }
    return Math.min(1, sum);
  }
}
