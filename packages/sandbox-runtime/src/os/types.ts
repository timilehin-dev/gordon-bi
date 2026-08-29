export interface OsSandboxOptions {
  tempDir?: string;
  maxMemoryMb?: number;
  timeoutMs?: number;
  cpuQuotaPercent?: number;
  env?: Record<string, string>;
  allowNetwork?: boolean;
}

export interface SpawnedSandboxedProcess {
  pid: number;
  kill: () => void;
  stdin: NodeJS.WritableStream;
  stdout: NodeJS.ReadableStream;
  stderr: NodeJS.ReadableStream;
  onExit: Promise<{ code: number | null; signal: string | null }>;
}
