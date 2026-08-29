import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VisualizationAgent,
  EChartsGenerator,
  ReportExportManager,
  HtmlBundleGenerator,
  ExecutiveReport,
} from '@gordon/core-engine';
import { CanvasStore } from '@gordon/desktop-ui';
import { TableProfile, ChartSpec } from '@gordon/shared-types';

test('Milestone 6 Acceptance Test - Declarative Visuals, Cross-Filtering, Lineage Audit, & Exporters', async () => {
  const startTime = Date.now();

  // 1. Test VisualizationAgent Recommendations
  const sampleProfile: TableProfile = {
    tableName: 'regional_sales',
    rowCount: 500,
    columnCount: 3,
    columns: [
      {
        columnName: 'sale_date',
        dataType: 'DATE',
        distinctCount: 120,
        nullPercentage: 0,
        semanticType: 'temporal:date',
      },
      {
        columnName: 'region',
        dataType: 'VARCHAR',
        distinctCount: 4,
        nullPercentage: 0,
        semanticType: 'text:categorical',
      },
      {
        columnName: 'revenue',
        dataType: 'DOUBLE',
        distinctCount: 350,
        nullPercentage: 0,
        semanticType: 'numeric:currency',
      },
    ],
    riskScore: 0,
  };

  const vizAgent = new VisualizationAgent();
  const recommendations = vizAgent.recommendVisuals(sampleProfile, 'Show revenue trend over time and region share');

  assert.ok(recommendations.length >= 3);
  const trendSpec = recommendations.find(r => r.chartSpec.chartType === 'line' || r.chartSpec.chartType === 'area');
  assert.ok(trendSpec);
  assert.equal(trendSpec.chartSpec.encoding.xField, 'sale_date');

  const barSpec = recommendations.find(r => r.chartSpec.chartType === 'bar');
  assert.ok(barSpec);
  assert.equal(barSpec.chartSpec.encoding.xField, 'region');

  // 2. Test ECharts Option Generation & Extended Palette
  const sampleRows = [
    { sale_date: '2026-01-01', region: 'North', revenue: 1500 },
    { sale_date: '2026-01-02', region: 'South', revenue: 2200 },
    { sale_date: '2026-01-03', region: 'East', revenue: 1800 },
  ];

  const echartsOpt = EChartsGenerator.generateOption(barSpec.chartSpec, sampleRows);
  assert.ok(echartsOpt.xAxis);
  assert.equal(echartsOpt.series[0].type, 'bar');
  assert.deepEqual(echartsOpt.series[0].data, [1500, 2200, 1800]);
  assert.ok(echartsOpt.color && echartsOpt.color.length >= 10); // 10-color accessible palette

  // 3. Test CanvasStore & Cross-Filtering (including Toggle-Off)
  const canvasStore = new CanvasStore();
  canvasStore.addVisualCard(trendSpec.chartSpec, { width: 8, height: 4 });
  canvasStore.addVisualCard(barSpec.chartSpec, { width: 4, height: 4 });

  const layout = canvasStore.getLayout();
  assert.equal(layout.cards.length, 2);

  // Apply cross-filtering: filter region = 'South'
  canvasStore.setCrossFilter('region', 'South', layout.cards[1].id);
  let filterState = canvasStore.getCrossFilter();
  assert.equal(filterState.activeDimension, 'region');
  assert.equal(filterState.selectedValues[0], 'South');

  // Toggle off cross-filtering: click 'South' again
  canvasStore.setCrossFilter('region', 'South', layout.cards[1].id);
  filterState = canvasStore.getCrossFilter();
  assert.equal(filterState.selectedValues.length, 0); // Toggled off cleanly

  // 4. Test Multi-Format Exporter
  const mockReport: ExecutiveReport = {
    title: 'Q3 Regional Performance Review',
    generatedAt: Date.now(),
    executiveSummary: 'Total revenue achieved $5,500.00 across all sectors.',
    sections: [
      {
        heading: '1. Executive Performance Overview',
        content: 'Regional gross revenue totaled $5,500.00 [cite: tool_rev_101] with 22.5% YoY growth.',
        citationLineageIds: ['tool_rev_101'],
      },
    ],
    totalCitations: 1,
    fullMarkdown: '# Q3 Regional Performance Review\n\nTotal revenue achieved $5,500.00 [cite: tool_rev_101].',
  };

  const exportManager = new ReportExportManager();

  // Export HTML
  const htmlExport = exportManager.exportReport(mockReport, layout, { format: 'html' });
  assert.ok(htmlExport.content.includes('<!DOCTYPE html>'));
  assert.ok(htmlExport.content.includes('Q3 Regional Performance Review'));
  assert.ok(htmlExport.byteSize > 500);

  // Export Markdown
  const mdExport = exportManager.exportReport(mockReport, layout, { format: 'markdown' });
  assert.ok(mdExport.content.includes('# Q3 Regional Performance Review'));

  // Export Reproducible SQL
  const sqlExport = exportManager.exportReport(mockReport, layout, { format: 'sql' });
  assert.ok(sqlExport.content.includes('SELECT "region", SUM("revenue")'));

  const durationMs = Date.now() - startTime;
  console.log(`[M6 Benchmark] Visuals, Canvas, and Export Verification Duration: ${durationMs}ms`);
});
