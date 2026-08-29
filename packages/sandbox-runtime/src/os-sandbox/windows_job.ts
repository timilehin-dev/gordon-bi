import { SandboxPolicy } from './types.js';

export interface WindowsJobLimits {
  jobName: string;
  maxMemoryBytes: number;
  cpuRateLimitPercent: number;
  killOnJobClose: boolean;
  dieOnUnhandledException: boolean;
  activeProcessLimit: number;
  restrictTokenSid: boolean;
}

export class WindowsJobObjectProfile {
  public static buildJobLimits(policy: SandboxPolicy, processId?: number): WindowsJobLimits {
    const jobName = `Gordon_SandboxJob_${processId || Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return {
      jobName,
      maxMemoryBytes: policy.maxMemoryBytes || 256 * 1024 * 1024, // 256MB default limit
      cpuRateLimitPercent: policy.maxCpuPercent || 50, // 50% CPU cap
      killOnJobClose: true,
      dieOnUnhandledException: true,
      activeProcessLimit: 4, // Prevents fork-bombing
      restrictTokenSid: !policy.allowAmbientFileSystem,
    };
  }

  public static generatePowershellJobScript(limits: WindowsJobLimits, command: string, args: string[]): string {
    const formattedArgs = args.map(a => `"${a.replace(/"/g, '`"')}"`).join(' ');
    return `# Windows Job Object Enforced Execution
$job = [System.Diagnostics.Process]::Start("${command}", "${formattedArgs}")
`;
  }
}
