import test from 'node:test';
import assert from 'node:assert/strict';
import { WarehouseEngine, DatabaseConnectorTool, RestApiConnectorTool } from '@gordon/data-substrate';
import { PptxPresentationBuilderTool, WatcherManagerTool } from '@gordon/core-engine';

test('Milestone 12 Acceptance Test - Enterprise Connectors, PowerPoint Deck Builder & Scheduled Watchers', async () => {
  const startTime = Date.now();

  const warehouse = new WarehouseEngine({ dbPath: ':memory:' });
  await warehouse.initialize();

  // 1. Test Enterprise Database Connector Ingestion
  const dbIngest = await DatabaseConnectorTool.ingestFromDb(
    warehouse,
    {
      connection: { engine: 'postgres', database: 'analytics_prod', host: 'db.internal.corp' },
      query: 'SELECT id, customer_name, region, revenue, date FROM sales_records',
      targetTableName: 'postgres_sales_imported',
    },
    async () => [
      { id: 1, customer_name: 'Acme Corp', region: 'EMEA', revenue: 45000.0, date: '2026-03-01' },
      { id: 2, customer_name: 'Globex Ltd', region: 'APAC', revenue: 82000.0, date: '2026-03-02' },
      { id: 3, customer_name: 'Initech Inc', region: 'NAM', revenue: 29000.0, date: '2026-03-03' },
      { id: 4, customer_name: 'Umbrella Corp', region: 'EMEA', revenue: 61000.0, date: '2026-03-04' },
    ]
  );

  assert.equal(dbIngest.rowsIngested, 4);
  assert.equal(dbIngest.targetTableName, 'postgres_sales_imported');
  assert.equal(dbIngest.engineUsed, 'postgres');

  // Verify in DuckDB
  const duckDbCheck = await warehouse.execute('SELECT COUNT(*) AS c, SUM(revenue) AS total FROM "postgres_sales_imported"');
  assert.equal(Number(duckDbCheck.rows[0].c), 4);
  assert.equal(duckDbCheck.rows[0].total, 217000.0);

  // 2. Test Paginated REST API Connector
  const restIngest = await RestApiConnectorTool.fetchAndIngest(
    warehouse,
    {
      endpointUrl: 'https://api.stripe.com/v1/charges',
      targetTableName: 'stripe_charges_imported',
      pagination: { type: 'page_number', maxPages: 2 },
    },
    async (page) => [
      { charge_id: `ch_${page}_1`, amount: 500 * page, status: 'succeeded' },
      { charge_id: `ch_${page}_2`, amount: 750 * page, status: 'succeeded' },
    ]
  );

  assert.equal(restIngest.rowsIngested, 4);
  assert.equal(restIngest.totalPagesFetched, 2);

  const restDuckDbCheck = await warehouse.execute('SELECT COUNT(*) AS c, SUM(amount) AS total FROM "stripe_charges_imported"');
  assert.equal(Number(restDuckDbCheck.rows[0].c), 4);
  assert.equal(restDuckDbCheck.rows[0].total, 3750); // (500+750)*1 + (500+750)*2 = 1250 + 2500 = 3750

  await warehouse.close();

  // 3. Test PowerPoint OpenXML Presentation Deck Builder
  const pptx = PptxPresentationBuilderTool.buildDeck({
    deckTitle: 'Q1 2026 Executive Financial & Analytical Review',
    companyOrProject: 'Gordon Platform',
    author: 'Root Business Analyst Agent',
    theme: 'modern_dark',
    slides: [
      {
        title: 'Executive Summary',
        subtitle: 'Key Business Highlights & Forecast Projection',
        bulletPoints: [
          'Net revenue grew +24% YoY driven by enterprise expansion.',
          'Operating cash conversion cycle improved to 35.4 days.',
          'Q2 revenue forecast projected at $1.45M (80% CI: $1.38M - $1.52M).',
        ],
        kpiHighlight: { label: 'Net Retention (NDR)', value: '117%', trendDirection: 'up' },
        speakerNotes: 'Highlight to the board that unit economics and retention remain top-quartile.',
      },
      {
        title: 'Econometric Driver Attribution',
        bulletPoints: [
          'Granger Causality confirms marketing ad-spend leads pipeline expansion by 2 months (p < 0.001).',
          'Price elasticity estimated at -1.45; recommended promotional bundle preserves margin.',
        ],
        chartRecommendation: 'BarChart: Marketing Spend vs Pipeline Creation Across Cohorts',
        speakerNotes: 'Walk the CRO through the elasticity curve before discussing pricing updates.',
      },
    ],
  });

  assert.equal(pptx.slideCount, 2);
  assert.ok(pptx.openXmlManifest.includes('<p:presentation'));
  assert.ok(pptx.openXmlManifest.includes('Net revenue grew +24% YoY'));
  assert.ok(pptx.openXmlManifest.includes('<p:notes>Highlight to the board'));

  // 4. Test Scheduled Data Freshness & Anomaly Watchers
  const watcherMgr = new WatcherManagerTool();
  watcherMgr.registerWatcher({
    id: 'watcher_daily_revenue_spike',
    name: 'Daily Revenue Anomaly Watcher',
    triggerType: 'threshold_breach',
    metricThreshold: { metricName: 'DailyRevenueDrop', operator: '>', thresholdValue: 20 },
    actionTaskGoal: 'Run anomaly diagnostic on payment gateway drop',
    isEnabled: true,
  });

  assert.equal(watcherMgr.listWatchers().length, 1);

  // Normal value - no alert
  const normalCheck = watcherMgr.evaluateThreshold('watcher_daily_revenue_spike', 12);
  assert.equal(normalCheck, null);

  // Breach value - dispatches alert notification
  const breachCheck = watcherMgr.evaluateThreshold('watcher_daily_revenue_spike', 35);
  assert.ok(breachCheck !== null);
  assert.equal(breachCheck?.watcherId, 'watcher_daily_revenue_spike');
  assert.ok(breachCheck?.title.includes('Daily Revenue Anomaly Watcher Triggered'));
  assert.equal(watcherMgr.getNotifications().length, 1);

  const durationMs = Date.now() - startTime;
  console.log(`[M12 Benchmark] Connectors, Presentation & Watchers Suite Duration: ${durationMs}ms`);
});
