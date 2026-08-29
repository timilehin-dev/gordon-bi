export interface CellEdit {
  rowIdx: number;
  colName: string;
  originalValue: any;
  newValue: any;
  formula?: string;
}

export interface TransformationStep {
  id: string;
  name: string;
  type: 'calculated_column' | 'manual_override' | 'measure_rule';
  expression: string;
  appliedCount: number;
  timestamp: number;
}

export class GridStore {
  private tableName: string = '';
  private rows: any[] = [];
  private columns: string[] = [];
  private edits: CellEdit[] = [];
  private transformations: TransformationStep[] = [];
  private listeners: Set<(rows: any[], columns: string[], edits: CellEdit[]) => void> = new Set();

  public setTableData(tableName: string, columns: string[], rows: any[]): void {
    this.tableName = tableName;
    this.columns = [...columns];
    this.rows = rows.map(r => ({ ...r }));
    this.edits = [];
    this.notify();
  }

  public getRows(): any[] {
    return this.rows.map(r => ({ ...r }));
  }

  public getColumns(): string[] {
    return [...this.columns];
  }

  public getTransformations(): TransformationStep[] {
    return [...this.transformations];
  }

  public updateCell(rowIdx: number, colName: string, value: any, formula?: string): void {
    if (rowIdx < 0 || rowIdx >= this.rows.length) return;

    const originalValue = this.rows[rowIdx][colName];
    let computedValue = value;

    // Basic formula parser: =SUM(col1, col2) or =[col1] * 1.15
    if (typeof formula === 'string' && formula.startsWith('=')) {
      computedValue = this.evaluateFormula(formula.slice(1), this.rows[rowIdx]);
    }

    this.rows[rowIdx][colName] = computedValue;
    this.edits.push({
      rowIdx,
      colName,
      originalValue,
      newValue: computedValue,
      formula,
    });

    this.notify();
  }

  public promoteToTransformationStep(name: string, expression: string): TransformationStep {
    const step: TransformationStep = {
      id: `trans_${Date.now()}`,
      name,
      type: 'calculated_column',
      expression,
      appliedCount: this.edits.length,
      timestamp: Date.now(),
    };

    this.transformations.push(step);
    this.notify();
    return step;
  }

  public evaluateFormula(expr: string, row: any): any {
    try {
      let rawExpr = expr.trim();
      if (rawExpr.startsWith('=')) {
        rawExpr = rawExpr.slice(1).trim();
      }

      // Substitute column references [ColName] with row values (case-insensitive)
      let evaluatedExpr = rawExpr;
      for (const col of this.columns) {
        const val = Number(row[col]) || 0;
        evaluatedExpr = evaluatedExpr.replace(new RegExp(`\\[${col}\\]`, 'gi'), String(val));
      }

      // Safe arithmetic evaluator
      if (/^[0-9+\-*/().\s]+$/.test(evaluatedExpr)) {
        const result = Function(`'use strict'; return (${evaluatedExpr})`)();
        if (!isFinite(result) || isNaN(result)) {
          return 0;
        }
        return typeof result === 'number' ? Number(result.toFixed(4)) : result;
      }
      return expr;
    } catch {
      return expr;
    }
  }

  public subscribe(listener: (rows: any[], columns: string[], edits: CellEdit[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const rows = this.getRows();
    const cols = this.getColumns();
    const edits = [...this.edits];
    this.listeners.forEach(l => l(rows, cols, edits));
  }
}
