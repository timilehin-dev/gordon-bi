export interface CleanMachineAuditResult {
  hasDockerDependency: boolean;
  hasBackgroundDaemonDependency: boolean;
  isLocalFirst: boolean;
  storageEngines: string[];
  installerTargetMb: number;
  memoryIdleTargetMb: number;
  isCompliant: boolean;
  auditTimestamp: number;
}
