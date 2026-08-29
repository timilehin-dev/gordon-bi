/**
 * OS Sandbox Primitives and Security Policies
 */

export type SupportedPlatform = 'win32' | 'darwin' | 'linux';

export type SandboxIsolationLevel = 'strict_container' | 'job_restricted_token' | 'process_sandbox';

export interface SandboxCapability {
  name: string;
  category: 'fs_read' | 'fs_write' | 'network' | 'tool_call' | 'query';
  scope: string; // e.g. "table:orders", "dir:/tmp/exports"
  granted: boolean;
}

export interface SandboxPolicy {
  platform: SupportedPlatform;
  isolationLevel: SandboxIsolationLevel;
  maxMemoryBytes: number;
  maxCpuPercent: number;
  timeoutMs: number;
  allowAmbientNetwork: boolean;
  allowAmbientFileSystem: boolean;
  failClosed: boolean;
  allowedCapabilities: SandboxCapability[];
}

export interface SandboxProcessStatus {
  pid: number;
  platform: SupportedPlatform;
  isIsolated: boolean;
  isolationEngine: string;
  startedAt: number;
  memoryLimitBytes: number;
}
