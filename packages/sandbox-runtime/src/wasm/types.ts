export interface WasmSandboxLimits {
  maxMemoryBytes?: number; // e.g. 128 * 1024 * 1024 (128MB default)
  timeoutMs?: number;      // e.g. 120000ms (120s default, configurable)
  allowNetwork?: boolean;  // strictly false for ad-hoc code
  allowFs?: boolean;       // strictly false for ad-hoc code
  isUserApproved?: boolean;// true if explicitly reviewed/approved by user
}

export interface ConsoleLogRecord {
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
}

export interface WasmExecutionResult<T = unknown> {
  success: boolean;
  result?: T;
  error?: string;
  durationMs: number;
  logs: ConsoleLogRecord[];
  memoryUsedBytes?: number;
}
