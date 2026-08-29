import { SimplexSolverParams, SimplexSolverResult, LinearConstraint } from './types.js';
import { OptimizationError } from './errors.js';

export class SimplexOptimizerTool {
  public static solve(params: SimplexSolverParams): SimplexSolverResult {
    const { objectiveCoefficients, goal, constraints, variableNames } = params;

    const numVars = objectiveCoefficients.length;
    const numConstraints = constraints.length;

    if (numVars === 0 || numConstraints === 0) {
      throw new OptimizationError('Objective variables and constraints must not be empty', 'INVALID_INPUT');
    }

    const varNames = variableNames || Array.from({ length: numVars }, (_, i) => `x${i + 1}`);

    // Build standard Simplex tableau for <= constraints
    // Maximize sum(c_i * x_i)
    // Row 0: Objective function z - sum(c_i * x_i) = 0
    // Rows 1..m: A_i x + s_i = b_i

    // Multiplier for minimization (invert objective)
    const objSign = goal === 'maximize' ? 1 : -1;
    const c = objectiveCoefficients.map(val => val * objSign);

    const numSlack = numConstraints;
    const totalCols = numVars + numSlack + 1; // [vars, slacks, RHS]
    const totalRows = numConstraints + 1; // [obj, constraints...]

    const tableau: number[][] = Array(totalRows).fill(0).map(() => Array(totalCols).fill(0));

    // Fill objective row (Row 0): -c_j for variables
    for (let j = 0; j < numVars; j++) {
      tableau[0][j] = -c[j];
    }

    // Fill constraint rows
    const basicVars: number[] = [];
    for (let i = 0; i < numConstraints; i++) {
      const rowIdx = i + 1;
      const constraint = constraints[i];
      let rhs = constraint.rhs;
      let factor = 1;

      // Handle >= by inverting to <=
      if (constraint.operator === '>=') {
        factor = -1;
        rhs = -rhs;
      }

      for (let j = 0; j < numVars; j++) {
        tableau[rowIdx][j] = (constraint.coefficients[j] || 0) * factor;
      }

      // Add slack variable
      tableau[rowIdx][numVars + i] = 1;
      basicVars.push(numVars + i);

      tableau[rowIdx][totalCols - 1] = rhs;
    }

    // Simplex iterations
    let iterations = 0;
    const maxIterations = 100;

    while (iterations < maxIterations) {
      iterations++;

      // Step 1: Find entering variable (most negative in Row 0)
      let pivotCol = -1;
      let minVal = -1e-7;

      for (let j = 0; j < totalCols - 1; j++) {
        if (tableau[0][j] < minVal) {
          minVal = tableau[0][j];
          pivotCol = j;
        }
      }

      if (pivotCol === -1) {
        // Optimal solution reached!
        break;
      }

      // Step 2: Find leaving variable via Minimum Ratio Test (RHS / positive pivot element)
      let pivotRow = -1;
      let minRatio = Infinity;

      for (let i = 1; i < totalRows; i++) {
        const coeff = tableau[i][pivotCol];
        if (coeff > 1e-9) {
          const ratio = tableau[i][totalCols - 1] / coeff;
          if (ratio >= 0 && ratio < minRatio) {
            minRatio = ratio;
            pivotRow = i;
          }
        }
      }

      if (pivotRow === -1) {
        return {
          optimalValue: 0,
          solution: {},
          status: 'unbounded',
          iterations,
          slackVariables: {},
        };
      }

      // Step 3: Pivot on (pivotRow, pivotCol)
      const pivotVal = tableau[pivotRow][pivotCol];
      for (let j = 0; j < totalCols; j++) {
        tableau[pivotRow][j] /= pivotVal;
      }

      for (let i = 0; i < totalRows; i++) {
        if (i !== pivotRow) {
          const factor = tableau[i][pivotCol];
          for (let j = 0; j < totalCols; j++) {
            tableau[i][j] -= factor * tableau[pivotRow][j];
          }
        }
      }

      basicVars[pivotRow - 1] = pivotCol;
    }

    // Extract solution
    const solution: Record<string, number> = {};
    const slackVariables: Record<string, number> = {};

    for (let j = 0; j < numVars; j++) {
      solution[varNames[j]] = 0;
    }

    for (let i = 0; i < numConstraints; i++) {
      const basicCol = basicVars[i];
      const val = Math.max(0, Number(tableau[i + 1][totalCols - 1].toFixed(4)));
      if (basicCol < numVars) {
        solution[varNames[basicCol]] = val;
      } else {
        const slackIdx = basicCol - numVars;
        const slackName = constraints[slackIdx]?.name || `slack_${slackIdx + 1}`;
        slackVariables[slackName] = val;
      }
    }

    const rawOptimal = Number((tableau[0][totalCols - 1] * objSign).toFixed(4));
    const optimalValue = Object.is(rawOptimal, -0) ? 0 : rawOptimal;

    return {
      optimalValue,
      solution,
      status: 'optimal',
      iterations,
      slackVariables,
    };
  }
}
