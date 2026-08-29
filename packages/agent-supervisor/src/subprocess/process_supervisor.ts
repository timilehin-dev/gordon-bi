import { OsProcessSandboxSpawner, MediatedRpcBroker } from '@gordon/sandbox-runtime';
import { LineageStore } from '@gordon/data-substrate';
import { ScopedToolHandle } from '@gordon/tool-registry';
import { SubprocessAgentOptions, SubprocessExecutionResult } from './types.js';

export class SubprocessAgentSupervisor {
  private lineageStore?: LineageStore;

  constructor(lineageStore?: LineageStore) {
    this.lineageStore = lineageStore;
  }

  public async runAgent<TInput = unknown, TOutput = unknown>(
    options: SubprocessAgentOptions,
    input: TInput,
    scopedHandle: ScopedToolHandle
  ): Promise<SubprocessExecutionResult<TOutput>> {
    const startTime = Date.now();
    const config = options.agentConfig;

    // Record start in Lineage Store
    let runRecordId: string | undefined;
    if (this.lineageStore) {
      const runRecord = this.lineageStore.recordAgentRun({
        sessionId: options.sessionId,
        taskId: options.taskId,
        agentId: config.id,
        executionMode: 'supervised_subprocess',
        inputPayload: input as any,
      });
      runRecordId = runRecord.id;
    }

    try {
      // Spawn supervised process using OsProcessSandboxSpawner
      const spawned = OsProcessSandboxSpawner.spawn(
        process.execPath,
        ['--import', 'tsx', options.scriptPath, ...(options.args || [])],
        {
          timeoutMs: config.resourceLimits.timeoutMs || 30000,
          maxMemoryMb: config.resourceLimits.maxMemoryMb || 512,
        }
      );

      // Connect Mediated RPC Broker
      const rpcBroker = new MediatedRpcBroker(spawned.stdin, spawned.stdout);

      // Register mediated tool invocation handler
      // Sandboxed subprocess can ONLY invoke tools via this RPC handler, which enforces ScopedToolHandle permissions
      rpcBroker.registerMethod('invoke_tool', async (params: { toolName: string; input: any }) => {
        const toolResult = await scopedHandle.invoke(
          params.toolName,
          params.input,
          {
            sessionId: options.sessionId,
            taskId: options.taskId,
            invokedAt: Date.now(),
          }
        );
        return toolResult;
      });

      // Send execute command to agent subprocess
      const agentResponse = await rpcBroker.call<TOutput>('execute_agent', {
        agentConfig: config,
        sessionId: options.sessionId,
        taskId: options.taskId,
        input,
      });

      // Gracefully terminate subprocess
      spawned.kill();
      const exitResult = await spawned.onExit;
      const durationMs = Date.now() - startTime;

      if (this.lineageStore && runRecordId) {
        this.lineageStore.completeAgentRun(runRecordId, agentResponse, 'completed', durationMs);
      }

      return {
        success: true,
        data: agentResponse,
        exitCode: exitResult.code || 0,
        durationMs,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;

      if (this.lineageStore && runRecordId) {
        this.lineageStore.completeAgentRun(runRecordId, { error: err.message }, 'failed', durationMs);
      }

      return {
        success: false,
        error: err.message || String(err),
        durationMs,
      };
    }
  }
}
