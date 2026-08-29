import { FinancialRatiosParams, FinancialRatiosResult } from './types.js';
import { FundamentalAnalysisError } from './errors.js';

export class FinancialRatiosTool {
  public static calculate(params: FinancialRatiosParams): FinancialRatiosResult {
    const {
      revenue,
      netIncome,
      ebit,
      totalAssets,
      totalLiabilities,
      shareholderEquity,
      workingCapital,
      retainedEarnings,
      marketValueOfEquity = shareholderEquity,
      interestExpense,
      ebt,
    } = params;

    if (totalAssets <= 0 || shareholderEquity <= 0 || revenue <= 0) {
      throw new FundamentalAnalysisError('Total assets, shareholder equity, and revenue must be positive numbers', 'INVALID_INPUT');
    }

    // DuPont 3-Way: Net Margin * Asset Turnover * Equity Multiplier
    const netProfitMargin = netIncome / revenue;
    const assetTurnover = revenue / totalAssets;
    const financialLeverage = totalAssets / shareholderEquity;
    const roe3 = netProfitMargin * assetTurnover * financialLeverage;

    const dupont3Way = {
      netProfitMargin: Number(netProfitMargin.toFixed(4)),
      assetTurnover: Number(assetTurnover.toFixed(4)),
      financialLeverage: Number(financialLeverage.toFixed(4)),
      roe: Number(roe3.toFixed(4)),
    };

    // DuPont 5-Way (if EBT and Interest are provided)
    let dupont5Way;
    if (ebt && ebt > 0 && ebit > 0) {
      const taxBurden = netIncome / ebt;
      const interestBurden = ebt / ebit;
      const operatingMargin = ebit / revenue;
      const roe5 = taxBurden * interestBurden * operatingMargin * assetTurnover * financialLeverage;

      dupont5Way = {
        taxBurden: Number(taxBurden.toFixed(4)),
        interestBurden: Number(interestBurden.toFixed(4)),
        operatingMargin: Number(operatingMargin.toFixed(4)),
        assetTurnover: Number(assetTurnover.toFixed(4)),
        financialLeverage: Number(financialLeverage.toFixed(4)),
        roe: Number(roe5.toFixed(4)),
      };
    }

    // Altman Z-Score for public/manufacturing companies:
    // Z = 1.2*X1 + 1.4*X2 + 3.3*X3 + 0.6*X4 + 0.999*X5
    // X1 = Working Capital / Total Assets
    // X2 = Retained Earnings / Total Assets
    // X3 = EBIT / Total Assets
    // X4 = Market Value of Equity / Total Liabilities
    // X5 = Sales / Total Assets
    const x1 = workingCapital / totalAssets;
    const x2 = retainedEarnings / totalAssets;
    const x3 = ebit / totalAssets;
    const x4 = marketValueOfEquity / Math.max(1e-6, totalLiabilities);
    const x5 = revenue / totalAssets;

    const zScoreVal = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 0.999 * x5;
    const zScore = Number(zScoreVal.toFixed(2));

    let zone: 'Safe' | 'Grey' | 'Distress';
    let interpretation: string;

    if (zScore > 2.99) {
      zone = 'Safe';
      interpretation = `Altman Z-Score of ${zScore} indicates strong financial health (Safe Zone > 2.99). Low bankruptcy probability.`;
    } else if (zScore >= 1.81) {
      zone = 'Grey';
      interpretation = `Altman Z-Score of ${zScore} indicates moderate risk (Grey Zone 1.81 - 2.99). Financial monitoring advised.`;
    } else {
      zone = 'Distress';
      interpretation = `Altman Z-Score of ${zScore} indicates high financial distress (Distress Zone < 1.81). High probability of insolvency within 2 years.`;
    }

    return {
      dupont3Way,
      dupont5Way,
      altmanZScore: {
        zScore,
        zone,
        interpretation,
      },
    };
  }
}
