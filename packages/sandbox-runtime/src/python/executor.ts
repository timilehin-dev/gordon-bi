import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { OsProcessSandboxSpawner } from '../os/process_spawner.js';
import { PythonSandboxLimits, PythonExecutionResult } from './types.js';

export class PythonCodeSandbox {
  private defaultTimeoutMs: number;

  constructor(limits: PythonSandboxLimits = {}) {
    this.defaultTimeoutMs = limits.timeoutMs ?? 120000; // 120s default
  }

  public async runSnippet<T = unknown>(
    code: string,
    inputs: Record<string, unknown> = {},
    customLimits?: PythonSandboxLimits
  ): Promise<PythonExecutionResult<T>> {
    const timeoutMs = customLimits?.timeoutMs ?? this.defaultTimeoutMs;
    const startTime = Date.now();
    const scriptId = `script_${randomUUID()}.py`;
    const scriptPath = join(tmpdir(), scriptId);

    // Bootstrap wrapper that loads inputs as JSON and prints result as JSON
    const wrappedCode = `
import sys
import json
import math

try:
    inputs = json.loads('''${JSON.stringify(inputs)}''')
except Exception:
    inputs = {}

def export_result(data):
    print("===GORDON_RESULT_START===")
    print(json.dumps(data))
    print("===GORDON_RESULT_END===")

${code}
`;

    try {
      writeFileSync(scriptPath, wrappedCode, 'utf-8');

      const spawned = OsProcessSandboxSpawner.spawn(
        'python',
        [scriptPath],
        { timeoutMs }
      );

      let stdout = '';
      let stderr = '';

      spawned.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
      spawned.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

      const exitResult = await spawned.onExit;
      const durationMs = Date.now() - startTime;

      try {
        unlinkSync(scriptPath);
      } catch {}

      if (exitResult.code !== 0 && exitResult.code !== null) {
        return {
          success: false,
          error: stderr || `Python process exited with code ${exitResult.code}`,
          stdout,
          stderr,
          durationMs,
        };
      }

      // Parse JSON result from delimiter
      let parsedResult: T | undefined;
      const startTag = '===GORDON_RESULT_START===';
      const endTag = '===GORDON_RESULT_END===';

      if (stdout.includes(startTag) && stdout.includes(endTag)) {
        const jsonText = stdout.substring(
          stdout.indexOf(startTag) + startTag.length,
          stdout.indexOf(endTag)
        ).trim();
        try {
          parsedResult = JSON.parse(jsonText);
        } catch {
          parsedResult = undefined;
        }
      }

      return {
        success: true,
        result: parsedResult,
        stdout,
        stderr,
        durationMs,
      };
    } catch (err: any) {
      try {
        unlinkSync(scriptPath);
      } catch {}

      const durationMs = Date.now() - startTime;
      return {
        success: false,
        error: err.message || String(err),
        stdout: '',
        stderr: err.stack || '',
        durationMs,
      };
    }
  }
}
