import { CointegrationParams, CointegrationResult } from './types.js';
import { EconometricToolError } from './errors.js';

export class CointegrationTool {
  public static calculate(params: CointegrationParams): CointegrationResult {
    const { seriesA, seriesB } = params;

    if (!Array.isArray(seriesA) || !Array.isArray(seriesB)) {
      throw new EconometricToolError('Both seriesA and seriesB must be arrays', 'INVALID_INPUT');
    }

    const n = Math.min(seriesA.length, seriesB.length);
    if (n < 15) {
      throw new EconometricToolError(`Series length (${n}) is too short for cointegration testing. Minimum 15 observations required.`, 'INSUFFICIENT_DATA');
    }

    // Step 1: OLS regression Y = alpha + beta * X
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
    for (let i = 0; i < n; i++) {
      const x = seriesA[i];
      const y = seriesB[i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
      sumYY += y * y;
    }

    const betaSlope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1e-9);
    const alphaIntercept = (sumY - betaSlope * sumX) / n;

    // Residuals e_t = Y_t - (alpha + beta * X_t)
    const residuals: number[] = [];
    let ssr = 0, sst = 0;
    const yMean = sumY / n;

    for (let i = 0; i < n; i++) {
      const pred = alphaIntercept + betaSlope * seriesA[i];
      const res = seriesB[i] - pred;
      residuals.push(res);
      ssr += res * res;
      sst += (seriesB[i] - yMean) * (seriesB[i] - yMean);
    }
    const rSquared = sst > 0 ? Math.max(0, 1 - ssr / sst) : 0;

    // Step 2: ADF test on residuals: delta(e_t) = gamma * e_{t-1} + error
    const deltaRes: number[] = [];
    const lagRes: number[] = [];

    for (let i = 1; i < n; i++) {
      deltaRes.push(residuals[i] - residuals[i - 1]);
      lagRes.push(residuals[i - 1]);
    }

    let sumLagSq = 0, sumLagDelta = 0;
    for (let i = 0; i < deltaRes.length; i++) {
      sumLagSq += lagRes[i] * lagRes[i];
      sumLagDelta += lagRes[i] * deltaRes[i];
    }

    const gamma = sumLagDelta / (sumLagSq || 1e-9);
    let ssrAdf = 0;
    for (let i = 0; i < deltaRes.length; i++) {
      const err = deltaRes[i] - gamma * lagRes[i];
      ssrAdf += err * err;
    }
    const sigmaSq = ssrAdf / (deltaRes.length - 1 || 1);
    const seGamma = Math.sqrt(sigmaSq / (sumLagSq || 1e-9));
    const adfStatistic = gamma / (seGamma || 1e-9);

    // MacKinnon 95% critical value for 2-variable cointegration test without trend
    const criticalValue95 = -3.37;
    const isCointegrated = adfStatistic < criticalValue95;

    const interpretation = isCointegrated
      ? `Stationary residuals detected (ADF=${adfStatistic.toFixed(2)} < Critical=${criticalValue95}). Series share a genuine long-run equilibrium relationship.`
      : `Non-stationary residuals (ADF=${adfStatistic.toFixed(2)} >= Critical=${criticalValue95}). Relationship is likely spurious; no cointegration established.`;

    return {
      isCointegrated,
      betaSlope: Number(betaSlope.toFixed(4)),
      alphaIntercept: Number(alphaIntercept.toFixed(4)),
      adfStatistic: Number(adfStatistic.toFixed(4)),
      criticalValue95,
      rSquared: Number(rSquared.toFixed(4)),
      interpretation,
    };
  }
}
