import { ToolRegistry } from '@gordon/tool-registry';
import { LineageStore } from '@gordon/data-substrate';
import { AgentConfig } from '@gordon/shared-types';
import { OrchestratorError } from './errors.js';

export interface StubOrchestratorRunParams {
  agentConfig: AgentConfig;
  toolName: string;
  input: Record<string, unknown>;
  goal: string;
}

export interface StubOrchestratorRunResult {
  sessionId: string;
  taskId: string;
  success: boolean;
  data?: unknown;
  error?: string;
  durationMs: number;
}

export class StubOrchestrator {
  private toolRegistry: ToolRegistry;
  private lineageStore: LineageStore;

  constructor(toolRegistry: ToolRegistry, lineageStore: LineageStore) {
    this.toolRegistry = toolRegistry;
    this.lineageStore = lineageStore;
  }

  public async runTool(params: StubOrchestratorRunParams): Promise<StubOrchestratorRunResult> {
    const startTime = Date.now();

    // 1. Create Session in Lineage Store
    const session = this.lineageStore.createSession({
      name: `Session: ${params.agentConfig.name}`,
      goal: params.goal,
    });

    // 2. Start Task in Lineage Store
    const task = this.lineageStore.startTask({
      sessionId: session.id,
      title: `Execute ${params.toolName}`,
      description: `Stub orchestrator delegating to ${params.agentConfig.name}`,
      assignedAgentId: params.agentConfig.id,
    });

    // 3. Issue capability-scoped tool handle to agent
    const scopedHandle = this.toolRegistry.createScopedHandle(
      params.agentConfig.id,
      params.agentConfig.allowedTools,
      params.agentConfig.allowedCapabilities
    );

    // 4. Record agent run in Lineage Store
    const agentRun = this.lineageStore.recordAgentRun({
      sessionId: session.id,
      taskId: task.id,
      agentId: params.agentConfig.id,
      executionMode: params.agentConfig.executionMode,
      inputPayload: params.input,
    });

    try {
      // 5. Invoke tool through the scoped handle
      const toolResult = await scopedHandle.invoke(
        params.toolName,
        params.input,
        {
          sessionId: session.id,
          taskId: task.id,
          invokedAt: startTime,
        }
      );

      const durationMs = Date.now() - startTime;

      if (!toolResult.success) {
        this.lineageStore.completeAgentRun(agentRun.id, toolResult.error, 'failed', durationMs);
        this.lineageStore.completeTask(task.id, 'failed');
        this.lineageStore.completeSession(session.id, 'failed');

        return {
          sessionId: session.id,
          taskId: task.id,
          success: false,
          error: toolResult.error?.message,
          durationMs,
        };
      }

      this.lineageStore.completeAgentRun(agentRun.id, toolResult.data, 'completed', durationMs);
      this.lineageStore.completeTask(task.id, 'completed');
      this.lineageStore.completeSession(session.id, 'completed');

      return {
        sessionId: session.id,
        taskId: task.id,
        success: true,
        data: toolResult.data,
        durationMs,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      this.lineageStore.completeAgentRun(agentRun.id, { error: err.message }, 'failed', durationMs);
      this.lineageStore.completeTask(task.id, 'failed');
      this.lineageStore.completeSession(session.id, 'failed');

      return {
        sessionId: session.id,
        taskId: task.id,
        success: false,
        error: err.message || String(err),
        durationMs,
      };
    }
  }
}
