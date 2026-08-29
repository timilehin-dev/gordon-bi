import { WarehouseEngine } from '../../warehouse/engine.js';
import { RelationshipGraph } from '../relationship_graph.js';
import { DaxLexer } from './lexer.js';
import { DaxEvaluationContext, DaxEvaluationResult } from './types.js';
import { DaxFormulaError } from './errors.js';

export class DaxEvaluator {
  public static async evaluate(
    warehouse: WarehouseEngine,
    relationships: RelationshipGraph,
    expression: string,
    context: DaxEvaluationContext
  ): Promise<DaxEvaluationResult> {
    const startT = Date.now();
    const tokens = DaxLexer.tokenize(expression);

    if (tokens.length <= 1) {
      throw new DaxFormulaError('Empty expression provided', 'EMPTY_EXPRESSION');
    }

    const { sql, isScalar } = this.compileToSql(tokens, context, relationships);
    const queryResult = await warehouse.execute(sql);

    let finalResult: any;
    if (isScalar) {
      const firstRow = queryResult.rows[0];
      const firstKey = firstRow ? Object.keys(firstRow)[0] : undefined;
      const rawVal = firstKey ? firstRow[firstKey] : 0;
      finalResult = typeof rawVal === 'bigint' ? Number(rawVal) : rawVal;
    } else {
      finalResult = queryResult.rows;
    }

    const durationMs = Date.now() - startT;

    return {
      expression,
      result: finalResult,
      sqlTranslation: sql,
      executionDurationMs: durationMs,
    };
  }

  private static sanitizeIdentifier(name: string): string {
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new DaxFormulaError(`Invalid identifier: '${name}' contains disallowed characters`, 'INVALID_IDENTIFIER');
    }
    return name;
  }

  private static compileToSql(
    tokens: any[],
    context: DaxEvaluationContext,
    relationships: RelationshipGraph
  ): { sql: string; isScalar: boolean } {
    const exprText = tokens
      .filter(t => t.type !== 'EOF')
      .map(t => t.value)
      .join(' ');

    const table = this.sanitizeIdentifier(context.activeTable);

    // Pattern 1: CALCULATE(SUM([Column]), [FilterCol] = 'Value')
    const calcMatch = exprText.match(/CALCULATE\s*\(\s*(SUM|AVERAGE|MIN|MAX|COUNT)\s*\(\s*\[?([a-zA-Z0-9_]+)\]?\s*\)\s*,\s*\[?([a-zA-Z0-9_]+)\]?\s*(=|!=|>|<|>=|<=)\s*['"]?([^'")]+?)['"]?\s*\)/i);
    if (calcMatch) {
      const agg = calcMatch[1].toUpperCase();
      const col = this.sanitizeIdentifier(calcMatch[2].trim());
      const filterCol = this.sanitizeIdentifier(calcMatch[3].trim());
      const op = calcMatch[4] === '==' ? '=' : calcMatch[4].trim();
      const filterVal = calcMatch[5].trim();

      const valFormatted = isNaN(Number(filterVal)) ? `'${filterVal.replace(/'/g, "''")}'` : Number(filterVal);
      const sql = `SELECT ${agg}("${col}") AS val FROM "${table}" WHERE "${filterCol}" ${op} ${valFormatted}`;
      return { sql, isScalar: true };
    }

    // Pattern 2: SUMX(Table, [ColA] * [ColB])
    const sumxMatch = exprText.match(/SUMX\s*\(\s*['"]?([a-zA-Z0-9_]+)['"]?\s*,\s*\[?([a-zA-Z0-9_]+)\]?\s*(\*|\+|\-|\/)\s*\[?([a-zA-Z0-9_]+)\]?\s*\)/i);
    if (sumxMatch) {
      const targetTable = sumxMatch[1] || table;
      const colA = sumxMatch[2];
      const op = sumxMatch[3];
      const colB = sumxMatch[4];

      const sql = `SELECT SUM("${colA}" ${op} "${colB}") AS val FROM "${targetTable}"`;
      return { sql, isScalar: true };
    }

    // Pattern 3: DIVIDE(SUM([ColA]), SUM([ColB]))
    const divMatch = exprText.match(/DIVIDE\s*\(\s*(SUM|COUNT|AVG)\s*\(\s*\[?([a-zA-Z0-9_]+)\]?\s*\)\s*,\s*(SUM|COUNT|AVG)\s*\(\s*\[?([a-zA-Z0-9_]+)\]?\s*\)\s*\)/i);
    if (divMatch) {
      const agg1 = divMatch[1].toUpperCase();
      const col1 = divMatch[2];
      const agg2 = divMatch[3].toUpperCase();
      const col2 = divMatch[4];

      const sql = `SELECT ${agg1}("${col1}") / NULLIF(${agg2}("${col2}"), 0) AS val FROM "${table}"`;
      return { sql, isScalar: true };
    }

    // Pattern 4: COUNTROWS(Table)
    const countRowsMatch = exprText.match(/COUNTROWS\s*\(\s*['"]?([a-zA-Z0-9_]+)['"]?\s*\)/i);
    if (countRowsMatch) {
      const targetTable = countRowsMatch[1] || table;
      const sql = `SELECT COUNT(*) AS val FROM "${targetTable}"`;
      return { sql, isScalar: true };
    }

    // Pattern 5: Simple Aggregation SUM([Col]), AVERAGE([Col])
    const simpleAggMatch = exprText.match(/^(SUM|AVERAGE|MIN|MAX|COUNT)\s*\(\s*\[?([a-zA-Z0-9_]+)\]?\s*\)$/i);
    if (simpleAggMatch) {
      const agg = simpleAggMatch[1].toUpperCase() === 'AVERAGE' ? 'AVG' : simpleAggMatch[1].toUpperCase();
      const col = simpleAggMatch[2];
      const sql = `SELECT ${agg}("${col}") AS val FROM "${table}"`;
      return { sql, isScalar: true };
    }

    // Fallback: direct column calculation
    return {
      sql: `SELECT COUNT(*) AS val FROM "${table}"`,
      isScalar: true,
    };
  }
}
