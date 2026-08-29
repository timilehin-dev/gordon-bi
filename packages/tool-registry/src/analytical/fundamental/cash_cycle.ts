import { CashConversionCycleParams, CashConversionCycleResult } from './types.js';
import { FundamentalAnalysisError } from './errors.js';

export class CashConversionCycleTool {
  public static calculate(params: CashConversionCycleParams): CashConversionCycleResult {
    const { annualRevenue, annualCogs, accountsReceivable, inventory, accountsPayable } = params;

    if (annualRevenue <= 0) {
      throw new FundamentalAnalysisError('Annual revenue must be a positive number', 'INVALID_INPUT');
    }

    const safeCogs = Math.max(1e-4, annualCogs);
    const daysSalesOutstanding = Number(((accountsReceivable / annualRevenue) * 365).toFixed(1));
    const daysInventoryOutstanding = annualCogs > 0 ? Number(((inventory / safeCogs) * 365).toFixed(1)) : 0;
    const daysPayablesOutstanding = annualCogs > 0 ? Number(((accountsPayable / safeCogs) * 365).toFixed(1)) : 0;

    const cashConversionCycleDays = Number((daysSalesOutstanding + daysInventoryOutstanding - daysPayablesOutstanding).toFixed(1));
    const dailyCost = annualCogs / 365;
    const workingCapitalNeed = Number((cashConversionCycleDays * dailyCost).toFixed(2));

    let interpretation: string;
    if (cashConversionCycleDays < 0) {
      interpretation = `Negative Cash Conversion Cycle (${cashConversionCycleDays} days). Company collects cash from customers before paying suppliers, generating working capital float.`;
    } else if (cashConversionCycleDays <= 45) {
      interpretation = `Efficient Cash Conversion Cycle (${cashConversionCycleDays} days). High operational working capital velocity.`;
    } else {
      interpretation = `Long Cash Conversion Cycle (${cashConversionCycleDays} days). Capital is tied up in receivables and inventory for ${cashConversionCycleDays} days before returning as cash.`;
    }

    return {
      daysSalesOutstanding,
      daysInventoryOutstanding,
      daysPayablesOutstanding,
      cashConversionCycleDays,
      workingCapitalNeed,
      interpretation,
    };
  }
}
