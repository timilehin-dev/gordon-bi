import { McpServerConfig, McpToolDescriptor } from '@gordon/shared-types';
import { OsProcessSandboxSpawner, MediatedRpcBroker } from '@gordon/sandbox-runtime';
import { RunningMcpServer, McpExecutionResult } from './types.js';
import { McpManagerError } from './errors.js';

export class LocalMcpProcessManager {
  private servers: Map<string, RunningMcpServer> = new Map();
  private brokers: Map<string, MediatedRpcBroker> = new Map();

  public async registerAndStartServer(config: McpServerConfig): Promise<RunningMcpServer> {
    if (this.servers.has(config.id)) {
      throw new McpManagerError(`MCP Server '${config.id}' is already running`, 'SERVER_ALREADY_RUNNING');
    }

    try {
      const spawned = OsProcessSandboxSpawner.spawn(config.command, config.args, {
        env: config.env,
        timeoutMs: 0, // Daemon process until killed
      });

      const broker = new MediatedRpcBroker(spawned.stdin, spawned.stdout);
      this.brokers.set(config.id, broker);

      // Perform initial handshake / list tools
      let tools: McpToolDescriptor[] = [];
      try {
        const response = await broker.call<{ tools: McpToolDescriptor[] }>('tools/list', {});
        tools = response.tools || [];
      } catch {
        // If server starts without explicit tool list immediately, set placeholder
        tools = [];
      }

      const serverInfo: RunningMcpServer = {
        config,
        pid: spawned.pid,
        tools,
        status: 'running',
        lastHealthCheck: Date.now(),
      };

      this.servers.set(config.id, serverInfo);
      return serverInfo;
    } catch (err: any) {
      throw new McpManagerError(`Failed to start MCP server '${config.name}': ${err.message}`, 'SERVER_START_FAILED', err);
    }
  }

  public async callTool<T = unknown>(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<McpExecutionResult<T>> {
    const broker = this.brokers.get(serverId);
    if (!broker) {
      throw new McpManagerError(`MCP Server '${serverId}' is not running`, 'SERVER_NOT_FOUND');
    }

    const startTime = Date.now();
    try {
      const result = await broker.call<T>('tools/call', {
        name: toolName,
        arguments: args,
      });

      return {
        success: true,
        data: result,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || String(err),
        durationMs: Date.now() - startTime,
      };
    }
  }

  public stopServer(serverId: string): boolean {
    const server = this.servers.get(serverId);
    if (!server) return false;

    this.brokers.delete(serverId);
    this.servers.delete(serverId);
    return true;
  }

  public listRunningServers(): RunningMcpServer[] {
    return Array.from(this.servers.values());
  }
}
