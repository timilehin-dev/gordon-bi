import { ChartSpec } from '@gordon/shared-types';
import { EChartsOption } from './types.js';

export class EChartsGenerator {
  public static generateOption(spec: ChartSpec, rows: any[]): EChartsOption {
    const palette = spec.formatting?.colorPalette || [
      '#2563eb',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#06b6d4',
      '#ec4899',
      '#f97316',
      '#14b8a6',
      '#6366f1',
    ];
    const title = spec.title || 'Chart';

    // Apply active dimension filter if present (cross-filtering)
    let filteredRows = rows;
    if (spec.filterDimension && spec.filterValue !== undefined) {
      filteredRows = rows.filter(r => String(r[spec.filterDimension!]) === String(spec.filterValue));
    }

    switch (spec.chartType) {
      case 'bar': {
        const xField = spec.encoding.xField || Object.keys(rows[0] || {})[0];
        const yField = spec.encoding.yField || Object.keys(rows[0] || {})[1];
        const xData = filteredRows.map(r => String(r[xField] ?? ''));
        const yData = filteredRows.map(r => Number(r[yField] ?? 0));

        return {
          title: { text: title, left: 'center' },
          tooltip: { trigger: 'axis' },
          xAxis: { type: 'category', data: xData, name: spec.formatting?.xAxisTitle || xField },
          yAxis: { type: 'value', name: spec.formatting?.yAxisTitle || yField },
          series: [
            {
              name: yField,
              type: 'bar',
              data: yData,
              itemStyle: { color: palette[0] },
            },
          ],
          color: palette,
        };
      }

      case 'line':
      case 'area': {
        const xField = spec.encoding.xField || Object.keys(rows[0] || {})[0];
        const yField = spec.encoding.yField || Object.keys(rows[0] || {})[1];
        const xData = filteredRows.map(r => String(r[xField] ?? ''));
        const yData = filteredRows.map(r => Number(r[yField] ?? 0));

        return {
          title: { text: title, left: 'center' },
          tooltip: { trigger: 'axis' },
          xAxis: { type: 'category', data: xData, name: spec.formatting?.xAxisTitle || xField },
          yAxis: { type: 'value', name: spec.formatting?.yAxisTitle || yField },
          series: [
            {
              name: yField,
              type: 'line',
              smooth: true,
              data: yData,
              areaStyle: spec.chartType === 'area' ? { opacity: 0.25 } : undefined,
              itemStyle: { color: palette[0] },
            },
          ],
          color: palette,
        };
      }

      case 'pie':
      case 'donut': {
        const catField = spec.encoding.categoryField || spec.encoding.xField || Object.keys(rows[0] || {})[0];
        const valField = spec.encoding.valueField || spec.encoding.yField || Object.keys(rows[0] || {})[1];
        const pieData = filteredRows.map(r => ({
          name: String(r[catField] ?? ''),
          value: Number(r[valField] ?? 0),
        }));

        return {
          title: { text: title, left: 'center' },
          tooltip: { trigger: 'item' },
          legend: { show: spec.formatting?.showLegend ?? true },
          series: [
            {
              name: title,
              type: 'pie',
              radius: spec.chartType === 'donut' ? ['40%', '70%'] : '65%',
              data: pieData,
            },
          ],
          color: palette,
        };
      }

      case 'scatter': {
        const xField = spec.encoding.xField || Object.keys(rows[0] || {})[0];
        const yField = spec.encoding.yField || Object.keys(rows[0] || {})[1];
        const scatterData = filteredRows.map(r => [Number(r[xField] ?? 0), Number(r[yField] ?? 0)]);

        return {
          title: { text: title, left: 'center' },
          tooltip: { trigger: 'item' },
          xAxis: { type: 'value', name: spec.formatting?.xAxisTitle || xField },
          yAxis: { type: 'value', name: spec.formatting?.yAxisTitle || yField },
          series: [
            {
              name: title,
              type: 'scatter',
              data: scatterData,
              itemStyle: { color: palette[0] },
            },
          ],
          color: palette,
        };
      }

      case 'kpi_card': {
        const valField = spec.encoding.valueField || spec.encoding.yField || Object.keys(rows[0] || {})[0];
        const sumVal = filteredRows.reduce((acc, r) => acc + Number(r[valField] ?? 0), 0);
        return {
          title: { text: title, subtext: `$${sumVal.toLocaleString()}`, left: 'center' },
          series: [],
        };
      }

      default:
        return {
          title: { text: title },
          series: [],
        };
    }
  }
}
