import { HpFilterParams, HpFilterResult } from './types.js';
import { EconometricToolError } from './errors.js';

export class HpFilterTool {
  public static calculate(params: HpFilterParams): HpFilterResult {
    const { series, lambda = 1600 } = params;

    if (!Array.isArray(series) || series.length < 5) {
      throw new EconometricToolError(`Series must contain at least 5 data points (received ${series?.length || 0})`, 'INSUFFICIENT_DATA');
    }

    const n = series.length;

    // Construct pentadiagonal system for (I + lambda * D^T * D)
    // Diagonal elements of D^T * D:
    // row 0: [1, -2, 1]
    // row 1: [-2, 5, -4, 1]
    // row 2..n-3: [1, -4, 6, -4, 1]
    // row n-2: [1, -4, 5, -2]
    // row n-1: [1, -2, 1]

    const A: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      A[i][i] = 1; // Identity matrix part
    }

    for (let i = 0; i < n - 2; i++) {
      // D_i row is [1, -2, 1] at cols [i, i+1, i+2]
      const row = [1, -2, 1];
      const indices = [i, i + 1, i + 2];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          A[indices[r]][indices[c]] += lambda * row[r] * row[c];
        }
      }
    }

    // Solve A * tau = series
    const trend = this.solveLinearSystem(A, series);
    const cycle = series.map((val, i) => Number((val - trend[i]).toFixed(4)));

    let cycleVar = 0, totalVar = 0;
    const seriesMean = series.reduce((a, b) => a + b, 0) / n;
    for (let i = 0; i < n; i++) {
      cycleVar += cycle[i] * cycle[i];
      totalVar += (series[i] - seriesMean) * (series[i] - seriesMean);
    }
    const cycleVarianceRatio = totalVar > 0 ? Number((cycleVar / totalVar).toFixed(4)) : 0;

    return {
      trend: trend.map(t => Number(t.toFixed(4))),
      cycle,
      cycleVarianceRatio,
    };
  }

  private static solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = A.length;
    const M = A.map((row, i) => [...row, b[i]]);

    for (let i = 0; i < n; i++) {
      let maxEl = Math.abs(M[i][i]);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > maxEl) {
          maxEl = Math.abs(M[k][i]);
          maxRow = k;
        }
      }
      const tmp = M[maxRow];
      M[maxRow] = M[i];
      M[i] = tmp;

      const pivot = M[i][i] || 1e-9;
      for (let k = i + 1; k < n; k++) {
        const c = -M[k][i] / pivot;
        for (let j = i; j <= n; j++) {
          if (i === j) M[k][j] = 0;
          else M[k][j] += c * M[i][j];
        }
      }
    }

    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = M[i][n] / (M[i][i] || 1e-9);
      for (let k = i - 1; k >= 0; k--) {
        M[k][n] -= M[k][i] * x[i];
      }
    }
    return x;
  }
}
