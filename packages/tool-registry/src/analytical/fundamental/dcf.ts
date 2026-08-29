import { DcfParams, DcfResult } from './types.js';
import { FundamentalAnalysisError } from './errors.js';

export class DcfValuationTool {
  public static calculate(params: DcfParams): DcfResult {
    const { projectedCashFlows, wacc, terminalGrowthRate = 0.025, netDebt = 0, sharesOutstanding } = params;

    if (!Array.isArray(projectedCashFlows) || projectedCashFlows.length === 0) {
      throw new FundamentalAnalysisError('Projected cash flows array cannot be empty', 'INVALID_INPUT');
    }

    if (wacc <= terminalGrowthRate) {
      throw new FundamentalAnalysisError(`WACC (${wacc * 100}%) must be greater than terminal growth rate (${terminalGrowthRate * 100}%) for Gordon Growth convergence`, 'INVALID_WACC');
    }

    const n = projectedCashFlows.length;
    let sumPvCashFlows = 0;
    const presentValueOfCashFlows: number[] = [];

    for (let t = 1; t <= n; t++) {
      const discountFactor = Math.pow(1 + wacc, t);
      const pv = projectedCashFlows[t - 1] / discountFactor;
      presentValueOfCashFlows.push(Number(pv.toFixed(2)));
      sumPvCashFlows += pv;
    }

    const lastCashFlow = projectedCashFlows[n - 1];
    const terminalValue = (lastCashFlow * (1 + terminalGrowthRate)) / (wacc - terminalGrowthRate);
    const presentValueOfTerminalValue = terminalValue / Math.pow(1 + wacc, n);

    const enterpriseValue = sumPvCashFlows + presentValueOfTerminalValue;
    const equityValue = enterpriseValue - netDebt;

    const pvTerminalValuePercentage = enterpriseValue > 0
      ? Number(((presentValueOfTerminalValue / enterpriseValue) * 100).toFixed(2))
      : 0;
    const impliedPerShareValue = sharesOutstanding && sharesOutstanding > 0
      ? Number((equityValue / sharesOutstanding).toFixed(2))
      : undefined;

    return {
      enterpriseValue: Number(enterpriseValue.toFixed(2)),
      equityValue: Number(equityValue.toFixed(2)),
      impliedPerShareValue,
      presentValueOfCashFlows,
      terminalValue: Number(terminalValue.toFixed(2)),
      presentValueOfTerminalValue: Number(presentValueOfTerminalValue.toFixed(2)),
      pvTerminalValuePercentage,
    };
  }
}
