import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import {
  SessionRecord,
  TaskRecord,
  AgentRunRecord,
  ToolExecutionRecord,
  LineageEdge,
  LineageTrace,
} from '@gordon/shared-types';
import {
  LineageStoreConfig,
  CreateSessionParams,
  StartTaskParams,
  RecordAgentRunParams,
  RecordToolExecutionParams,
  AddLineageEdgeParams,
} from './types.js';
import { LineageStoreError } from './errors.js';

export class LineageStore {
  private db: DatabaseSync;

  constructor(config: LineageStoreConfig = {}) {
    try {
      this.db = new DatabaseSync(config.dbPath || ':memory:');
      this.initSchema();
    } catch (err: any) {
      throw new LineageStoreError(`Failed to initialize Lineage Store SQLite DB: ${err.message}`, 'INIT_ERROR', err);
    }
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        goal TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        parent_task_id TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        assigned_agent_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        completed_at INTEGER,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS agent_runs (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        execution_mode TEXT NOT NULL,
        status TEXT NOT NULL,
        input_payload TEXT NOT NULL,
        output_payload TEXT,
        token_usage INTEGER DEFAULT 0,
        duration_ms REAL DEFAULT 0,
        created_at INTEGER NOT NULL,
        completed_at INTEGER,
        FOREIGN KEY (session_id) REFERENCES sessions(id),
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      );

      CREATE TABLE IF NOT EXISTS tool_executions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        input_args TEXT NOT NULL,
        raw_output TEXT NOT NULL,
        success INTEGER NOT NULL,
        duration_ms REAL NOT NULL,
        tokens_used INTEGER DEFAULT 0,
        parent_lineage_id TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id),
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      );

      CREATE TABLE IF NOT EXISTS lineage_edges (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        relation TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE INDEX IF NOT EXISTS idx_tool_exec_session ON tool_executions(session_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks(session_id);
      CREATE INDEX IF NOT EXISTS idx_agent_runs_session ON agent_runs(session_id);
      CREATE INDEX IF NOT EXISTS idx_lineage_edges_session ON lineage_edges(session_id);
    `);
  }

  public createSession(params: CreateSessionParams): SessionRecord {
    const id = params.id || `session_${randomUUID()}`;
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, name, goal, status, created_at, updated_at)
      VALUES (?, ?, ?, 'active', ?, ?)
    `);
    stmt.run(id, params.name, params.goal, now, now);

    return {
      id,
      name: params.name,
      goal: params.goal,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
  }

  public getSession(id: string): SessionRecord | null {
    const stmt = this.db.prepare(`SELECT * FROM sessions WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      goal: row.goal,
      status: row.status,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
    };
  }

  public completeSession(id: string, status: 'completed' | 'failed' = 'completed'): void {
    const stmt = this.db.prepare(`UPDATE sessions SET status = ?, updated_at = ? WHERE id = ?`);
    stmt.run(status, Date.now(), id);
  }

  public startTask(params: StartTaskParams): TaskRecord {
    const id = params.id || `task_${randomUUID()}`;
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, session_id, parent_task_id, title, description, status, assigned_agent_id, created_at)
      VALUES (?, ?, ?, ?, ?, 'running', ?, ?)
    `);
    stmt.run(id, params.sessionId, params.parentTaskId || null, params.title, params.description || '', params.assignedAgentId || null, now);

    return {
      id,
      sessionId: params.sessionId,
      parentTaskId: params.parentTaskId,
      title: params.title,
      description: params.description,
      status: 'running',
      assignedAgentId: params.assignedAgentId,
      createdAt: now,
    };
  }

  public completeTask(id: string, status: 'completed' | 'failed' = 'completed'): void {
    const stmt = this.db.prepare(`UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?`);
    stmt.run(status, Date.now(), id);
  }

  public recordAgentRun(params: RecordAgentRunParams): AgentRunRecord {
    const id = params.id || `run_${randomUUID()}`;
    const now = Date.now();
    const inputStr = typeof params.inputPayload === 'string' ? params.inputPayload : JSON.stringify(params.inputPayload);

    const stmt = this.db.prepare(`
      INSERT INTO agent_runs (id, session_id, task_id, agent_id, execution_mode, status, input_payload, created_at)
      VALUES (?, ?, ?, ?, ?, 'running', ?, ?)
    `);
    stmt.run(id, params.sessionId, params.taskId, params.agentId, params.executionMode, inputStr, now);

    return {
      id,
      sessionId: params.sessionId,
      taskId: params.taskId,
      agentId: params.agentId,
      executionMode: params.executionMode,
      status: 'running',
      inputPayload: inputStr,
      createdAt: now,
    };
  }

  public completeAgentRun(id: string, outputPayload: unknown, status: 'completed' | 'failed' = 'completed', durationMs = 0, tokenUsage = 0): void {
    const outStr = typeof outputPayload === 'string' ? outputPayload : JSON.stringify(outputPayload);
    const stmt = this.db.prepare(`
      UPDATE agent_runs 
      SET status = ?, output_payload = ?, duration_ms = ?, token_usage = ?, completed_at = ?
      WHERE id = ?
    `);
    stmt.run(status, outStr, durationMs, tokenUsage, Date.now(), id);
  }

  public recordToolExecution(params: RecordToolExecutionParams): ToolExecutionRecord {
    const id = params.id || `tool_${randomUUID()}`;
    const now = Date.now();
    const inputStr = typeof params.inputArgs === 'string' ? params.inputArgs : JSON.stringify(params.inputArgs);
    const outputStr = typeof params.rawOutput === 'string' ? params.rawOutput : JSON.stringify(params.rawOutput);

    const stmt = this.db.prepare(`
      INSERT INTO tool_executions (id, session_id, task_id, agent_id, tool_name, input_args, raw_output, success, duration_ms, tokens_used, parent_lineage_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      params.sessionId,
      params.taskId,
      params.agentId || null,
      params.toolName,
      inputStr,
      outputStr,
      params.success ? 1 : 0,
      params.durationMs,
      params.tokensUsed || 0,
      params.parentLineageId || null,
      now
    );

    // Auto-record lineage edge from tool to task
    this.addLineageEdge({
      sessionId: params.sessionId,
      sourceType: 'tool',
      sourceId: id,
      targetType: 'task',
      targetId: params.taskId,
      relation: 'produced_by',
    });

    return {
      id,
      sessionId: params.sessionId,
      taskId: params.taskId,
      agentId: params.agentId,
      toolName: params.toolName,
      inputArgs: inputStr,
      rawOutput: outputStr,
      success: params.success,
      durationMs: params.durationMs,
      tokensUsed: params.tokensUsed || 0,
      parentLineageId: params.parentLineageId,
      createdAt: now,
    };
  }

  public addLineageEdge(params: AddLineageEdgeParams): LineageEdge {
    const id = params.id || `edge_${randomUUID()}`;
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO lineage_edges (id, session_id, source_type, source_id, target_type, target_id, relation, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, params.sessionId, params.sourceType, params.sourceId, params.targetType, params.targetId, params.relation, now);

    return {
      id,
      sessionId: params.sessionId,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      targetType: params.targetType,
      targetId: params.targetId,
      relation: params.relation,
      createdAt: now,
    };
  }

  public getTrace(sessionId: string): LineageTrace | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    const tasksRows = this.db.prepare(`SELECT * FROM tasks WHERE session_id = ? ORDER BY created_at ASC`).all(sessionId) as any[];
    const tasks: TaskRecord[] = tasksRows.map(r => ({
      id: r.id,
      sessionId: r.session_id,
      parentTaskId: r.parent_task_id || undefined,
      title: r.title,
      description: r.description,
      status: r.status,
      assignedAgentId: r.assigned_agent_id,
      createdAt: Number(r.created_at),
      completedAt: r.completed_at ? Number(r.completed_at) : undefined,
    }));

    const agentRunsRows = this.db.prepare(`SELECT * FROM agent_runs WHERE session_id = ? ORDER BY created_at ASC`).all(sessionId) as any[];
    const agentRuns: AgentRunRecord[] = agentRunsRows.map(r => ({
      id: r.id,
      sessionId: r.session_id,
      taskId: r.task_id,
      agentId: r.agent_id,
      executionMode: r.execution_mode,
      status: r.status,
      inputPayload: r.input_payload,
      outputPayload: r.output_payload || undefined,
      tokenUsage: r.token_usage ? Number(r.token_usage) : 0,
      durationMs: r.duration_ms ? Number(r.duration_ms) : 0,
      createdAt: Number(r.created_at),
      completedAt: r.completed_at ? Number(r.completed_at) : undefined,
    }));

    const toolExecRows = this.db.prepare(`SELECT * FROM tool_executions WHERE session_id = ? ORDER BY created_at ASC`).all(sessionId) as any[];
    const toolExecutions = toolExecRows.map(r => ({
      id: r.id,
      toolName: r.tool_name,
      inputArgs: r.input_args,
      rawOutput: r.raw_output,
      success: Boolean(r.success),
      durationMs: Number(r.duration_ms),
      createdAt: Number(r.created_at),
    }));

    const edgeRows = this.db.prepare(`SELECT * FROM lineage_edges WHERE session_id = ? ORDER BY created_at ASC`).all(sessionId) as any[];
    const edges: LineageEdge[] = edgeRows.map(r => ({
      id: r.id,
      sessionId: r.session_id,
      sourceType: r.source_type,
      sourceId: r.source_id,
      targetType: r.target_type,
      targetId: r.target_id,
      relation: r.relation,
      createdAt: Number(r.created_at),
    }));

    return {
      rootSession: session,
      tasks,
      agentRuns,
      toolExecutions,
      edges,
    };
  }

  public getToolExecution(id: string): ToolExecutionRecord | null {
    const stmt = this.db.prepare(`SELECT * FROM tool_executions WHERE id = ?`);
    const r = stmt.get(id) as any;
    if (!r) return null;

    return {
      id: r.id,
      sessionId: r.session_id,
      taskId: r.task_id,
      agentId: r.agent_id,
      toolName: r.tool_name,
      inputArgs: r.input_args,
      rawOutput: r.raw_output,
      success: Boolean(r.success),
      durationMs: Number(r.duration_ms),
      tokensUsed: Number(r.tokens_used),
      parentLineageId: r.parent_lineage_id || undefined,
      createdAt: Number(r.created_at),
    };
  }

  public close(): void {
    this.db.close();
  }
}
