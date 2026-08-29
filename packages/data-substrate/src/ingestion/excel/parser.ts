import { existsSync } from 'node:fs';
import { basename } from 'node:path';
import { WarehouseEngine } from '../../warehouse/engine.js';
import { PythonCodeSandbox } from '@gordon/sandbox-runtime';
import { IngestionOptions, StructuredIngestionResult } from '../types.js';
import { IngestionError } from '../errors.js';

export class ExcelIngestionParser {
  private warehouse: WarehouseEngine;
  private pythonSandbox: PythonCodeSandbox;

  constructor(warehouse: WarehouseEngine) {
    this.warehouse = warehouse;
    this.pythonSandbox = new PythonCodeSandbox({ timeoutMs: 60000 });
  }

  public async parseAndLoad(filePath: string, options: IngestionOptions = {}): Promise<StructuredIngestionResult[]> {
    if (!existsSync(filePath)) {
      throw new IngestionError(`Excel file not found: ${filePath}`, 'FILE_NOT_FOUND', filePath);
    }

    const startTime = Date.now();
    const fileName = basename(filePath);

    // Python script extracting all sheets to JSON
    const pyScript = `
import zipfile
import xml.etree.ElementTree as ET
import json
import os

file_path = inputs.get('filePath')
results = []

try:
    with zipfile.ZipFile(file_path, 'r') as z:
        # Read shared strings
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            ss_tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in ss_tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                t = si.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                shared_strings.append(t.text if t is not None and t.text else '')

        # Read workbook structure
        wb_tree = ET.fromstring(z.read('xl/workbook.xml'))
        sheets = wb_tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheets/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet')
        
        sheet_idx = 1
        for sheet in sheets:
            sheet_name = sheet.attrib.get('name', f'Sheet{sheet_idx}')
            sheet_path = f'xl/worksheets/sheet{sheet_idx}.xml'
            
            if sheet_path in z.namelist():
                ws_tree = ET.fromstring(z.read(sheet_path))
                rows_data = []
                
                sheet_data = ws_tree.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheetData')
                if sheet_data is not None:
                    for row in sheet_data.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
                        row_vals = []
                        for cell in row.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                            v = cell.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                            t = cell.attrib.get('t')
                            val_str = v.text if v is not None and v.text else ''
                            
                            if t == 's' and val_str.isdigit():
                                idx = int(val_str)
                                val_str = shared_strings[idx] if idx < len(shared_strings) else ''
                            row_vals.append(val_str)
                        if any(row_vals):
                            rows_data.append(row_vals)
                
                if rows_data:
                    headers = [str(h).strip().replace(' ', '_') for h in rows_data[0]]
                    data = rows_data[1:]
                    results.append({
                        'sheetName': sheet_name,
                        'headers': headers,
                        'rows': data
                    })
            sheet_idx += 1

    export_result({'sheets': results})
except Exception as e:
    export_result({'error': str(e)})
`;

    const pyResult = await this.pythonSandbox.runSnippet<{ sheets?: Array<{ sheetName: string; headers: string[]; rows: string[][] }>; error?: string }>(
      pyScript,
      { filePath: filePath.replace(/\\/g, '/') }
    );

    if (!pyResult.success || !pyResult.result?.sheets) {
      throw new IngestionError(
        `Failed to parse Excel workbook: ${pyResult.result?.error || pyResult.error}`,
        'EXCEL_PARSE_ERROR',
        filePath
      );
    }

    const structuredResults: StructuredIngestionResult[] = [];

    for (const sheet of pyResult.result.sheets) {
      if (options.sheetName && sheet.sheetName.toLowerCase() !== options.sheetName.toLowerCase()) {
        continue;
      }

      const rawTableName = options.tableName || `${fileName.replace(/[^a-zA-Z0-9_]/g, '_')}_${sheet.sheetName}`;
      const tableName = rawTableName.toLowerCase().replace(/^_+|_+$/g, '');

      const headers = sheet.headers.map((h, i) => h || `col_${i + 1}`);
      const createCols = headers.map(h => `"${h}" VARCHAR`).join(', ');

      await this.warehouse.execute(`DROP TABLE IF EXISTS "${tableName}"`);
      await this.warehouse.execute(`CREATE TABLE "${tableName}" (${createCols})`);

      // Insert rows
      if (sheet.rows.length > 0) {
        const batchSize = 200;
        for (let i = 0; i < sheet.rows.length; i += batchSize) {
          const batch = sheet.rows.slice(i, i + batchSize);
          const valueClauses = batch.map(row => {
            const formatted = headers.map((_, colIdx) => {
              const val = row[colIdx];
              return val ? `'${val.replace(/'/g, "''")}'` : 'NULL';
            });
            return `(${formatted.join(', ')})`;
          }).join(', ');

          if (valueClauses.length > 0) {
            await this.warehouse.execute(`INSERT INTO "${tableName}" VALUES ${valueClauses}`);
          }
        }
      }

      const durationMs = Date.now() - startTime;
      const schema = await this.warehouse.getTableSchema(tableName);

      structuredResults.push({
        sourcePath: filePath,
        tableName,
        rowCount: sheet.rows.length,
        columnCount: headers.length,
        columns: schema.columns,
        durationMs,
      });
    }

    return structuredResults;
  }
}
