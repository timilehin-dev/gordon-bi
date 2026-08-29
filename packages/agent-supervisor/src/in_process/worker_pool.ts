import { LineageStore } from '@gordon/data-substrate';
import { InProcessAgentTask, InProcessExecutionResult } from './types.js';

export class InProcessWorkerPool {
  private activeWorkers = new Set<string>();
  private lineageStore?: LineageStore;

  constructor(lineageStore?: LineageStore) {
    this.lineageStore = lineageStore;
  }

  public async runTask<TInput, TOutput>(task: InProcessAgentTask<TInput, TOutput>): Promise<InProcessExecutionResult<TOutput>> {
    const startTime = Date.now();
    this.activeWorkers.add(task.taskId);

    // Record agent run start in Lineage Store
    let runRecordId: string | undefined;
    if (this.lineageStore) {
      const runRecord = this.lineageStore.recordAgentRun({
        sessionId: task.sessionId,
        taskId: task.taskId,
        agentId: task.agentConfig.id,
        executionMode: 'in_process',
        inputPayload: task.input as any,
      });
      runRecordId = runRecord.id;
    }

    const context = {
      sessionId: task.sessionId,
      taskId: task.taskId,
      agentId: task.agentConfig.id,
      invokedAt: startTime,
    };

    try {
      // Timeout promise
      const timeoutMs = task.agentConfig.resourceLimits.timeoutMs || 30000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Agent '${task.agentConfig.name}' execution timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      // Execute task
      const result = await Promise.race([
        task.handler(task.input, task.scopedHandle, context),
        timeoutPromise,
      ]);

      const durationMs = Date.now() - startTime;
      this.activeWorkers.delete(task.taskId);

      if (this.lineageStore && runRecordId) {
        this.lineageStore.completeAgentRun(runRecordId, result, 'completed', durationMs);
      }

      return {
        success: true,
        data: result,
        durationMs,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      this.activeWorkers.delete(task.taskId);

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

  public getActiveWorkerCount(): number {
    return this.activeWorkers.size;
  }
}
