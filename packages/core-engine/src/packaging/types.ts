export type TargetPlatform = 'windows' | 'macos' | 'linux';

export interface ReleaseBuildConfig {
  version: string;
  targetPlatform: TargetPlatform;
  appName: string;
  bundleIdentifier: string;
  enableUpdater: boolean;
}

export interface ReleaseBuildResult {
  appName: string;
  version: string;
  platform: TargetPlatform;
  installerFileName: string;
  estimatedInstallerSizeBytes: number;
  isSigned: boolean;
  builtAt: number;
}
