import { GoalSeekParams, GoalSeekResult } from './types.js';
import { OptimizationError } from './errors.js';

export class GoalSeekTool {
  public static solve(params: GoalSeekParams): GoalSeekResult {
    const {
      targetValue,
      initialGuess = 10,
      lowerBound = -1e6,
      upperBound = 1e6,
      maxIterations = 50,
      tolerance = 1e-4,
      evalExpression,
    } = params;

    // Zero-eval safe mathematical evaluator
    const evaluate = (x: number): number => {
      try {
        return this.evaluateSafeMath(evalExpression, x);
      } catch (err: any) {
        throw new OptimizationError(`Failed to safely evaluate expression '${evalExpression}' at x=${x}: ${err.message}`, 'EVAL_ERROR');
      }
    };

    let x0 = initialGuess;
    let x1 = initialGuess !== 0 ? initialGuess * 1.1 : 1.0;

    let f0 = evaluate(x0) - targetValue;
    let f1 = evaluate(x1) - targetValue;

    let iterations = 0;
    let isConverged = false;
    let xCurr = x1;
    let fCurr = f1;

    if (Math.abs(f0) < tolerance) {
      return {
        solvedInput: Number(x0.toFixed(4)),
        achievedValue: Number((f0 + targetValue).toFixed(4)),
        targetValue,
        iterations: 1,
        isConverged: true,
        delta: Number(Math.abs(f0).toFixed(6)),
      };
    }

    // Secant iteration loop
    while (iterations < maxIterations) {
      iterations++;

      const denom = f1 - f0;
      if (Math.abs(denom) < 1e-12) {
        x1 += 0.01;
        f1 = evaluate(x1) - targetValue;
      }

      xCurr = x1 - f1 * (x1 - x0) / (f1 - f0 || 1e-9);

      // Clamp within bounds
      if (xCurr < lowerBound) xCurr = lowerBound;
      if (xCurr > upperBound) xCurr = upperBound;

      fCurr = evaluate(xCurr) - targetValue;

      if (Math.abs(fCurr) < tolerance || Math.abs(xCurr - x1) < tolerance) {
        isConverged = true;
        break;
      }

      x0 = x1;
      f0 = f1;
      x1 = xCurr;
      f1 = fCurr;
    }

    const achievedValue = evaluate(xCurr);
    const delta = Math.abs(achievedValue - targetValue);

    return {
      solvedInput: Number(xCurr.toFixed(4)),
      achievedValue: Number(achievedValue.toFixed(4)),
      targetValue,
      iterations,
      isConverged,
      delta: Number(delta.toFixed(6)),
    };
  }

  private static evaluateSafeMath(expr: string, x: number): number {
    // 1. Tokenize expression
    const sanitized = expr.replace(/\s+/g, '').replace(/x/gi, `(${x})`);

    // Only allow digits, parentheses, and arithmetic operators
    if (!/^[0-9+\-*/().^eE]+$/.test(sanitized)) {
      throw new Error('Expression contains disallowed characters');
    }

    // Recursive descent parser for safe arithmetic
    let pos = 0;

    const parsePrimary = (): number => {
      if (sanitized[pos] === '(') {
        pos++;
        const val = parseExpr();
        if (sanitized[pos] === ')') {
          pos++;
        }
        return val;
      }
      if (sanitized[pos] === '-') {
        pos++;
        return -parsePrimary();
      }
      if (sanitized[pos] === '+') {
        pos++;
        return parsePrimary();
      }
      let numStr = '';
      while (pos < sanitized.length && /[0-9.eE]/.test(sanitized[pos])) {
        numStr += sanitized[pos];
        pos++;
      }
      const num = Number(numStr);
      if (isNaN(num)) throw new Error(`Invalid number token: ${numStr}`);
      return num;
    };

    const parsePower = (): number => {
      let left = parsePrimary();
      while (pos < sanitized.length && sanitized[pos] === '^') {
        pos++;
        const right = parsePrimary();
        left = Math.pow(left, right);
      }
      return left;
    };

    const parseTerm = (): number => {
      let left = parsePower();
      while (pos < sanitized.length && (sanitized[pos] === '*' || sanitized[pos] === '/')) {
        const op = sanitized[pos];
        pos++;
        const right = parsePower();
        if (op === '*') left *= right;
        else {
          if (right === 0) throw new Error('Division by zero in formula');
          left /= right;
        }
      }
      return left;
    };

    const parseExpr = (): number => {
      let left = parseTerm();
      while (pos < sanitized.length && (sanitized[pos] === '+' || sanitized[pos] === '-')) {
        const op = sanitized[pos];
        pos++;
        const right = parseTerm();
        if (op === '+') left += right;
        else left -= right;
      }
      return left;
    };

    const result = parseExpr();
    if (!isFinite(result) || isNaN(result)) {
      throw new Error('Calculation resulted in non-finite value');
    }
    return result;
  }
}
