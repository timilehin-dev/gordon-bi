import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { ReleaseBuilderTool } from '@gordon/core-engine';

test('Milestone 15 Acceptance Test - Multi-Platform Release Packaging & GitHub Actions CI/CD', async () => {
  const startTime = Date.now();

  // 1. Verify Windows Installer Simulation
  const winBuild = ReleaseBuilderTool.simulateBuild({
    appName: 'Gordon',
    version: '0.1.0',
    targetPlatform: 'windows',
    bundleIdentifier: 'com.gordon.analytics',
    enableUpdater: true,
  });

  assert.equal(winBuild.platform, 'windows');
  assert.equal(winBuild.installerFileName, 'Gordon_0.1.0_x64-setup.exe');
  assert.ok(winBuild.estimatedInstallerSizeBytes < 100 * 1024 * 1024); // < 100 MB budget
  assert.equal(winBuild.isSigned, true);

  // 2. Verify macOS Universal DMG Simulation
  const macBuild = ReleaseBuilderTool.simulateBuild({
    appName: 'Gordon',
    version: '0.1.0',
    targetPlatform: 'macos',
    bundleIdentifier: 'com.gordon.analytics',
    enableUpdater: true,
  });

  assert.equal(macBuild.platform, 'macos');
  assert.equal(macBuild.installerFileName, 'Gordon_0.1.0_universal.dmg');
  assert.ok(macBuild.estimatedInstallerSizeBytes < 100 * 1024 * 1024);

  // 3. Verify Linux DEB Simulation
  const linuxBuild = ReleaseBuilderTool.simulateBuild({
    appName: 'Gordon',
    version: '0.1.0',
    targetPlatform: 'linux',
    bundleIdentifier: 'com.gordon.analytics',
    enableUpdater: true,
  });

  assert.equal(linuxBuild.platform, 'linux');
  assert.equal(linuxBuild.installerFileName, 'gordon_0.1.0_amd64.deb');
  assert.ok(linuxBuild.estimatedInstallerSizeBytes < 100 * 1024 * 1024);

  // 4. Verify GitHub Actions CI/CD Workflow file exists and defines target platforms
  const workflowPath = 'c:/Users/HP/Downloads/gordon/.github/workflows/release.yml';
  assert.ok(existsSync(workflowPath));

  const workflowContent = readFileSync(workflowPath, 'utf-8');
  assert.ok(workflowContent.includes('windows-latest'));
  assert.ok(workflowContent.includes('macos-latest'));
  assert.ok(workflowContent.includes('ubuntu-22.04'));
  assert.ok(workflowContent.includes('tauri build'));
  assert.ok(workflowContent.includes('softprops/action-gh-release'));

  const durationMs = Date.now() - startTime;
  console.log(`[M15 Benchmark] Packaging & Release CI/CD Suite Duration: ${durationMs}ms`);
});
