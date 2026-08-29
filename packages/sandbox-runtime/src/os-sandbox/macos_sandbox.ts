import { SandboxPolicy } from './types.js';

export class MacOsSandboxProfile {
  public static generateSchemeProfile(policy: SandboxPolicy, allowedDirs: string[] = []): string {
    const dirRules = allowedDirs
      .map(d => `(allow file-read* file-write* (subpath "${d}"))`)
      .join('\n');

    const networkRule = policy.allowAmbientNetwork
      ? '(allow network*)'
      : '(deny network* (with send-signal SIGKILL))';

    return `;; Gordon macOS Sandbox Profile (Seatbelt/sandbox-exec)
(version 1)
(deny default)

;; Basic process execution intrinsics
(allow process-exec)
(allow process-fork)
(allow sysctl-read)

;; Memory and basic system calls
(allow mach-lookup)
(allow signal (target self))

;; Explicit File System Boundaries
(allow file-read* (subpath "/usr/lib") (subpath "/usr/share") (subpath "/System"))
${dirRules}

;; Strict Network Boundary
${networkRule}
`;
  }
}
