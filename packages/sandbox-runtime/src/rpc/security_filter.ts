import { SandboxCapability } from '../os-sandbox/types.js';
import { SandboxCapabilityViolationError } from '../os-sandbox/errors.js';

export class RpcSecurityFilter {
  private capabilities: Map<string, Set<string>> = new Map();

  constructor(grantedCapabilities: SandboxCapability[] = []) {
    for (const cap of grantedCapabilities) {
      if (cap.granted) {
        this.grantCapability(cap.category, cap.scope);
      }
    }
  }

  public grantCapability(category: string, scope: string): void {
    if (!this.capabilities.has(category)) {
      this.capabilities.set(category, new Set());
    }
    this.capabilities.get(category)!.add(scope.toLowerCase());
  }

  public revokeCapability(category: string, scope: string): void {
    const set = this.capabilities.get(category);
    if (set) {
      set.delete(scope.toLowerCase());
    }
  }

  public checkFsReadPermission(filePath: string): void {
    let rawPath = filePath;
    try {
      rawPath = decodeURIComponent(filePath);
    } catch {}

    // 1. Intercept path traversal (both raw and decoded)
    if (
      rawPath.includes('..') ||
      rawPath.includes('\0') ||
      filePath.includes('..') ||
      filePath.includes('\0') ||
      filePath.includes('%2e%2e') ||
      filePath.includes('%2E%2E')
    ) {
      throw new SandboxCapabilityViolationError('fs_read', `Directory traversal blocked: '${filePath}'`);
    }

    // 2. Intercept sensitive system paths
    const normalized = rawPath.replace(/\\/g, '/').toLowerCase();
    if (
      normalized.startsWith('/etc/') ||
      normalized.startsWith('/root/') ||
      normalized.includes('c:/windows/') ||
      normalized.includes('c:/users/hp/appdata') ||
      normalized.includes('.ssh')
    ) {
      throw new SandboxCapabilityViolationError('fs_read', `System path access blocked: '${filePath}'`);
    }

    // 3. Verify scope permission
    const grantedScopes = this.capabilities.get('fs_read');
    const normalizedLower = normalized;
    if (
      !grantedScopes ||
      (!grantedScopes.has('*') &&
        !grantedScopes.has(normalizedLower) &&
        !grantedScopes.has(filePath.toLowerCase()))
    ) {
      const hasWildcardDir = Array.from(grantedScopes || []).some(
        s => s.endsWith('/*') && normalizedLower.startsWith(s.slice(0, -2))
      );
      if (!hasWildcardDir) {
        throw new SandboxCapabilityViolationError('fs_read', filePath);
      }
    }
  }

  public checkTableAccessPermission(tableName: string): void {
    const target = tableName.toLowerCase();
    const grantedScopes = this.capabilities.get('query');
    if (
      !grantedScopes ||
      (!grantedScopes.has('*') &&
        !grantedScopes.has(target) &&
        !grantedScopes.has(`table:${target}`))
    ) {
      throw new SandboxCapabilityViolationError('query', `table:${tableName}`);
    }
  }

  public checkToolCallPermission(toolName: string): void {
    const target = toolName.toLowerCase();
    const grantedScopes = this.capabilities.get('tool_call');
    if (!grantedScopes || (!grantedScopes.has('*') && !grantedScopes.has(target))) {
      throw new SandboxCapabilityViolationError('tool_call', toolName);
    }
  }

  public checkNetworkAccessPermission(host: string): void {
    const target = host.toLowerCase();
    const grantedScopes = this.capabilities.get('network');
    if (!grantedScopes || (!grantedScopes.has('*') && !grantedScopes.has(target))) {
      throw new SandboxCapabilityViolationError('network', host);
    }
  }
}
