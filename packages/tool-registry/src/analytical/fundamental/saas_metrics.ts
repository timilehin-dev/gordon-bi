import { SaasMetricsParams, SaasMetricsResult } from './types.js';
import { FundamentalAnalysisError } from './errors.js';

export class SaasUnitEconomicsTool {
  public static calculate(params: SaasMetricsParams): SaasMetricsResult {
    const {
      mrrStart,
      mrrNew,
      mrrExpansion,
      mrrContraction,
      mrrChurn,
      salesAndMarketingExpense,
      grossMarginPercent,
      activeCustomersStart,
      customersLost,
      operatingMarginPercent = 0.15,
    } = params;

    if (mrrStart <= 0 || activeCustomersStart <= 0) {
      throw new FundamentalAnalysisError('Starting MRR and starting active customer count must be greater than zero', 'INVALID_INPUT');
    }

    const netNewMrr = mrrNew + mrrExpansion - mrrContraction - mrrChurn;
    const mrrEnd = mrrStart + netNewMrr;

    // NDR = (mrrStart + mrrExpansion - mrrContraction - mrrChurn) / mrrStart
    const netDollarRetention = Number(((mrrStart + mrrExpansion - mrrContraction - mrrChurn) / mrrStart).toFixed(4));
    // GRR = (mrrStart - mrrContraction - mrrChurn) / mrrStart
    const grossRevenueRetention = Number((Math.max(0, mrrStart - mrrContraction - mrrChurn) / mrrStart).toFixed(4));

    const customerChurnRate = Number((customersLost / activeCustomersStart).toFixed(4));
    const avgCustomers = Math.max(1, activeCustomersStart - customersLost / 2);
    const arpu = Number((mrrEnd / avgCustomers).toFixed(2));

    // Approximate new customers acquired based on average ARPU
    const newCustomersEstimated = Math.max(1, Math.round(mrrNew / (arpu || 1)));
    const cac = Number((salesAndMarketingExpense / newCustomersEstimated).toFixed(2));

    const monthlyCustomerChurn = Math.max(0.005, customerChurnRate);
    const customerLifetimeMonths = 1 / monthlyCustomerChurn;
    const ltv = Number((arpu * grossMarginPercent * customerLifetimeMonths).toFixed(2));
    const ltvToCacRatio = Number((ltv / (cac || 1)).toFixed(2));

    const monthlyGrossProfitPerCustomer = arpu * grossMarginPercent;
    const cacPaybackMonths = Number((cac / (monthlyGrossProfitPerCustomer || 1)).toFixed(1));

    // SaaS Magic Number = (Net New ARR) / S&M Expense = (netNewMrr * 12) / S&M
    const saasMagicNumber = salesAndMarketingExpense > 0
      ? Number(((netNewMrr * 12) / salesAndMarketingExpense).toFixed(2))
      : 0;

    // SaaS Quick Ratio = (New MRR + Expansion MRR) / (Contraction MRR + Churn MRR)
    const churnContraction = mrrContraction + mrrChurn;
    const saasQuickRatio = churnContraction > 0
      ? Number(((mrrNew + mrrExpansion) / churnContraction).toFixed(2))
      : Number(((mrrNew + mrrExpansion) / 1).toFixed(2));

    // Rule of 40: Annual Growth % + Operating Margin %
    const annualizedGrowthRate = (netNewMrr * 12) / (mrrStart * 12);
    const ruleOf40Score = Number(((annualizedGrowthRate + operatingMarginPercent) * 100).toFixed(1));
    const isRuleOf40Healthy = ruleOf40Score >= 40.0;

    return {
      mrrEnd: Number(mrrEnd.toFixed(2)),
      netNewMrr: Number(netNewMrr.toFixed(2)),
      netDollarRetention,
      grossRevenueRetention,
      customerChurnRate,
      arpu,
      cac,
      ltv,
      ltvToCacRatio,
      cacPaybackMonths,
      saasMagicNumber,
      saasQuickRatio,
      ruleOf40Score,
      isRuleOf40Healthy,
    };
  }
}
