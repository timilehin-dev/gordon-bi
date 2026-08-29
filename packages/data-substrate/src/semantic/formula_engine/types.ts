export type DaxTokenType =
  | 'FUNCTION'
  | 'IDENTIFIER'
  | 'STRING'
  | 'NUMBER'
  | 'COMMA'
  | 'LPAREN'
  | 'RPAREN'
  | 'OPERATOR'
  | 'EOF';

export interface DaxToken {
  type: DaxTokenType;
  value: string;
  position: number;
}

export interface DaxEvaluationContext {
  activeTable: string;
  filterContext?: Record<string, any>;
  rowContext?: Record<string, any>;
}

export interface DaxEvaluationResult {
  expression: string;
  result: number | string | boolean | Record<string, any>[];
  sqlTranslation?: string;
  executionDurationMs: number;
}
