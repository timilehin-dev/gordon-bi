import test from 'node:test';
import assert from 'node:assert/strict';
import { LineageStore } from '@gordon/data-substrate';
import {
  ToolRegistry,
  TimeSeriesForecasterTool,
  AnomalyDetectionTool,
  DriverAnalysisTool,
} from '@gordon/tool-registry';
import {
  ForecastingAgent,
  AnomalyDetectionAgent,
  TrendCorrelationAgent,
  CriticVerifierAgent,
} from '@gordon/core-engine';

test('Milestone 3 Acceptance Test - Analytical Sub-Agents & Adversarial Critic Verification', async () => {
  const lineageStore = new LineageStore({ dbPath: ':memory:' });
  const toolRegistry = new ToolRegistry(lineageStore);

  // 1. Register analytical tools
  toolRegistry.register(TimeSeriesForecasterTool);
  toolRegistry.register(AnomalyDetectionTool);
  toolRegistry.register(DriverAnalysisTool);

  const session = lineageStore.createSession({
    name: 'M3 Analytical Verification Session',
    goal: 'Test forecasting, anomaly detection, driver analysis, and adversarial critic verification',
  });

  // 2. Execute Forecasting Agent
  const forecastTask = lineageStore.startTask({
    sessionId: session.id,
    title: 'Run Revenue Forecast',
    description: 'Decompose and forecast next 3 quarters',
    assignedAgentId: 'forecasting_agent',
  });

  const forecastHandle = toolRegistry.createScopedHandle(
    'forecasting_agent',
    ['ts_forecast_multimodel'],
    ['ml:forecast', 'stats:compute']
  );

  const forecaster = new ForecastingAgent();
  const historicalRevenue = [100, 110, 120, 130, 140, 150]; // +10 per period
  const forecastOutput = await forecaster.execute(
    {
      sessionId: session.id,
      taskId: forecastTask.id,
      series: historicalRevenue,
      horizon: 3,
      metricName: 'revenue_k_usd',
    },
    forecastHandle
  );

  assert.equal(forecastOutput.selectedModel, 'linear_trend');
  assert.equal(forecastOutput.trendSlope, 10);
  assert.equal(forecastOutput.forecasts.length, 3);
  assert.equal(forecastOutput.forecasts[0].forecast, 160.0);
  assert.equal(forecastOutput.forecasts[1].forecast, 170.0);
  assert.equal(forecastOutput.forecasts[2].forecast, 180.0);

  lineageStore.completeTask(forecastTask.id, 'completed');

  // 3. Execute Anomaly Detection Agent
  const anomalyTask = lineageStore.startTask({
    sessionId: session.id,
    title: 'Scan for Cost Outliers',
    description: 'Scan monthly operational expenses for anomalies',
    assignedAgentId: 'anomaly_detection_agent',
  });

  const anomalyHandle = toolRegistry.createScopedHandle(
    'anomaly_detection_agent',
    ['stat_anomaly_changepoint_scan'],
    ['ml:anomaly', 'stats:compute']
  );

  const anomalyDetector = new AnomalyDetectionAgent();
  const monthlyExpenses = [45, 48, 47, 50, 46, 195, 52]; // 195 is clear outlier
  const anomalyOutput = await anomalyDetector.execute(
    {
      sessionId: session.id,
      taskId: anomalyTask.id,
      series: monthlyExpenses,
      sensitivity: 'medium',
      metricName: 'monthly_opex_k',
    },
    anomalyHandle
  );

  assert.equal(anomalyOutput.anomalyCount, 1);
  assert.equal(anomalyOutput.anomalies[0].actualValue, 195);
  assert.ok(['medium', 'high', 'critical'].includes(anomalyOutput.anomalies[0].severity));

  lineageStore.completeTask(anomalyTask.id, 'completed');

  // 4. Critic / Verifier Agent QA Pass
  const critic = new CriticVerifierAgent(lineageStore);

  // Test Case A: Truthful Narrative (100% ground truth verified against Lineage Store)
  const truthfulNarrative = `
    Based on our time-series model, historical revenue grew with a trend slope of 10 per period.
    The projected revenue for next period is $160.00, followed by $170.00 in the subsequent quarter.
    An operational expense anomaly was detected at $195.00 against a baseline average of $69.00.
  `;

  const truthfulAudit = critic.auditNarrative(session.id, truthfulNarrative);
  assert.equal(truthfulAudit.isApproved, true, 'Truthful narrative must pass Critic QA audit');
  assert.equal(truthfulAudit.unsupportedCount, 0);
  assert.equal(truthfulAudit.inconsistentCount, 0);
  assert.equal(truthfulAudit.auditPassRate, 1.0);

  // Test Case B: Adversarial Hallucination Attack (Fabricated numbers and claims)
  const hallucinatedNarrative = `
    Based on our time-series model, revenue skyrocketed to $9,999.00 with growth of 88.5%.
    The projected revenue for next period is $550.00.
    Operational costs dropped to $12.00.
  `;

  const adversarialAudit = critic.auditNarrative(session.id, hallucinatedNarrative);
  assert.equal(adversarialAudit.isApproved, false, 'Hallucinated narrative must be rejected by Critic QA');
  assert.ok(adversarialAudit.unsupportedCount >= 3, 'Must flag unsupported/fabricated claims');
  assert.ok(adversarialAudit.rejectionReasons.length >= 3);
  assert.ok(adversarialAudit.auditPassRate < 0.5);

  lineageStore.close();
});
