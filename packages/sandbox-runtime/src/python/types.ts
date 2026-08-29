export interface PythonSandboxLimits {
  timeoutMs?: number; // default 120,000ms (120s)
  maxMemoryMb?: number;
  allowNetwork?: boolean;
}

export interface PythonExecutionResult<T = unknown> {
  success: boolean;
  result?: T;
  stdout: string;
  stderr: string;
  error?: string;
  durationMs: number;
}
