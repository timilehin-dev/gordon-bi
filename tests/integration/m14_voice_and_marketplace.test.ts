import test from 'node:test';
import assert from 'node:assert/strict';
import { GeminiLiveSessionManager } from '@gordon/core-engine';
import { MarketplaceManagerTool, CURATED_MARKETPLACE_CATALOG } from '@gordon/tool-registry';

test('Milestone 14 Acceptance Test - Gemini Live API Voice Assistant & Curated Enterprise Marketplace', async () => {
  const startTime = Date.now();

  // 1. Test Gemini Live API Voice Assistant Session Manager
  const liveSession = new GeminiLiveSessionManager({
    apiKey: 'mock_gemini_api_key_test',
    model: 'gemini-3.1-flash-live-preview',
    voiceName: 'Aoede',
    thinkingLevel: 'minimal',
  });

  const capturedEvents: string[] = [];
  liveSession.onEvent((evt) => {
    capturedEvents.push(evt.type);
  });

  await liveSession.connect();
  assert.equal(liveSession.getState().isConnected, true);
  assert.equal(liveSession.getState().isListening, true);
  assert.ok(capturedEvents.includes('connected'));

  // Test sending real-time text input
  await liveSession.sendTextMessage('Analyze Q3 churn drivers and price elasticity');
  assert.equal(liveSession.getState().inputTranscript, 'Analyze Q3 churn drivers and price elasticity');
  assert.ok(capturedEvents.includes('input_transcript'));

  // Test handling incoming Live API server events
  liveSession.handleIncomingServerPayload({
    outputTranscription: 'Net Dollar Retention is 102% and price elasticity is -1.45.',
    toolCall: {
      name: 'generate_slide_deck',
      args: { topic: 'Q3 Financial Review' },
    },
  });

  assert.equal(liveSession.getState().isSpeaking, true);
  assert.ok(liveSession.getState().outputTranscript.includes('Net Dollar Retention is 102%'));
  assert.ok(capturedEvents.includes('output_transcript'));
  assert.ok(capturedEvents.includes('tool_call'));

  // Test interruption signal
  liveSession.handleIncomingServerPayload({ interrupted: true });
  assert.equal(liveSession.getState().isSpeaking, false);
  assert.ok(capturedEvents.includes('interrupted'));

  await liveSession.disconnect();
  assert.equal(liveSession.getState().isConnected, false);

  // 2. Test Curated Enterprise Plugin Marketplace
  const marketplace = new MarketplaceManagerTool();

  // List all available plugins
  const allPlugins = marketplace.listAvailablePlugins();
  assert.ok(allPlugins.length >= 6);
  assert.equal(allPlugins.length, CURATED_MARKETPLACE_CATALOG.length);

  // Category filter
  const billingPlugins = marketplace.listAvailablePlugins('billing');
  assert.equal(billingPlugins.length, 1);
  assert.equal(billingPlugins[0].id, 'plugin-stripe-billing');

  const crmPlugins = marketplace.listAvailablePlugins('crm');
  assert.equal(crmPlugins.length, 2); // Salesforce & HubSpot

  // Search
  const searchResults = marketplace.searchPlugins('shopify');
  assert.equal(searchResults.length, 1);
  assert.equal(searchResults[0].name, 'Shopify E-Commerce Analytics');

  // Install Plugin with Signature Verification
  const installResult = marketplace.installPlugin('plugin-stripe-billing');
  assert.equal(installResult.status, 'installed');
  assert.equal(installResult.name, 'Stripe Revenue & Subscriptions');

  // Duplicate install check
  const duplicateResult = marketplace.installPlugin('plugin-stripe-billing');
  assert.equal(duplicateResult.status, 'already_installed');

  // Verify installed list
  const installedList = marketplace.getInstalledPlugins();
  assert.equal(installedList.length, 1);
  assert.equal(installedList[0].id, 'plugin-stripe-billing');

  // Uninstall Plugin
  const uninstalled = marketplace.uninstallPlugin('plugin-stripe-billing');
  assert.equal(uninstalled, true);
  assert.equal(marketplace.getInstalledPlugins().length, 0);

  const durationMs = Date.now() - startTime;
  console.log(`[M14 Benchmark] Voice Session & Marketplace Suite Duration: ${durationMs}ms`);
});
