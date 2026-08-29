import { InsightSynthesisInput, ExecutiveReport, NarrativeSection } from './types.js';

export class InsightGenerationAgent {
  public synthesizeReport(input: InsightSynthesisInput): ExecutiveReport {
    const sections: NarrativeSection[] = [];
    const allCitations: string[] = [];

    // 1. Executive Summary
    let summaryText = `This report provides an automated analytical evaluation for goal: "${input.businessGoal}". Analysis was conducted across ${input.totalRecords} records from dataset "${input.tableName}".`;
    if (input.forecast) {
      summaryText += ` Revenue trajectory exhibits a secular trend slope of ${input.forecast.output.trendSlope} [cite: ${input.forecast.toolExecutionId}].`;
    }
    if (input.anomalies && input.anomalies.output.anomalyCount > 0) {
      summaryText += ` Exactly ${input.anomalies.output.anomalyCount} critical outlier event(s) were flagged [cite: ${input.anomalies.toolExecutionId}].`;
    }

    sections.push({
      heading: 'Executive Summary',
      content: summaryText,
      citationLineageIds: [
        ...(input.forecast ? [input.forecast.toolExecutionId] : []),
        ...(input.anomalies ? [input.anomalies.toolExecutionId] : []),
      ],
    });

    // 2. Predictive Projections Section
    if (input.forecast) {
      const f = input.forecast.output;
      const fId = input.forecast.toolExecutionId;
      allCitations.push(fId);

      const fPointsStr = f.forecasts
        .map(p => `Period ${p.periodIndex} is projected at $${p.forecast.toFixed(2)} (80% CI: $${p.lower80.toFixed(2)} - $${p.upper80.toFixed(2)})`)
        .join('. ');

      sections.push({
        heading: 'Predictive Forecast & Horizon Projections',
        content: `Evaluated candidate models via rolling backtesting. Selected optimal model "${f.selectedModel}" with backtest RMSE of ${f.backtestRmse.toFixed(2)} and slope ${f.trendSlope} [cite: ${fId}]. Forecast projections: ${fPointsStr} [cite: ${fId}].`,
        citationLineageIds: [fId],
      });
    }

    // 3. Anomaly & Risk Analysis Section
    if (input.anomalies) {
      const a = input.anomalies.output;
      const aId = input.anomalies.toolExecutionId;
      allCitations.push(aId);

      let anomalyStr = `Baseline mean established at $${a.baselineMean.toFixed(2)} with standard deviation $${a.baselineStdDev.toFixed(2)} [cite: ${aId}].`;
      if (a.anomalies.length > 0) {
        const topAnom = a.anomalies[0];
        anomalyStr += ` Detected significant outlier at index ${topAnom.index} with value $${topAnom.actualValue.toFixed(2)} (Z-score: ${topAnom.zScore}, severity: ${topAnom.severity}) [cite: ${aId}].`;
      }

      sections.push({
        heading: 'Statistical Anomaly & Outlier Assessment',
        content: anomalyStr,
        citationLineageIds: [aId],
      });
    }

    // 4. Strategic Driver Attribution Section
    if (input.drivers) {
      const d = input.drivers.output;
      const dId = input.drivers.toolExecutionId;
      allCitations.push(dId);

      const driverStr = d.drivers
        .map(drv => `Feature "${drv.featureName}" exhibited correlation of ${drv.correlation} with coefficient ${drv.regressionCoefficient}`)
        .join('. ');

      sections.push({
        heading: 'Key Driver & Attribution Breakdown',
        content: `Evaluated multivariate drivers for target "${d.targetMetric}" across ${d.totalObservations} observations. Model fit R^2 is ${d.rSquared} [cite: ${dId}]. Key positive driver: "${d.keyPositiveDriver || 'none'}". Detailed attributions: ${driverStr} [cite: ${dId}].`,
        citationLineageIds: [dId],
      });
    }

    // Assemble Full Markdown
    let fullMarkdown = `# Executive Analytics Report: ${input.businessGoal}\n\n`;
    for (const sec of sections) {
      fullMarkdown += `## ${sec.heading}\n\n${sec.content}\n\n`;
    }

    return {
      title: `Executive Analytics Report: ${input.businessGoal}`,
      generatedAt: Date.now(),
      executiveSummary: summaryText,
      sections,
      totalCitations: allCitations.length,
      fullMarkdown,
    };
  }
}
