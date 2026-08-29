import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import {
  WorkspaceExportData,
  WorkspaceManifest,
  WorkspacePackResult,
  WorkspaceUnpackResult,
} from './types.js';
import { WorkspaceBundleError } from './errors.js';
import { WarehouseEngine } from '@gordon/data-substrate';

export class WorkspaceBundlerTool {
  public static pack(exportData: WorkspaceExportData, targetPath: string): { archiveBuffer: Buffer; packResult: WorkspacePackResult } {
    if (!exportData.manifest || !exportData.manifest.projectName) {
      throw new WorkspaceBundleError('Workspace export data must contain a valid manifest and project name', 'INVALID_MANIFEST');
    }

    exportData.manifest.checksum = '';
    exportData.manifest.updatedAt = Date.now();
    const rawJson = JSON.stringify(exportData);
    const checksum = createHash('sha256').update(rawJson).digest('hex');
    exportData.manifest.checksum = checksum;

    const finalJson = JSON.stringify(exportData);
    const compressed = gzipSync(Buffer.from(finalJson, 'utf-8'));

    const packResult: WorkspacePackResult = {
      filePath: targetPath,
      bundleSizeCompressedBytes: compressed.byteLength,
      manifest: exportData.manifest,
    };

    return {
      archiveBuffer: compressed,
      packResult,
    };
  }

  public static async unpack(
    archiveBuffer: Buffer,
    warehouse: WarehouseEngine
  ): Promise<{ data: WorkspaceExportData; unpackResult: WorkspaceUnpackResult }> {
    let uncompressed: Buffer;
    try {
      uncompressed = gunzipSync(archiveBuffer);
    } catch (err: any) {
      throw new WorkspaceBundleError(`Failed to decompress .gordon workspace archive: ${err.message}`, 'DECOMPRESSION_FAILED');
    }

    let data: WorkspaceExportData;
    try {
      data = JSON.parse(uncompressed.toString('utf-8'));
    } catch (err: any) {
      throw new WorkspaceBundleError(`Corrupted .gordon JSON payload: ${err.message}`, 'CORRUPTED_PAYLOAD');
    }

    if (!data.manifest || !data.manifest.checksum) {
      throw new WorkspaceBundleError('Invalid workspace bundle: Missing manifest or checksum', 'INVALID_BUNDLE');
    }

    // Verify SHA-256 Checksum
    const expectedChecksum = data.manifest.checksum;
    const clonedData = {
      ...data,
      manifest: {
        ...data.manifest,
        checksum: '',
      },
    };
    const computedChecksum = createHash('sha256').update(JSON.stringify(clonedData)).digest('hex');
    if (computedChecksum !== expectedChecksum) {
      throw new WorkspaceBundleError('Integrity check failed: Checksum mismatch in .gordon workspace bundle', 'CHECKSUM_MISMATCH');
    }

    // Restore DuckDB tables with safe identifier quoting
    const restoredTables: string[] = [];
    if (data.duckdbTables) {
      for (const [tableName, tableData] of Object.entries(data.duckdbTables)) {
        if (tableData.rows && tableData.rows.length > 0) {
          const safeTableName = tableName.replace(/"/g, '""');
          const cols = Object.keys(tableData.rows[0]);
          const colDefs = cols.map(c => {
            const safeCol = c.replace(/"/g, '""');
            const sample = tableData.rows.find(r => r[c] !== null && r[c] !== undefined)?.[c];
            const type = typeof sample === 'number' ? 'DOUBLE' : typeof sample === 'boolean' ? 'BOOLEAN' : 'VARCHAR';
            return `"${safeCol}" ${type}`;
          }).join(', ');

          await warehouse.execute(`CREATE TABLE IF NOT EXISTS "${safeTableName}" (${colDefs})`);

          for (const row of tableData.rows) {
            const valList = cols.map(c => {
              const val = row[c];
              if (val === null || val === undefined) return 'NULL';
              if (typeof val === 'number') return String(val);
              if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
              return `'${String(val).replace(/'/g, "''")}'`;
            }).join(', ');
            await warehouse.execute(`INSERT INTO "${safeTableName}" VALUES (${valList})`);
          }
          restoredTables.push(tableName);
        }
      }
    }

    const restoredDocuments = (data.documents || []).map(d => d.title);
    const restoredVisualsCount = data.canvasSpec?.layout?.length || 0;

    const unpackResult: WorkspaceUnpackResult = {
      manifest: data.manifest,
      restoredTables,
      restoredDocuments,
      restoredVisualsCount,
    };

    return { data, unpackResult };
  }
}
