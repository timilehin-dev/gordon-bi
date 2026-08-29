import { PriceElasticityParams, PriceElasticityResult } from './types.js';
import { OptimizationError } from './errors.js';

export class PriceElasticityTool {
  public static calculate(params: PriceElasticityParams): PriceElasticityResult {
    const { priceHistory, quantityHistory, unitMarginalCost } = params;

    if (!Array.isArray(priceHistory) || !Array.isArray(quantityHistory)) {
      throw new OptimizationError('Price and quantity history must be arrays', 'INVALID_INPUT');
    }

    const n = Math.min(priceHistory.length, quantityHistory.length);
    if (n < 4) {
      throw new OptimizationError(`Need at least 4 price-quantity data points (received ${n})`, 'INSUFFICIENT_DATA');
    }

    // Filter positive values for log transformation
    const validPairs: { p: number; q: number }[] = [];
    for (let i = 0; i < n; i++) {
      if (priceHistory[i] > 0 && quantityHistory[i] > 0) {
        validPairs.push({ p: priceHistory[i], q: quantityHistory[i] });
      }
    }

    if (validPairs.length < 4) {
      throw new OptimizationError('At least 4 strictly positive price-quantity pairs are required', 'INVALID_INPUT');
    }

    // Log-log OLS: ln(Q) = ln(a) + e * ln(P)
    let sumLnP = 0, sumLnQ = 0, sumLnPLnQ = 0, sumLnPSq = 0, sumLnQSq = 0;
    let sumP = 0, sumQ = 0, sumRevenue = 0;
    const m = validPairs.length;

    for (const pair of validPairs) {
      const lnP = Math.log(pair.p);
      const lnQ = Math.log(pair.q);
      sumLnP += lnP;
      sumLnQ += lnQ;
      sumLnPLnQ += lnP * lnQ;
      sumLnPSq += lnP * lnP;
      sumLnQSq += lnQ * lnQ;

      sumP += pair.p;
      sumQ += pair.q;
      sumRevenue += pair.p * pair.q;
    }

    const elasticity = (m * sumLnPLnQ - sumLnP * sumLnQ) / (m * sumLnPSq - sumLnP * sumLnP || 1e-9);
    const lnA = (sumLnQ - elasticity * sumLnP) / m;
    const demandConstant = Math.exp(lnA);

    // R-squared
    let ssr = 0, sst = 0;
    const meanLnQ = sumLnQ / m;
    for (const pair of validPairs) {
      const predLnQ = lnA + elasticity * Math.log(pair.p);
      const actLnQ = Math.log(pair.q);
      ssr += (actLnQ - predLnQ) * (actLnQ - predLnQ);
      sst += (actLnQ - meanLnQ) * (actLnQ - meanLnQ);
    }
    const rSquared = sst > 0 ? Math.max(0, 1 - ssr / sst) : 0;

    const currentAveragePrice = Number((sumP / m).toFixed(2));
    const currentAverageRevenue = Number((sumRevenue / m).toFixed(2));
    const isElastic = Math.abs(elasticity) > 1.0;

    let optimalPrice: number | undefined;
    let expectedOptimalRevenue: number | undefined;

    if (unitMarginalCost && unitMarginalCost > 0 && elasticity < -1.0) {
      // Optimal price P* = MC * (e / (1 + e))
      optimalPrice = Number((unitMarginalCost * (elasticity / (1 + elasticity))).toFixed(2));
      const expectedQ = demandConstant * Math.pow(optimalPrice, elasticity);
      expectedOptimalRevenue = Number((optimalPrice * expectedQ).toFixed(2));
    }

    let interpretation: string;
    if (isElastic) {
      interpretation = `Demand is price-elastic (e = ${elasticity.toFixed(2)}). A 1% increase in price leads to a ${Math.abs(elasticity).toFixed(2)}% drop in volume. Lowering prices may increase total revenue.`;
    } else {
      interpretation = `Demand is price-inelastic (e = ${elasticity.toFixed(2)}). A 1% increase in price leads to only a ${Math.abs(elasticity).toFixed(2)}% drop in volume. Raising prices will increase total revenue.`;
    }

    return {
      elasticity: Number(elasticity.toFixed(4)),
      isElastic,
      demandConstant: Number(demandConstant.toFixed(2)),
      rSquared: Number(rSquared.toFixed(4)),
      currentAveragePrice,
      currentAverageRevenue,
      optimalPrice,
      expectedOptimalRevenue,
      interpretation,
    };
  }
}
