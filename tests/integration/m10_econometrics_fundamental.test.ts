import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GrangerCausalityTool,
  CointegrationTool,
  GarchVolatilityTool,
  HpFilterTool,
  DcfValuationTool,
  FinancialRatiosTool,
  SaasUnitEconomicsTool,
  CashConversionCycleTool,
} from '@gordon/tool-registry';

test('Milestone 10 Acceptance Test - Econometrical Modeling & Fundamental Business Analysis Tools', async () => {
  const startTime = Date.now();

  // 1. Test Granger Causality
  // Series Y depends on lagged X
  const xSeries = [10, 12, 15, 18, 22, 28, 35, 42, 50, 60, 72, 85, 100, 115, 130, 150];
  const ySeries = [100, 102, 105, 110, 116, 124, 134, 146, 160, 178, 200, 225, 255, 290, 330, 375];

  const granger = GrangerCausalityTool.calculate({ xSeries, ySeries, maxLag: 2 });
  assert.equal(typeof granger.isCausal, 'boolean');
  assert.ok(granger.fStatistic >= 0);
  assert.ok(granger.rSquaredUnrestricted >= 0);
  assert.ok(granger.interpretation.length > 0);

  // 2. Test Engle-Granger Cointegration
  const seriesA = [100, 102, 105, 107, 110, 114, 118, 121, 125, 130, 134, 139, 145, 150, 156];
  const seriesB = seriesA.map(a => a * 1.5 + (Math.random() * 2 - 1)); // Cointegrated with noise

  const coint = CointegrationTool.calculate({ seriesA, seriesB });
  assert.equal(typeof coint.isCointegrated, 'boolean');
  assert.ok(coint.betaSlope > 1.3 && coint.betaSlope < 1.7);
  assert.ok(coint.rSquared > 0.95);
  assert.ok(coint.adfStatistic < 0);

  // 3. Test GARCH(1,1) Volatility & VaR
  const returns = [
    0.012, -0.008, 0.015, 0.022, -0.018, 0.005, -0.002, 0.031, -0.025, 0.014,
    -0.011, 0.009, -0.004, 0.018, -0.015, 0.007, 0.003, -0.021, 0.019, -0.013, 0.028,
  ];

  const garch = GarchVolatilityTool.calculate({ returns, confidenceLevel: 0.95 });
  assert.ok(garch.omega > 0);
  assert.ok(garch.alpha > 0);
  assert.ok(garch.beta > 0);
  assert.ok(garch.persistence <= 1.0);
  assert.ok(garch.varHorizon1 > 0);
  assert.ok(garch.cvarHorizon1 >= garch.varHorizon1);

  // 4. Test Hodrick-Prescott (HP) Filter
  const macroGdpSeries = [100, 102, 106, 103, 108, 112, 110, 115, 120, 118, 124, 130];
  const hp = HpFilterTool.calculate({ series: macroGdpSeries, lambda: 1600 });
  assert.equal(hp.trend.length, macroGdpSeries.length);
  assert.equal(hp.cycle.length, macroGdpSeries.length);
  assert.ok(hp.cycleVarianceRatio >= 0 && hp.cycleVarianceRatio <= 1);

  // 5. Test DCF Enterprise Valuation
  const dcf = DcfValuationTool.calculate({
    projectedCashFlows: [100000, 120000, 145000, 175000, 210000],
    wacc: 0.09,
    terminalGrowthRate: 0.025,
    netDebt: 50000,
    sharesOutstanding: 100000,
  });

  assert.ok(dcf.enterpriseValue > 2000000);
  assert.ok(dcf.equityValue === dcf.enterpriseValue - 50000);
  assert.ok(dcf.impliedPerShareValue! > 20);
  assert.ok(dcf.pvTerminalValuePercentage > 50);

  // 6. Test DuPont ROE & Altman Z-Score
  const ratios = FinancialRatiosTool.calculate({
    revenue: 5000000,
    netIncome: 650000,
    ebit: 900000,
    totalAssets: 4000000,
    totalLiabilities: 1500000,
    shareholderEquity: 2500000,
    workingCapital: 800000,
    retainedEarnings: 1200000,
    marketValueOfEquity: 6000000,
    interestExpense: 50000,
    ebt: 850000,
  });

  assert.equal(ratios.dupont3Way.roe, 0.26); // (650k/5M) * (5M/4M) * (4M/2.5M) = 0.13 * 1.25 * 1.6 = 0.26
  assert.ok(ratios.dupont5Way !== undefined);
  assert.ok(ratios.altmanZScore.zScore > 2.99);
  assert.equal(ratios.altmanZScore.zone, 'Safe');

  // 7. Test SaaS Unit Economics & Rule of 40
  const saas = SaasUnitEconomicsTool.calculate({
    mrrStart: 100000,
    mrrNew: 15000,
    mrrExpansion: 5000,
    mrrContraction: 1000,
    mrrChurn: 2000,
    salesAndMarketingExpense: 60000,
    grossMarginPercent: 0.80,
    activeCustomersStart: 200,
    customersLost: 4,
    operatingMarginPercent: 0.25,
  });

  assert.equal(saas.netNewMrr, 17000);
  assert.equal(saas.netDollarRetention, 1.02); // 102% NDR
  assert.ok(saas.ltvToCacRatio > 3.0);
  assert.ok(saas.cacPaybackMonths < 18);
  assert.equal(saas.isRuleOf40Healthy, true);

  // 8. Test Cash Conversion Cycle (CCC)
  const ccc = CashConversionCycleTool.calculate({
    annualRevenue: 12000000,
    annualCogs: 7200000,
    accountsReceivable: 1500000,
    inventory: 900000,
    accountsPayable: 1100000,
  });

  assert.equal(ccc.daysSalesOutstanding, 45.6);
  assert.equal(ccc.daysInventoryOutstanding, 45.6);
  assert.equal(ccc.daysPayablesOutstanding, 55.8);
  assert.equal(ccc.cashConversionCycleDays, 35.4);
  assert.ok(ccc.workingCapitalNeed > 0);

  const durationMs = Date.now() - startTime;
  console.log(`[M10 Benchmark] Econometrics & Fundamental Analysis Suite Duration: ${durationMs}ms`);
});
