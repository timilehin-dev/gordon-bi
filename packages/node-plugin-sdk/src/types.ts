export interface PluginToolDefinition<TParams = any, TResult = any> {
  name: string;
  displayName: string;
  description: string;
  execute: (params: TParams, context: PluginExecutionContext) => Promise<TResult>;
}

export interface PluginExecutionContext {
  pluginId: string;
  queryTable: (sql: string) => Promise<{ rows: any[]; rowCount: number }>;
  invokeHostTool: (toolName: string, params: Record<string, any>) => Promise<any>;
  log: (message: string) => void;
}
