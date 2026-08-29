import { TableProfile, ColumnProfile, ChartSpec } from '@gordon/shared-types';
import { VisualRecommendation } from './types.js';

export class VisualizationAgent {
  public recommendVisuals(profile: TableProfile, goal = ''): VisualRecommendation[] {
    const recommendations: VisualRecommendation[] = [];
    const lowerGoal = goal.toLowerCase();

    // Identify temporal, numeric, and categorical columns
    const dateCols = profile.columns.filter((c: ColumnProfile) => c.semanticType.startsWith('temporal'));
    const numericCols = profile.columns.filter((c: ColumnProfile) => c.semanticType.startsWith('numeric') || c.dataType.includes('INT') || c.dataType.includes('DOUBLE'));
    const catCols = profile.columns.filter((c: ColumnProfile) => c.semanticType === 'text:categorical' || c.semanticType === 'geographic:country');

    // 1. Time-series trend chart if temporal + numeric exists
    if (dateCols.length > 0 && numericCols.length > 0) {
      const dateCol = dateCols[0].columnName;
      const numCol = numericCols[0].columnName;
      const isArea = lowerGoal.includes('area') || lowerGoal.includes('volume');

      recommendations.push({
        chartSpec: {
          id: `spec_trend_${profile.tableName}`,
          title: `${numCol.replace(/_/g, ' ').toUpperCase()} over Time`,
          chartType: isArea ? 'area' : 'line',
          tableName: profile.tableName,
          encoding: {
            xField: dateCol,
            yField: numCol,
            aggregation: 'sum',
          },
          formatting: {
            numberFormat: 'currency',
            showGridLines: true,
          },
        },
        confidenceScore: 0.95,
        rationale: `Detected temporal column '${dateCol}' and quantitative metric '${numCol}' for trend visualization.`,
      });
    }

    // 2. Categorical breakdown (Bar chart) if categorical + numeric exists
    if (catCols.length > 0 && numericCols.length > 0) {
      const catCol = catCols[0].columnName;
      const numCol = numericCols[0].columnName;

      recommendations.push({
        chartSpec: {
          id: `spec_bar_${profile.tableName}_${catCol}`,
          title: `${numCol.replace(/_/g, ' ').toUpperCase()} by ${catCol.replace(/_/g, ' ').toUpperCase()}`,
          chartType: 'bar',
          tableName: profile.tableName,
          encoding: {
            xField: catCol,
            yField: numCol,
            aggregation: 'sum',
          },
          formatting: {
            numberFormat: 'currency',
            showGridLines: true,
          },
        },
        confidenceScore: 0.90,
        rationale: `Detected categorical dimension '${catCol}' with quantitative measure '${numCol}' for categorical comparison.`,
      });
    }

    // 3. Proportion Donut/Pie chart if low cardinality category exists
    const lowCardCat = catCols.find((c: ColumnProfile) => c.distinctCount <= 7);
    if (lowCardCat && numericCols.length > 0) {
      recommendations.push({
        chartSpec: {
          id: `spec_donut_${profile.tableName}_${lowCardCat.columnName}`,
          title: `Share by ${lowCardCat.columnName.replace(/_/g, ' ').toUpperCase()}`,
          chartType: 'donut',
          tableName: profile.tableName,
          encoding: {
            categoryField: lowCardCat.columnName,
            valueField: numericCols[0].columnName,
            aggregation: 'sum',
          },
          formatting: {
            numberFormat: 'percentage',
            showLegend: true,
          },
        },
        confidenceScore: 0.85,
        rationale: `Low distinct count (${lowCardCat.distinctCount}) on '${lowCardCat.columnName}' is ideal for part-to-whole donut representation.`,
      });
    }

    // 4. KPI Card for primary numeric metric
    if (numericCols.length > 0) {
      const primaryNum = numericCols[0].columnName;
      recommendations.push({
        chartSpec: {
          id: `spec_kpi_${profile.tableName}_${primaryNum}`,
          title: `Total ${primaryNum.replace(/_/g, ' ').toUpperCase()}`,
          chartType: 'kpi_card',
          tableName: profile.tableName,
          encoding: {
            valueField: primaryNum,
            aggregation: 'sum',
          },
          formatting: {
            numberFormat: 'currency',
          },
        },
        confidenceScore: 0.92,
        rationale: `Primary executive summary metric card for '${primaryNum}'.`,
      });
    }

    return recommendations;
  }
}
