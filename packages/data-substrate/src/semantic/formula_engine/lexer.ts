import { DaxToken, DaxTokenType } from './types.js';
import { DaxFormulaError } from './errors.js';

export class DaxLexer {
  private static readonly KEYWORDS = new Set([
    'CALCULATE',
    'FILTER',
    'ALL',
    'SUM',
    'AVERAGE',
    'MIN',
    'MAX',
    'COUNT',
    'COUNTROWS',
    'SUMX',
    'AVERAGEX',
    'DIVIDE',
    'RELATED',
    'IF',
    'BLANK',
    'AND',
    'OR',
    'NOT',
  ]);

  public static tokenize(input: string): DaxToken[] {
    const tokens: DaxToken[] = [];
    let pos = 0;

    while (pos < input.length) {
      const char = input[pos];

      if (/\s/.test(char)) {
        pos++;
        continue;
      }

      if (char === '(') {
        tokens.push({ type: 'LPAREN', value: '(', position: pos++ });
        continue;
      }
      if (char === ')') {
        tokens.push({ type: 'RPAREN', value: ')', position: pos++ });
        continue;
      }
      if (char === ',') {
        tokens.push({ type: 'COMMA', value: ',', position: pos++ });
        continue;
      }

      if (char === '"' || char === "'") {
        const quote = char;
        const start = pos;
        pos++;
        let strVal = '';
        while (pos < input.length && input[pos] !== quote) {
          strVal += input[pos++];
        }
        if (pos >= input.length) {
          throw new DaxFormulaError(`Unterminated string literal starting at position ${start}`, 'SYNTAX_ERROR');
        }
        pos++; // consume closing quote
        tokens.push({
          type: quote === "'" ? 'IDENTIFIER' : 'STRING',
          value: strVal,
          position: start,
        });
        continue;
      }

      if (char === '[') {
        const start = pos;
        pos++;
        let colName = '';
        while (pos < input.length && input[pos] !== ']') {
          colName += input[pos++];
        }
        if (pos >= input.length) {
          throw new DaxFormulaError(`Unterminated column reference starting at position ${start}`, 'SYNTAX_ERROR');
        }
        pos++; // consume ']'
        tokens.push({ type: 'IDENTIFIER', value: colName, position: start });
        continue;
      }

      // Operators: ==, !=, <=, >=, <, >, =, +, -, *, /, &&, ||
      if (['=', '<', '>', '!', '+', '-', '*', '/', '&', '|'].includes(char)) {
        let op = char;
        const start = pos++;
        if (pos < input.length && ['=', '&', '|'].includes(input[pos])) {
          op += input[pos++];
        }
        tokens.push({ type: 'OPERATOR', value: op, position: start });
        continue;
      }

      // Numbers
      if (/[0-9]/.test(char)) {
        const start = pos;
        let numStr = '';
        while (pos < input.length && /[0-9.]/.test(input[pos])) {
          numStr += input[pos++];
        }
        tokens.push({ type: 'NUMBER', value: numStr, position: start });
        continue;
      }

      // Identifiers / Functions
      if (/[a-zA-Z_]/.test(char)) {
        const start = pos;
        let id = '';
        while (pos < input.length && /[a-zA-Z0-9_]/.test(input[pos])) {
          id += input[pos++];
        }
        const upper = id.toUpperCase();
        if (this.KEYWORDS.has(upper)) {
          tokens.push({ type: 'FUNCTION', value: upper, position: start });
        } else {
          tokens.push({ type: 'IDENTIFIER', value: id, position: start });
        }
        continue;
      }

      throw new DaxFormulaError(`Unexpected character '${char}' at position ${pos}`, 'UNEXPECTED_TOKEN');
    }

    tokens.push({ type: 'EOF', value: '', position: pos });
    return tokens;
  }
}
