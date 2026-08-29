export interface DcfParams {
  projectedCashFlows: number[];
  wacc: number; // e.g. 0.09 for 9%
  terminalGrowthRate?: number; // e.g. 0.025 for 2.5%
  netDebt?: number; // Total Debt - Cash
  sharesOutstanding?: number;
}

export interface DcfResult {
  enterpriseValue: number;
  equityValue: number;
  impliedPerShareValue?: number;
  presentValueOfCashFlows: number[];
  terminalValue: number;
  presentValueOfTerminalValue: number;
  pvTerminalValuePercentage: number;
}

export interface FinancialRatiosParams {
  revenue: number;
  netIncome: number;
  ebit: number;
  totalAssets: number;
  totalLiabilities: number;
  shareholderEquity: number;
  workingCapital: number;
  retainedEarnings: number;
  marketValueOfEquity?: number;
  interestExpense?: number;
  ebt?: number;
}

export interface FinancialRatiosResult {
  dupont3Way: {
    netProfitMargin: number;
    assetTurnover: number;
    financialLeverage: number;
    roe: number;
  };
  dupont5Way?: {
    taxBurden: number;
    interestBurden: number;
    operatingMargin: number;
    assetTurnover: number;
    financialLeverage: number;
    roe: number;
  };
  altmanZScore: {
    zScore: number;
    zone: 'Safe' | 'Grey' | 'Distress';
    interpretation: string;
  };
}

export interface SaasMetricsParams {
  mrrStart: number;
  mrrNew: number;
  mrrExpansion: number;
  mrrContraction: number;
  mrrChurn: number;
  salesAndMarketingExpense: number;
  grossMarginPercent: number; // e.g. 0.78
  activeCustomersStart: number;
  customersLost: number;
  operatingMarginPercent?: number; // e.g. 0.12
}

export interface SaasMetricsResult {
  mrrEnd: number;
  netNewMrr: number;
  netDollarRetention: number; // e.g. 1.15 = 115%
  grossRevenueRetention: number;
  customerChurnRate: number;
  arpu: number;
  cac: number;
  ltv: number;
  ltvToCacRatio: number;
  cacPaybackMonths: number;
  saasMagicNumber: number;
  saasQuickRatio: number;
  ruleOf40Score: number;
  isRuleOf40Healthy: boolean;
}

export interface CashConversionCycleParams {
  annualRevenue: number;
  annualCogs: number;
  accountsReceivable: number;
  inventory: number;
  accountsPayable: number;
}

export interface CashConversionCycleResult {
  daysSalesOutstanding: number; // DSO
  daysInventoryOutstanding: number; // DIO
  daysPayablesOutstanding: number; // DPO
  cashConversionCycleDays: number; // CCC = DSO + DIO - DPO
  workingCapitalNeed: number;
  interpretation: string;
}
