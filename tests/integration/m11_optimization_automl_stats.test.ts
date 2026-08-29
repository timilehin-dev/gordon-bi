import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SimplexOptimizerTool,
  GoalSeekTool,
  PriceElasticityTool,
  HypothesisTestingTool,
  DistributionFitTool,
  AbTestingTool,
  AutoMlLeaderboardTool,
} from '@gordon/tool-registry';

test('Milestone 11 Acceptance Test - Mathematical Optimization, Statistical Testing & In-Process AutoML', async () => {
  const startTime = Date.now();

  // 1. Test Simplex Linear Programming Optimizer
  // Maximize 40*x1 + 30*x2 (Profit)
  // Subject to:
  // 1*x1 + 2*x2 <= 16 (Labor hours)
  // 3*x1 + 1*x2 <= 18 (Raw materials)
  const simplex = SimplexOptimizerTool.solve({
    objectiveCoefficients: [40, 30],
    goal: 'maximize',
    constraints: [
      { coefficients: [1, 2], operator: '<=', rhs: 16, name: 'labor_hours' },
      { coefficients: [3, 1], operator: '<=', rhs: 18, name: 'raw_materials' },
    ],
    variableNames: ['StandardProduct', 'PremiumProduct'],
  });

  assert.equal(simplex.status, 'optimal');
  assert.equal(simplex.optimalValue, 340); // x1 = 4, x2 = 6, 40*4 + 30*6 = 160 + 180 = 340
  assert.ok(simplex.solution.StandardProduct >= 0);
  assert.ok(simplex.solution.PremiumProduct >= 0);

  // 2. Test Goal Seek Root Finding
  // Target: Revenue of 500,000 where formula is Units * 125 - 5000
  const goalSeek = GoalSeekTool.solve({
    targetValue: 500000,
    initialGuess: 1000,
    evalExpression: 'x * 125 - 5000',
    tolerance: 0.01,
  });

  assert.equal(goalSeek.isConverged, true);
  assert.equal(goalSeek.solvedInput, 4040); // 4040 * 125 - 5000 = 505000 - 5000 = 500000
  assert.equal(goalSeek.achievedValue, 500000);

  // 3. Test Price Elasticity & Yield Optimization
  const priceHistory = [10, 12, 15, 18, 20];
  const quantityHistory = [1000, 810, 620, 480, 410];

  const elasticity = PriceElasticityTool.calculate({
    priceHistory,
    quantityHistory,
    unitMarginalCost: 6.0,
  });

  assert.ok(elasticity.elasticity < -1.0);
  assert.equal(elasticity.isElastic, true);
  assert.ok(elasticity.optimalPrice! > 6.0);
  assert.ok(elasticity.expectedOptimalRevenue! > 0);

  // 4. Test Hypothesis Testing Suite
  // Two-sample t-test
  const groupA = [12.5, 13.1, 12.8, 14.0, 13.5, 12.9, 13.2];
  const groupB = [10.2, 10.8, 11.1, 10.5, 10.9, 11.4, 10.7];

  const tTest = HypothesisTestingTool.runTest({
    testType: 'two_sample_ttest',
    groupA,
    groupB,
  });
  assert.equal(tTest.isSignificant, true);
  assert.ok(tTest.pValue < 0.001);
  assert.ok(tTest.effectSize! > 1.5);

  // ANOVA F-test
  const groupC = [15.1, 15.5, 14.8, 15.9, 15.2];
  const anova = HypothesisTestingTool.runTest({
    testType: 'one_way_anova',
    groupA,
    groupB,
    groupsAnova: [groupA, groupB, groupC],
  });
  assert.equal(anova.isSignificant, true);
  assert.ok(anova.testStatistic > 10);

  // Chi-Square test
  const contingencyTable = [
    [50, 20], // Desktop: Converted, Not Converted
    [30, 80], // Mobile: Converted, Not Converted
  ];
  const chiSq = HypothesisTestingTool.runTest({
    testType: 'chi_square_independence',
    groupA: [],
    contingencyTable,
  });
  assert.equal(chiSq.isSignificant, true);

  // 5. Test Distribution Fitting
  const normalData = [20.1, 21.4, 19.8, 20.5, 22.1, 18.9, 20.3, 21.0, 19.5, 20.8, 21.2, 20.0];
  const fit = DistributionFitTool.fit({ data: normalData });
  assert.ok(fit.bestFit !== undefined);
  assert.ok(fit.allCandidates.length >= 2);
  assert.ok(fit.bestFit.ksStatistic >= 0);

  // 6. Test A/B Testing Evaluation
  const ab = AbTestingTool.evaluate({
    controlVisitors: 10000,
    controlConversions: 450, // 4.5%
    treatmentVisitors: 10000,
    treatmentConversions: 550, // 5.5%
  });
  assert.equal(ab.isSignificant, true);
  assert.equal(ab.controlRate, 0.045);
  assert.equal(ab.treatmentRate, 0.055);
  assert.equal(ab.relativeLiftPercent, 22.22);
  assert.ok(ab.bayesianProbabilityTreatmentBeatsControl > 0.99);
  assert.equal(ab.recommendation, 'Adopt Treatment');

  // 7. Test In-Process AutoML Model Leaderboard
  const dataset = [
    { ad_spend: 1000, organic_visits: 500, price: 50, revenue: 6500 },
    { ad_spend: 1200, organic_visits: 550, price: 48, revenue: 7400 },
    { ad_spend: 1500, organic_visits: 620, price: 52, revenue: 9100 },
    { ad_spend: 2000, organic_visits: 700, price: 49, revenue: 11800 },
    { ad_spend: 2500, organic_visits: 810, price: 51, revenue: 14200 },
    { ad_spend: 3000, organic_visits: 950, price: 47, revenue: 17500 },
    { ad_spend: 3500, organic_visits: 1020, price: 53, revenue: 19800 },
    { ad_spend: 4000, organic_visits: 1150, price: 50, revenue: 23100 },
    { ad_spend: 4500, organic_visits: 1280, price: 48, revenue: 26000 },
    { ad_spend: 5000, organic_visits: 1400, price: 52, revenue: 29500 },
  ];

  const autoMl = AutoMlLeaderboardTool.evaluate({
    task: 'regression',
    features: ['ad_spend', 'organic_visits', 'price'],
    target: 'revenue',
    dataset,
    cvFolds: 3,
  });

  assert.equal(autoMl.leaderboard.length, 3);
  assert.ok(autoMl.bestModelName.length > 0);
  assert.equal(autoMl.featureImportances.length, 3);
  assert.ok(autoMl.featureImportances[0].importance >= autoMl.featureImportances[1].importance);
  assert.ok(autoMl.executiveSummary.length > 0);

  const durationMs = Date.now() - startTime;
  console.log(`[M11 Benchmark] Optimization, Stats, & AutoML Suite Duration: ${durationMs}ms`);
});
