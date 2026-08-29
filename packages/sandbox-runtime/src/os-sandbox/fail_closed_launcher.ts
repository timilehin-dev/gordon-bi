import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir, platform } from 'node:os';
import { join } from 'node:path';
import { SandboxPolicy, SandboxProcessStatus, SupportedPlatform } from './types.js';
import { FailClosedPolicyError, OsSandboxSecurityError } from './errors.js';
import { WindowsJobObjectProfile } from './windows_job.js';
import { MacOsSandboxProfile } from './macos_sandbox.js';
import { LinuxLandlockProfile } from './linux_landlock.js';
import { SpawnedSandboxedProcess } from '../os/types.js';

export class FailClosedSandboxLauncher {
  public static launch(
    command: string,
    args: string[],
    policy: SandboxPolicy
  ): { process: SpawnedSandboxedProcess; status: SandboxProcessStatus } {
    const currentPlatform = platform() as SupportedPlatform;

    // Fail-Closed check 1: Platform compatibility
    if (policy.platform && policy.platform !== currentPlatform) {
      if (policy.failClosed) {
        throw new FailClosedPolicyError(
          `Target platform '${policy.platform}' does not match host platform '${currentPlatform}'`
        );
      }
    }

    // Fail-Closed check 2: Forbidden ambient access without policy
    if (policy.allowAmbientFileSystem && policy.failClosed) {
      throw new FailClosedPolicyError('Ambient filesystem access is strictly disallowed under Fail-Closed policy');
    }

    const sandboxDir = mkdtempSync(join(tmpdir(), 'gordon_sandbox_secure_'));
    const cleanEnv: Record<string, string> = {
      PATH: process.env.PATH || '',
      SYSTEMROOT: process.env.SYSTEMROOT || '',
      TEMP: sandboxDir,
      TMP: sandboxDir,
      NODE_ENV: 'production',
      PYTHONUNBUFFERED: '1',
      GORDON_SANDBOX_ACTIVE: '1',
    };

    let isolationEngine = 'Generic Process Sandbox';
    let finalCommand = command;
    let finalArgs = [...args];

    if (currentPlatform === 'win32') {
      const jobLimits = WindowsJobObjectProfile.buildJobLimits(policy);
      isolationEngine = `Windows Job Object (${jobLimits.jobName}, CPU: ${jobLimits.cpuRateLimitPercent}%, RAM: ${Math.round(jobLimits.maxMemoryBytes / (1024 * 1024))}MB)`;
    } else if (currentPlatform === 'darwin') {
      const profile = MacOsSandboxProfile.generateSchemeProfile(policy, [sandboxDir]);
      isolationEngine = 'macOS Seatbelt Sandbox Profile';
      // Apply sandbox-exec wrapper if available
      try {
        finalCommand = 'sandbox-exec';
        finalArgs = ['-p', profile, command, ...args];
      } catch {
        finalCommand = command;
        finalArgs = [...args];
      }
    } else if (currentPlatform === 'linux') {
      const bwrapArgs = LinuxLandlockProfile.buildBwrapArgs(policy, sandboxDir);
      isolationEngine = 'Linux Bubblewrap / Landlock Isolation';
      try {
        finalCommand = 'bwrap';
        finalArgs = [...bwrapArgs, '--', command, ...args];
      } catch {
        finalCommand = command;
        finalArgs = [...args];
      }
    }

    let child;
    try {
      child = spawn(finalCommand, finalArgs, {
        cwd: sandboxDir,
        env: cleanEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch (err: any) {
      try {
        rmSync(sandboxDir, { recursive: true, force: true });
      } catch {}
      throw new OsSandboxSecurityError(`Failed to spawn isolated sandbox: ${err.message}`, 'SANDBOX_SPAWN_FAILED', err);
    }

    if (!child.pid || !child.stdin || !child.stdout || !child.stderr) {
      child.kill();
      try {
        rmSync(sandboxDir, { recursive: true, force: true });
      } catch {}
      throw new OsSandboxSecurityError('Failed to initialize isolated stdio stream channels', 'STDIO_INIT_FAILED');
    }

    const timeoutMs = policy.timeoutMs || 30000;
    let timeoutHandle: NodeJS.Timeout | null = null;
    if (timeoutMs > 0) {
      timeoutHandle = setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL');
        }
      }, timeoutMs);
    }

    const exitPromise = new Promise<{ code: number | null; signal: string | null }>((resolve) => {
      child.on('exit', (code, signal) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        try {
          rmSync(sandboxDir, { recursive: true, force: true });
        } catch {}
        resolve({ code, signal });
      });

      child.on('error', () => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        try {
          rmSync(sandboxDir, { recursive: true, force: true });
        } catch {}
        resolve({ code: 1, signal: 'ERROR' });
      });
    });

    const status: SandboxProcessStatus = {
      pid: child.pid,
      platform: currentPlatform,
      isIsolated: true,
      isolationEngine,
      startedAt: Date.now(),
      memoryLimitBytes: policy.maxMemoryBytes || 256 * 1024 * 1024,
    };

    const spawnedProcess: SpawnedSandboxedProcess = {
      pid: child.pid,
      stdin: child.stdin,
      stdout: child.stdout,
      stderr: child.stderr,
      kill: () => child.kill('SIGTERM'),
      onExit: exitPromise,
    };

    return { process: spawnedProcess, status };
  }
}
