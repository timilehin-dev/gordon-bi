import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import {
  PluginManifestValidator,
  FailClosedSandboxLauncher,
  RpcSecurityFilter,
  MediatedRpcBroker,
  FailClosedPolicyError,
  SandboxCapabilityViolationError,
  SandboxPolicy,
  PluginManifest,
} from '@gordon/sandbox-runtime';

test('Milestone 7 Acceptance Test - Untrusted Plugin Sandboxing & Mediated RPC Security', async () => {
  const startTime = Date.now();

  // 1. Test Manifest Validation & Plain-English Consent Generation
  const validManifest: PluginManifest = {
    id: 'community_nlp_sentiment',
    name: 'Customer Feedback Sentiment Analyzer',
    version: '1.2.0',
    description: 'Calculates sentiment scores on customer ticket text chunks.',
    runtime: 'python',
    entryPoint: 'sentiment_tool.py',
    author: { name: 'NLP Analytics Org' },
    permissions: [
      { category: 'query', scope: 'table:feedback', description: 'Read feedback reviews', required: true },
      { category: 'tool_call', scope: 'stat_anomaly_changepoint_scan', description: 'Flag negative sentiment drops', required: false },
    ],
    tools: [
      {
        name: 'nlp_sentiment_score',
        displayName: 'Sentiment Scorer',
        description: 'Outputs polarity between -1.0 and 1.0',
      },
    ],
  };

  const parsed = PluginManifestValidator.validate(validManifest);
  assert.equal(parsed.id, 'community_nlp_sentiment');
  assert.equal(parsed.permissions.length, 2);

  const consent = PluginManifestValidator.generateConsentSummary(parsed);
  assert.equal(consent.pluginName, 'Customer Feedback Sentiment Analyzer');
  assert.equal(consent.plainEnglishPermissions.length, 2);
  assert.ok(consent.plainEnglishPermissions[0].title.includes('table:feedback'));

  // Test invalid manifest rejection
  assert.throws(
    () => PluginManifestValidator.validate({ id: 'bad@id!' }),
    /PluginManifestValidationError/
  );

  // 2. Test Fail-Closed Policy Enforcement
  const policy: SandboxPolicy = {
    platform: process.platform as any,
    isolationLevel: 'job_restricted_token',
    maxMemoryBytes: 256 * 1024 * 1024,
    maxCpuPercent: 50,
    timeoutMs: 5000,
    allowAmbientNetwork: false,
    allowAmbientFileSystem: false,
    failClosed: true,
    allowedCapabilities: [
      { name: 'query_table', category: 'query', scope: 'table:feedback', granted: true },
    ],
  };

  // Forbidden ambient access under fail-closed
  const invalidPolicy = { ...policy, allowAmbientFileSystem: true };
  assert.throws(
    () => FailClosedSandboxLauncher.launch('node', ['-v'], invalidPolicy),
    FailClosedPolicyError
  );

  // 3. Test Adversarial RPC Security Filter
  const securityFilter = new RpcSecurityFilter(policy.allowedCapabilities);

  // Allowed table access (case-insensitive)
  assert.doesNotThrow(() => securityFilter.checkTableAccessPermission('feedback'));
  assert.doesNotThrow(() => securityFilter.checkTableAccessPermission('Feedback'));
  assert.doesNotThrow(() => securityFilter.checkTableAccessPermission('FEEDBACK'));

  // Denied unauthorized table access
  assert.throws(
    () => securityFilter.checkTableAccessPermission('passwords_table'),
    SandboxCapabilityViolationError
  );

  // Denied directory traversal and sensitive paths
  assert.throws(
    () => securityFilter.checkFsReadPermission('../../etc/passwd'),
    SandboxCapabilityViolationError
  );

  // Denied URL-encoded directory traversal
  assert.throws(
    () => securityFilter.checkFsReadPermission('%2e%2e%2fetc%2fpasswd'),
    SandboxCapabilityViolationError
  );

  assert.throws(
    () => securityFilter.checkFsReadPermission('/etc/shadow'),
    SandboxCapabilityViolationError
  );

  // Denied ungranted network access
  assert.throws(
    () => securityFilter.checkNetworkAccessPermission('https://evil-exfiltration-domain.com'),
    SandboxCapabilityViolationError
  );

  // 4. Test Mediated I/O RPC Broker with Security Filter
  const hostToPluginStream = new PassThrough();
  const pluginToHostStream = new PassThrough();

  const broker = new MediatedRpcBroker(hostToPluginStream, pluginToHostStream, securityFilter);

  // Register host handler for allowed queries
  broker.registerMethod('query_table', async (params: any) => {
    return { rows: [{ id: 1, text: 'Great service!', sentiment: 0.95 }], rowCount: 1 };
  });

  // Host sends request to plugin
  const hostCallPromise = broker.call('compute_score', { text: 'Great service!' });

  // Simulate plugin responding
  pluginToHostStream.write(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { score: 0.95 } }) + '\n');
  const result: any = await hostCallPromise;
  assert.equal(result.score, 0.95);

  const durationMs = Date.now() - startTime;
  console.log(`[M7 Benchmark] OS Sandbox & RPC Security Verification Duration: ${durationMs}ms`);
});
