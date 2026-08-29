import { AbTestParams, AbTestResult } from './types.js';
import { StatisticsToolError } from './errors.js';

export class AbTestingTool {
  public static evaluate(params: AbTestParams): AbTestResult {
    const {
      controlVisitors,
      controlConversions,
      treatmentVisitors,
      treatmentConversions,
      alpha = 0.05,
    } = params;

    if (controlVisitors <= 0 || treatmentVisitors <= 0) {
      throw new StatisticsToolError('Visitor sample counts must be greater than zero', 'INVALID_INPUT');
    }

    const pControl = controlConversions / controlVisitors;
    const pTreatment = treatmentConversions / treatmentVisitors;

    const absoluteLift = pTreatment - pControl;
    const relativeLiftPercent = pControl > 0 ? (absoluteLift / pControl) * 100 : 0;

    // Pooled proportion for standard error
    const pooledP = (controlConversions + treatmentConversions) / (controlVisitors + treatmentVisitors);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / controlVisitors + 1 / treatmentVisitors));
    const zStatistic = absoluteLift / (se || 1e-9);

    // Two-tailed p-value
    const pValue = 2 * (1 - this.normalCdf(Math.abs(zStatistic)));
    const isSignificant = pValue < alpha;

    // 95% Confidence Interval for difference
    const seDiff = Math.sqrt(
      (pControl * (1 - pControl)) / controlVisitors +
      (pTreatment * (1 - pTreatment)) / treatmentVisitors
    );
    const ciMargin = 1.96 * seDiff;
    const confidenceInterval95: [number, number] = [
      Number((absoluteLift - ciMargin).toFixed(4)),
      Number((absoluteLift + ciMargin).toFixed(4)),
    ];

    // Bayesian Beta-Binomial approximation: Probability that Treatment > Control
    // Beta(alpha_c + conv_c, beta_c + non_conv_c)
    const bayesianProb = this.calculateBayesianSuperiority(
      controlConversions + 1,
      controlVisitors - controlConversions + 1,
      treatmentConversions + 1,
      treatmentVisitors - treatmentConversions + 1
    );

    let recommendation: 'Adopt Treatment' | 'Retain Control' | 'Continue Experiment';
    if (isSignificant && absoluteLift > 0 && bayesianProb >= 0.95) {
      recommendation = 'Adopt Treatment';
    } else if (isSignificant && absoluteLift < 0 && bayesianProb <= 0.05) {
      recommendation = 'Retain Control';
    } else {
      recommendation = 'Continue Experiment';
    }

    return {
      controlRate: Number(pControl.toFixed(4)),
      treatmentRate: Number(pTreatment.toFixed(4)),
      absoluteLift: Number(absoluteLift.toFixed(4)),
      relativeLiftPercent: Number(relativeLiftPercent.toFixed(2)),
      zStatistic: Number(zStatistic.toFixed(4)),
      pValue: Number(pValue.toFixed(4)),
      isSignificant,
      confidenceInterval95,
      bayesianProbabilityTreatmentBeatsControl: Number(bayesianProb.toFixed(4)),
      recommendation,
    };
  }

  private static calculateBayesianSuperiority(a1: number, b1: number, a2: number, b2: number): number {
    // Normal approximation of Beta difference for large samples
    const mean1 = a1 / (a1 + b1);
    const var1 = (a1 * b1) / (Math.pow(a1 + b1, 2) * (a1 + b1 + 1));

    const mean2 = a2 / (a2 + b2);
    const var2 = (a2 * b2) / (Math.pow(a2 + b2, 2) * (a2 + b2 + 1));

    const diffMean = mean2 - mean1;
    const diffStd = Math.sqrt(var1 + var2);

    const z = diffMean / (diffStd || 1e-9);
    return this.normalCdf(z);
  }

  private static normalCdf(z: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = z < 0 ? -1 : 1;
    const absX = Math.abs(z);
    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
    return 0.5 * (1 + sign * y);
  }
}
