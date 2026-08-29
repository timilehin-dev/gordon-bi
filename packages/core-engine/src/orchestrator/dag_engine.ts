import { ToolRegistry } from '@gordon/tool-registry';
import { LineageStore } from '@gordon/data-substrate';
import { AgentConfigLoader } from '../config/agent_config_loader.js';
import { TaskDag, TaskDagNode, DagExecutionResult, TaskNodeExecutionResult } from './types.js';
import { OrchestratorError } from './errors.js';

export class DagOrchestratorEngine {
  private toolRegistry: ToolRegistry;
  private lineageStore: LineageStore;
  private configLoader: AgentConfigLoader;

  constructor(toolRegistry: ToolRegistry, lineageStore: LineageStore, configLoader: AgentConfigLoader) {
    this.toolRegistry = toolRegistry;
    this.lineageStore = lineageStore;
    this.configLoader = configLoader;
  }

  public async executeDag(dag: TaskDag): Promise<DagExecutionResult> {
    const startTime = Date.now();

    // 1. Create Session
    const session = this.lineageStore.createSession({
      name: `DAG Run: ${dag.id}`,
      goal: dag.goal,
    });

    const completedNodes = new Set<string>();
    const nodeResults = new Map<string, TaskNodeExecutionResult>();
    const pendingNodes = new Map<string, TaskDagNode>(dag.nodes.map(n => [n.id, n]));

    try {
      while (pendingNodes.size > 0) {
        // Find all nodes whose dependencies are satisfied
        const readyNodes: TaskDagNode[] = [];
        for (const [nodeId, node] of pendingNodes.entries()) {
          const depsSatisfied = node.dependencies.every(d => completedNodes.has(d));
          if (depsSatisfied) {
            readyNodes.push(node);
          }
        }

        if (readyNodes.length === 0) {
          throw new OrchestratorError('Deadlock detected in DAG: unresolvable circular dependencies', 'DAG_DEADLOCK');
        }

        // Execute ready nodes concurrently
        const executionPromises = readyNodes.map(async (node) => {
          const nodeStartTime = Date.now();

          // Check agent config
          const agentConfig = this.configLoader.getConfig(node.assignedAgentId);
          if (!agentConfig) {
            throw new OrchestratorError(`Assigned agent '${node.assignedAgentId}' not found in configuration`, 'AGENT_NOT_FOUND');
          }

          // Start task in lineage store
          const task = this.lineageStore.startTask({
            sessionId: session.id,
            title: node.title,
            description: node.description,
            assignedAgentId: agentConfig.id,
          });

          // Add lineage edges for dependencies
          for (const depId of node.dependencies) {
            this.lineageStore.addLineageEdge({
              sessionId: session.id,
              sourceType: 'task',
              sourceId: depId,
              targetType: 'task',
              targetId: task.id,
              relation: 'derived_from',
            });
          }

          // Issue scoped handle
          const scopedHandle = this.toolRegistry.createScopedHandle(
            agentConfig.id,
            agentConfig.allowedTools,
            agentConfig.allowedCapabilities
          );

          // Record agent run
          const agentRun = this.lineageStore.recordAgentRun({
            sessionId: session.id,
            taskId: task.id,
            agentId: agentConfig.id,
            executionMode: agentConfig.executionMode,
            inputPayload: node.input,
          });

          try {
            const toolResult = await scopedHandle.invoke(
              node.toolName,
              node.input,
              {
                sessionId: session.id,
                taskId: task.id,
                invokedAt: nodeStartTime,
              }
            );

            const nodeDurationMs = Date.now() - nodeStartTime;

            if (!toolResult.success) {
              this.lineageStore.completeAgentRun(agentRun.id, toolResult.error, 'failed', nodeDurationMs);
              this.lineageStore.completeTask(task.id, 'failed');

              return {
                nodeId: node.id,
                toolName: node.toolName,
                success: false,
                error: toolResult.error?.message,
                durationMs: nodeDurationMs,
              };
            }

            this.lineageStore.completeAgentRun(agentRun.id, toolResult.data, 'completed', nodeDurationMs);
            this.lineageStore.completeTask(task.id, 'completed');

            return {
              nodeId: node.id,
              toolName: node.toolName,
              success: true,
              data: toolResult.data,
              durationMs: nodeDurationMs,
            };
          } catch (err: any) {
            const nodeDurationMs = Date.now() - nodeStartTime;
            this.lineageStore.completeAgentRun(agentRun.id, { error: err.message }, 'failed', nodeDurationMs);
            this.lineageStore.completeTask(task.id, 'failed');

            return {
              nodeId: node.id,
              toolName: node.toolName,
              success: false,
              error: err.message || String(err),
              durationMs: nodeDurationMs,
            };
          }
        });

        const batchResults = await Promise.all(executionPromises);

        for (const res of batchResults) {
          nodeResults.set(res.nodeId, res);
          pendingNodes.delete(res.nodeId);

          if (res.success) {
            completedNodes.add(res.nodeId);
          } else {
            // Task failed; fail entire DAG
            this.lineageStore.completeSession(session.id, 'failed');
            return {
              sessionId: session.id,
              goal: dag.goal,
              success: false,
              results: nodeResults,
              totalDurationMs: Date.now() - startTime,
            };
          }
        }
      }

      this.lineageStore.completeSession(session.id, 'completed');

      return {
        sessionId: session.id,
        goal: dag.goal,
        success: true,
        results: nodeResults,
        totalDurationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      this.lineageStore.completeSession(session.id, 'failed');
      return {
        sessionId: session.id,
        goal: dag.goal,
        success: false,
        results: nodeResults,
        totalDurationMs: Date.now() - startTime,
      };
    }
  }
}
