import { GrangerCausalityParams, GrangerCausalityResult } from './types.js';
import { EconometricToolError } from './errors.js';

export class GrangerCausalityTool {
  public static calculate(params: GrangerCausalityParams): GrangerCausalityResult {
    const { xSeries, ySeries, maxLag = 2 } = params;

    if (!Array.isArray(xSeries) || !Array.isArray(ySeries)) {
      throw new EconometricToolError('Both xSeries and ySeries must be arrays', 'INVALID_INPUT');
    }

    const n = Math.min(xSeries.length, ySeries.length);
    if (n < maxLag * 3 + 5) {
      throw new EconometricToolError(`Series length (${n}) is too short for lag ${maxLag}. Minimum ${maxLag * 3 + 5} required.`, 'INSUFFICIENT_DATA');
    }

    const effectiveLag = Math.max(1, Math.min(maxLag, 5));
    const effectiveN = n - effectiveLag;

    // Construct matrices for Y_t
    const Y: number[] = [];
    const X_restricted: number[][] = []; // Only lagged Y
    const X_unrestricted: number[][] = []; // Lagged Y + Lagged X

    for (let t = effectiveLag; t < n; t++) {
      Y.push(ySeries[t]);

      const restrRow: number[] = [1]; // Constant
      for (let lag = 1; lag <= effectiveLag; lag++) {
        restrRow.push(ySeries[t - lag]);
      }
      X_restricted.push(restrRow);

      const unrestrRow: number[] = [...restrRow];
      for (let lag = 1; lag <= effectiveLag; lag++) {
        unrestrRow.push(xSeries[t - lag]);
      }
      X_unrestricted.push(unrestrRow);
    }

    // Solve OLS for Restricted
    const { ssr: ssrRestricted, rSquared: rSquaredRestricted } = this.fitOls(X_restricted, Y);
    // Solve OLS for Unrestricted
    const { ssr: ssrUnrestricted, rSquared: rSquaredUnrestricted } = this.fitOls(X_unrestricted, Y);

    const m = effectiveLag; // Number of restrictions
    const k = 1 + 2 * effectiveLag; // Number of parameters in unrestricted model
    const dfDenominator = effectiveN - k;

    let fStatistic = 0;
    if (dfDenominator > 0 && ssrUnrestricted > 0) {
      fStatistic = ((ssrRestricted - ssrUnrestricted) / m) / (ssrUnrestricted / dfDenominator);
      if (fStatistic < 0) fStatistic = 0;
    }

    // Approximate p-value using Fisher-Snedecor F approximation
    const pValue = this.approximateFPValue(fStatistic, m, Math.max(1, dfDenominator));
    const isCausal = pValue < 0.05;

    const interpretation = isCausal
      ? `Statistically significant evidence (p=${pValue.toFixed(4)}, F=${fStatistic.toFixed(2)}) that X Granger-causes Y at lag ${effectiveLag}.`
      : `No statistically significant evidence (p=${pValue.toFixed(4)}, F=${fStatistic.toFixed(2)}) that X Granger-causes Y at lag ${effectiveLag}.`;

    return {
      isCausal,
      bestLag: effectiveLag,
      fStatistic: Number(fStatistic.toFixed(4)),
      pValue: Number(pValue.toFixed(4)),
      rSquaredUnrestricted: Number(rSquaredUnrestricted.toFixed(4)),
      rSquaredRestricted: Number(rSquaredRestricted.toFixed(4)),
      interpretation,
    };
  }

  private static fitOls(X: number[][], Y: number[]): { ssr: number; rSquared: number } {
    const numRows = X.length;
    const numCols = X[0].length;

    // Normal equations: (X^T X) beta = X^T Y
    const XtX: number[][] = Array(numCols).fill(0).map(() => Array(numCols).fill(0));
    const XtY: number[] = Array(numCols).fill(0);

    for (let r = 0; r < numRows; r++) {
      for (let c1 = 0; c1 < numCols; c1++) {
        for (let c2 = 0; c2 < numCols; c2++) {
          XtX[c1][c2] += X[r][c1] * X[r][c2];
        }
        XtY[c1] += X[r][c1] * Y[r];
      }
    }

    // Ridge diagonal stabilization
    for (let c = 0; c < numCols; c++) {
      XtX[c][c] += 1e-6;
    }

    const beta = this.solveLinearSystem(XtX, XtY);

    let ssr = 0;
    let sst = 0;
    const yMean = Y.reduce((a, b) => a + b, 0) / numRows;

    for (let r = 0; r < numRows; r++) {
      let pred = 0;
      for (let c = 0; c < numCols; c++) {
        pred += X[r][c] * beta[c];
      }
      const err = Y[r] - pred;
      ssr += err * err;
      sst += (Y[r] - yMean) * (Y[r] - yMean);
    }

    const rSquared = sst > 0 ? Math.max(0, 1 - ssr / sst) : 0;
    return { ssr, rSquared };
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

  private static approximateFPValue(F: number, df1: number, df2: number): number {
    if (F <= 0) return 1.0;
    const term1 = 1 - 2 / (9 * df2);
    const term2 = 1 - 2 / (9 * df1);
    const fPow = Math.pow(F, 1 / 3);
    const numerator = term1 * fPow - term2;
    const denominator = Math.sqrt((2 / (9 * df2)) * Math.pow(F, 2 / 3) + 2 / (9 * df1));
    const z = numerator / (denominator || 1e-9);
    const p = 0.5 * (1 - this.approxErf(z / Math.SQRT2));
    return Math.max(0, Math.min(1, p));
  }

  private static approxErf(x: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x);
    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
    return sign * y;
  }
}
