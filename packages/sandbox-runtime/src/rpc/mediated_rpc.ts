import { createInterface } from 'node:readline';
import { JsonRpcRequest, JsonRpcResponse, RpcMethodHandler } from './types.js';
import { RpcSecurityFilter } from './security_filter.js';

export class MediatedRpcBroker {
  private stdin: NodeJS.WritableStream;
  private stdout: NodeJS.ReadableStream;
  private securityFilter?: RpcSecurityFilter;
  private handlers: Map<string, RpcMethodHandler> = new Map();
  private pendingRequests: Map<string | number, { resolve: (val: any) => void; reject: (err: any) => void }> = new Map();
  private nextRequestId = 1;

  constructor(
    stdin: NodeJS.WritableStream,
    stdout: NodeJS.ReadableStream,
    securityFilter?: RpcSecurityFilter
  ) {
    this.stdin = stdin;
    this.stdout = stdout;
    this.securityFilter = securityFilter;
    this.initReader();
  }

  private initReader(): void {
    const rl = createInterface({
      input: this.stdout,
      crlfDelay: Infinity,
    });

    rl.on('line', async (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      try {
        const msg = JSON.parse(trimmed);

        // Check if it's a response to a request we sent
        if ('id' in msg && !('method' in msg)) {
          const resp = msg as JsonRpcResponse;
          const pending = this.pendingRequests.get(resp.id);
          if (pending) {
            this.pendingRequests.delete(resp.id);
            if (resp.error) {
              pending.reject(new Error(`RPC Error [${resp.error.code}]: ${resp.error.message}`));
            } else {
              pending.resolve(resp.result);
            }
          }
          return;
        }

        // It's an incoming request from the sandboxed process
        if ('method' in msg && 'id' in msg) {
          const req = msg as JsonRpcRequest;
          const handler = this.handlers.get(req.method);

          if (!handler) {
            this.sendResponse({
              jsonrpc: '2.0',
              id: req.id,
              error: { code: -32601, message: `Method '${req.method}' not found` },
            });
            return;
          }

          // Security filter validation
          if (this.securityFilter) {
            try {
              if (req.method === 'fs_read' && (req.params as any)?.path) {
                this.securityFilter.checkFsReadPermission((req.params as any).path);
              } else if (req.method === 'query_table' && (req.params as any)?.table) {
                this.securityFilter.checkTableAccessPermission((req.params as any).table);
              } else if (req.method === 'invoke_tool' && (req.params as any)?.toolName) {
                this.securityFilter.checkToolCallPermission((req.params as any).toolName);
              } else if (req.method === 'network_fetch' && (req.params as any)?.host) {
                this.securityFilter.checkNetworkAccessPermission((req.params as any).host);
              }
            } catch (secErr: any) {
              this.sendResponse({
                jsonrpc: '2.0',
                id: req.id,
                error: { code: -32403, message: `Security Violation: ${secErr.message}` },
              });
              return;
            }
          }

          try {
            const result = await handler(req.params);
            this.sendResponse({
              jsonrpc: '2.0',
              id: req.id,
              result,
            });
          } catch (err: any) {
            this.sendResponse({
              jsonrpc: '2.0',
              id: req.id,
              error: { code: -32000, message: err.message || String(err) },
            });
          }
        }
      } catch (parseErr) {
        // Invalid JSON line, ignore or log
      }
    });
  }

  public registerMethod(methodName: string, handler: RpcMethodHandler): void {
    this.handlers.set(methodName, handler);
  }

  public async call<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = this.nextRequestId++;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  private sendResponse(response: JsonRpcResponse): void {
    this.stdin.write(JSON.stringify(response) + '\n');
  }
}
