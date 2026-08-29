import { spawn, ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OsSandboxOptions, SpawnedSandboxedProcess } from './types.js';
import { OsSandboxError } from './errors.js';

export class OsProcessSandboxSpawner {
  public static spawn(
    command: string,
    args: string[],
    options: OsSandboxOptions = {}
  ): SpawnedSandboxedProcess {
    const sandboxDir = options.tempDir || mkdtempSync(join(tmpdir(), 'gordon_sandbox_'));
    const timeoutMs = options.timeoutMs || 30000;

    // Cleaned environment - no ambient credentials
    const cleanEnv: Record<string, string> = {
      PATH: process.env.PATH || '',
      SYSTEMROOT: process.env.SYSTEMROOT || '',
      TEMP: sandboxDir,
      TMP: sandboxDir,
      NODE_ENV: 'production',
      PYTHONUNBUFFERED: '1',
      ...(options.env || {}),
    };

    let child: ChildProcess;
    try {
      child = spawn(command, args, {
        cwd: sandboxDir,
        env: cleanEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch (err: any) {
      try {
        rmSync(sandboxDir, { recursive: true, force: true });
      } catch {}
      throw new OsSandboxError(`Failed to spawn sandboxed process: ${err.message}`, 'SPAWN_ERROR', err);
    }

    if (!child.pid || !child.stdin || !child.stdout || !child.stderr) {
      child.kill();
      try {
        rmSync(sandboxDir, { recursive: true, force: true });
      } catch {}
      throw new OsSandboxError('Failed to establish stdio pipes for sandboxed process', 'PIPE_ERROR');
    }

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

    return {
      pid: child.pid,
      stdin: child.stdin,
      stdout: child.stdout,
      stderr: child.stderr,
      kill: () => child.kill('SIGTERM'),
      onExit: exitPromise,
    };
  }
}
