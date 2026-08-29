import { ModelEvaluationMetrics, ModelTaskType } from './types.js';

export interface BaseMlModel {
  name: string;
  task: ModelTaskType;
  fit: (X: number[][], y: number[]) => void;
  predict: (X: number[][]) => number[];
}

export class RidgeRegressionModel implements BaseMlModel {
  public name = 'Ridge Linear Regression';
  public task: ModelTaskType = 'regression';
  private weights: number[] = [];
  private lambda: number = 0.1;

  public fit(X: number[][], y: number[]): void {
    const numRows = X.length;
    const numCols = X[0].length + 1; // +1 for intercept

    const XtX: number[][] = Array(numCols).fill(0).map(() => Array(numCols).fill(0));
    const XtY: number[] = Array(numCols).fill(0);

    for (let r = 0; r < numRows; r++) {
      const row = [1, ...X[r]];
      for (let c1 = 0; c1 < numCols; c1++) {
        for (let c2 = 0; c2 < numCols; c2++) {
          XtX[c1][c2] += row[c1] * row[c2];
        }
        XtY[c1] += row[c1] * y[r];
      }
    }

    // Regularization
    for (let c = 1; c < numCols; c++) {
      XtX[c][c] += this.lambda;
    }

    this.weights = this.solve(XtX, XtY);
  }

  public predict(X: number[][]): number[] {
    return X.map(row => {
      let sum = this.weights[0] || 0;
      for (let i = 0; i < row.length; i++) {
        sum += (this.weights[i + 1] || 0) * row[i];
      }
      return sum;
    });
  }

  private solve(A: number[][], b: number[]): number[] {
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

export class DecisionTreeModel implements BaseMlModel {
  public name: string;
  public task: ModelTaskType;
  private splitFeature: number = -1;
  private splitThreshold: number = 0;
  private leftVal: number = 0;
  private rightVal: number = 0;

  constructor(task: ModelTaskType) {
    this.task = task;
    this.name = task === 'regression' ? 'Decision Tree Regressor' : 'Decision Tree Classifier';
  }

  public fit(X: number[][], y: number[]): void {
    const numRows = X.length;
    const numCols = X[0].length;
    let bestScore = Infinity;

    for (let c = 0; c < numCols; c++) {
      const vals = X.map(r => r[c]).sort((a, b) => a - b);
      for (let i = 0; i < vals.length - 1; i++) {
        const thresh = (vals[i] + vals[i + 1]) / 2;
        const leftY = y.filter((_, idx) => X[idx][c] <= thresh);
        const rightY = y.filter((_, idx) => X[idx][c] > thresh);

        if (leftY.length === 0 || rightY.length === 0) continue;

        let impurity = 0;
        if (this.task === 'regression') {
          const lMean = leftY.reduce((a, b) => a + b, 0) / leftY.length;
          const rMean = rightY.reduce((a, b) => a + b, 0) / rightY.length;
          const lMse = leftY.reduce((acc, v) => acc + (v - lMean) * (v - lMean), 0);
          const rMse = rightY.reduce((acc, v) => acc + (v - rMean) * (v - rMean), 0);
          impurity = lMse + rMse;
        } else {
          // Gini impurity
          const lP = leftY.filter(v => v === 1).length / leftY.length;
          const rP = rightY.filter(v => v === 1).length / rightY.length;
          const lGini = 1 - lP * lP - (1 - lP) * (1 - lP);
          const rGini = 1 - rP * rP - (1 - rP) * (1 - rP);
          impurity = leftY.length * lGini + rightY.length * rGini;
        }

        if (impurity < bestScore) {
          bestScore = impurity;
          this.splitFeature = c;
          this.splitThreshold = thresh;
          if (this.task === 'regression') {
            this.leftVal = leftY.reduce((a, b) => a + b, 0) / leftY.length;
            this.rightVal = rightY.reduce((a, b) => a + b, 0) / rightY.length;
          } else {
            this.leftVal = leftY.filter(v => v === 1).length >= leftY.length / 2 ? 1 : 0;
            this.rightVal = rightY.filter(v => v === 1).length >= rightY.length / 2 ? 1 : 0;
          }
        }
      }
    }
  }

  public predict(X: number[][]): number[] {
    if (this.splitFeature === -1) {
      return X.map(() => 0);
    }
    return X.map(row => (row[this.splitFeature] <= this.splitThreshold ? this.leftVal : this.rightVal));
  }
}

export class KnnModel implements BaseMlModel {
  public name: string;
  public task: ModelTaskType;
  private trainX: number[][] = [];
  private trainY: number[] = [];
  private k: number = 3;

  constructor(task: ModelTaskType, k: number = 3) {
    this.task = task;
    this.k = k;
    this.name = task === 'regression' ? 'K-Nearest Neighbors Regressor' : 'K-Nearest Neighbors Classifier';
  }

  public fit(X: number[][], y: number[]): void {
    this.trainX = X;
    this.trainY = y;
  }

  public predict(X: number[][]): number[] {
    return X.map(row => {
      const distances = this.trainX.map((tRow, idx) => {
        let distSq = 0;
        for (let i = 0; i < row.length; i++) {
          distSq += (row[i] - tRow[i]) * (row[i] - tRow[i]);
        }
        return { dist: Math.sqrt(distSq), y: this.trainY[idx] };
      });

      distances.sort((a, b) => a.dist - b.dist);
      const topK = distances.slice(0, Math.min(this.k, distances.length));

      if (this.task === 'regression') {
        return topK.reduce((a, b) => a + b.y, 0) / topK.length;
      } else {
        const ones = topK.filter(item => item.y === 1).length;
        return ones >= topK.length / 2 ? 1 : 0;
      }
    });
  }
}
