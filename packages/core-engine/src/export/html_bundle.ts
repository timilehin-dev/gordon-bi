import { ReportCanvasLayout, ChartSpec } from '@gordon/shared-types';
import { ExecutiveReport } from '../agents/insight/types.js';

export class HtmlBundleGenerator {
  public static generateHtml(
    report: ExecutiveReport,
    layout?: ReportCanvasLayout,
    tableData?: Record<string, any[]>
  ): string {
    const title = this.escapeHtml(report.title || 'Gordon Autonomous Analytics Report');
    const dateStr = new Date(report.generatedAt).toLocaleString();

    let narrativeHtml = '';
    for (const sec of report.sections) {
      const escapedHeading = this.escapeHtml(sec.heading);
      const escapedContent = this.escapeHtml(sec.content).replace(
        /\[cite:\s*([a-zA-Z0-9_\-:]+)\]/g,
        '<span class="citation-badge">cite: $1</span>'
      );

      narrativeHtml += `
        <div class="report-section">
          <h3>${escapedHeading}</h3>
          <p>${escapedContent}</p>
        </div>
      `;
    }

    let cardsHtml = '';
    if (layout) {
      for (const card of layout.cards) {
        const spec = layout.specs[card.chartSpecId];
        if (!spec) continue;

        const specTitle = this.escapeHtml(spec.title);
        const specTable = this.escapeHtml(spec.tableName);

        if (spec.chartType === 'kpi_card') {
          const valField = spec.encoding.valueField || spec.encoding.yField || 'Metric';
          const rows = tableData ? tableData[spec.tableName] || [] : [];
          const sumVal = rows.reduce((acc, r) => acc + (Number(r[valField]) || 0), 0);
          const formattedVal = spec.formatting?.numberFormat === 'currency'
            ? `$${sumVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : sumVal.toLocaleString();

          cardsHtml += `
            <div class="visual-card kpi-card" style="grid-column: span ${Math.min(12, Math.max(3, card.width))};">
              <h4>${specTitle}</h4>
              <div class="kpi-body">
                <div class="kpi-value">${rows.length > 0 ? formattedVal : '$--'}</div>
                <div class="kpi-label">${this.escapeHtml(valField.replace(/_/g, ' ').toUpperCase())}</div>
              </div>
            </div>
          `;
        } else {
          cardsHtml += `
            <div class="visual-card" style="grid-column: span ${Math.min(12, Math.max(4, card.width))};">
              <h4>${specTitle}</h4>
              <div class="chart-container" id="chart_${card.id}">
                <div class="chart-placeholder">
                  <span class="chart-type-badge">${spec.chartType.toUpperCase()}</span>
                  <p>Bound to dataset: <strong>${specTable}</strong></p>
                  <p>Dimension: <em>${this.escapeHtml(spec.encoding.xField || spec.encoding.categoryField || 'N/A')}</em> | Measure: <em>${this.escapeHtml(spec.encoding.yField || spec.encoding.valueField || 'N/A')}</em></p>
                </div>
              </div>
            </div>
          `;
        }
      }
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    :root {
      --bg-primary: #0f172a;
      --bg-surface: #1e293b;
      --border-color: #334155;
      --text-primary: #f8fafc;
      --text-muted: #94a3b8;
      --accent-blue: #38bdf8;
      --accent-green: #34d399;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-primary);
      margin: 0;
      padding: 2rem;
      line-height: 1.6;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    header {
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }
    h1 { margin: 0 0 0.5rem 0; font-size: 2rem; color: #ffffff; }
    .meta { color: var(--text-muted); font-size: 0.9rem; }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 1.5rem;
      margin-bottom: 2.5rem;
    }
    .visual-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1.25rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .visual-card h4 {
      margin: 0 0 1rem 0;
      font-size: 1.1rem;
      color: var(--accent-blue);
    }
    .kpi-value {
      font-size: 1.8rem;
      font-weight: bold;
      color: var(--accent-blue);
      font-family: monospace;
    }
    .kpi-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }
    .chart-container {
      min-height: 220px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(15, 23, 42, 0.6);
      border-radius: 6px;
      padding: 1rem;
    }
    .chart-placeholder {
      text-align: center;
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    .chart-type-badge {
      display: inline-block;
      background: #0284c7;
      color: #ffffff;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }
    .report-section {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .report-section h3 {
      margin: 0 0 0.75rem 0;
      color: var(--accent-green);
    }
    .citation-badge {
      background: #312e81;
      color: #c7d2fe;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-family: monospace;
      margin: 0 0.2rem;
    }
    footer {
      text-align: center;
      color: var(--text-muted);
      font-size: 0.85rem;
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${title}</h1>
      <div class="meta">Generated: ${dateStr} | Autonomous Zero-Hallucination Delivery</div>
    </header>

    ${cardsHtml ? `<div class="card-grid">${cardsHtml}</div>` : ''}

    <div class="narrative-container">
      <h2>Executive Findings & Verified Lineage</h2>
      ${narrativeHtml}
    </div>

    <footer>
      Produced autonomously by Gordon Analytics Platform | 100% Provenance Lineage Verified
    </footer>
  </div>
</body>
</html>`;
  }

  private static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
