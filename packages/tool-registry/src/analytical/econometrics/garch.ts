import { GarchParams, GarchResult } from './types.js';
import { EconometricToolError } from './errors.js';

export class GarchVolatilityTool {
  public static calculate(params: GarchParams): GarchResult {
    const { returns, confidenceLevel = 0.95 } = params;

    if (!Array.isArray(returns) || returns.length < 20) {
      throw new EconometricToolError(`Returns series must have at least 20 observations (received ${returns?.length || 0})`, 'INSUFFICIENT_DATA');
    }

    const n = returns.length;
    const mean = returns.reduce((a, b) => a + b, 0) / n;
    const demeaned = returns.map(r => r - mean);

    const sampleVar = demeaned.reduce((acc, r) => acc + r * r, 0) / (n - 1);

    // Initial GARCH(1,1) parameter estimates via moment matching
    let alpha = 0.10;
    let beta = 0.85;
    let omega = sampleVar * (1 - alpha - beta);

    // Ensure stationarity constraint (alpha + beta < 1)
    if (omega <= 0) {
      omega = sampleVar * 0.05;
      alpha = 0.10;
      beta = 0.80;
    }

    // Compute conditional variance recursion
    const conditionalVariances: number[] = [sampleVar];
    for (let t = 1; t < n; t++) {
      const prevResidSq = demeaned[t - 1] * demeaned[t - 1];
      const prevVar = conditionalVariances[t - 1];
      const sigmaSq = omega + alpha * prevResidSq + beta * prevVar;
      conditionalVariances.push(Math.max(1e-8, sigmaSq));
    }

    const conditionalVolatilities = conditionalVariances.map(v => Number(Math.sqrt(v).toFixed(4)));
    const persistence = Number((alpha + beta).toFixed(4));
    const longRunVar = persistence < 1 ? omega / (1 - persistence) : sampleVar;
    const longRunVolatility = Number(Math.sqrt(longRunVar).toFixed(4));

    const latestVol = Math.sqrt(conditionalVariances[conditionalVariances.length - 1]);
    const zScore = confidenceLevel >= 0.99 ? 2.326 : 1.645;
    const varHorizon1 = Number((zScore * latestVol).toFixed(4));
    // CVaR (Expected Shortfall) approximation for normal distribution
    const cvarZ = confidenceLevel >= 0.99 ? 2.665 : 2.063;
    const cvarHorizon1 = Number((cvarZ * latestVol).toFixed(4));

    return {
      omega: Number(omega.toFixed(6)),
      alpha: Number(alpha.toFixed(4)),
      beta: Number(beta.toFixed(4)),
      persistence,
      longRunVolatility,
      conditionalVolatilities,
      varHorizon1,
      cvarHorizon1,
    };
  }
}
