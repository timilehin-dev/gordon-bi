import { ReleaseBuildConfig, ReleaseBuildResult, TargetPlatform } from './types.js';

export class ReleaseBuilderTool {
  public static simulateBuild(config: ReleaseBuildConfig): ReleaseBuildResult {
    const { version, targetPlatform, appName } = config;

    let installerFileName: string;
    let estimatedSize = 48 * 1024 * 1024; // ~48 MB

    switch (targetPlatform) {
      case 'windows':
        installerFileName = `${appName}_${version}_x64-setup.exe`;
        estimatedSize = 52 * 1024 * 1024; // ~52 MB
        break;
      case 'macos':
        installerFileName = `${appName}_${version}_universal.dmg`;
        estimatedSize = 64 * 1024 * 1024; // ~64 MB
        break;
      case 'linux':
        installerFileName = `${appName.toLowerCase()}_${version}_amd64.deb`;
        estimatedSize = 42 * 1024 * 1024; // ~42 MB
        break;
    }

    return {
      appName,
      version,
      platform: targetPlatform,
      installerFileName,
      estimatedInstallerSizeBytes: estimatedSize,
      isSigned: true,
      builtAt: Date.now(),
    };
  }
}
