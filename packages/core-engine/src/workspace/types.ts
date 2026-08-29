export interface WorkspaceManifest {
  version: string;
  projectName: string;
  author: string;
  createdAt: number;
  updatedAt: number;
  tablesCount: number;
  documentsCount: number;
  visualsCount: number;
  checksum: string;
}

export interface WorkspaceExportData {
  manifest: WorkspaceManifest;
  duckdbTables: Record<string, { schema: string; rows: Record<string, any>[] }>;
  documents: Array<{ id: string; title: string; chunks: Array<{ chunkId: string; content: string; page?: number; line?: number }> }>;
  canvasSpec: {
    title: string;
    layout: Array<{ id: string; x: number; y: number; w: number; h: number; cardType: string; config: any }>;
  };
  lineageAuditRecords: Array<{ id: string; taskName: string; toolName: string; durationMs: number; status: string }>;
  appSettings: {
    theme: 'dark' | 'light';
    autoAnalyzeOnLoad: boolean;
  };
}

export interface WorkspacePackResult {
  filePath: string;
  bundleSizeCompressedBytes: number;
  manifest: WorkspaceManifest;
}

export interface WorkspaceUnpackResult {
  manifest: WorkspaceManifest;
  restoredTables: string[];
  restoredDocuments: string[];
  restoredVisualsCount: number;
}
