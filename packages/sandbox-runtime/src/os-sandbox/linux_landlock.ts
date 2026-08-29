import { SandboxPolicy } from './types.js';

export class LinuxLandlockProfile {
  public static buildBwrapArgs(policy: SandboxPolicy, sandboxDir: string): string[] {
    const args = [
      '--unshare-all',
      '--die-with-parent',
      '--dir', '/tmp',
      '--proc', '/proc',
      '--dev', '/dev',
      '--ro-bind', '/usr', '/usr',
      '--ro-bind', '/lib', '/lib',
      '--ro-bind', '/lib64', '/lib64',
      '--ro-bind', '/bin', '/bin',
      '--bind', sandboxDir, sandboxDir,
      '--chdir', sandboxDir,
    ];

    if (!policy.allowAmbientNetwork) {
      args.push('--unshare-net');
    }

    return args;
  }
}
