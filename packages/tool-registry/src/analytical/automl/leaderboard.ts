import {
  AutoMlTrainingParams,
  AutoMlLeaderboardResult,
  CandidateModelResult,
  FeatureImportanceScore,
  ModelEvaluationMetrics,
  ModelTaskType,
} from './types.js';
import { AutoMlError } from './errors.js';
import { RidgeRegressionModel, DecisionTreeModel, KnnModel, BaseMlModel } from './models.js';

export class AutoMlLeaderboardTool {
  public static evaluate(params: AutoMlTrainingParams): AutoMlLeaderboardResult {
    const { task, features, target, dataset, cvFolds = 3 } = params;

    if (!Array.isArray(dataset) || dataset.length < 10) {
      throw new AutoMlError(`Dataset must have at least 10 rows (received ${dataset?.length || 0})`, 'INSUFFICIENT_DATA');
    }

    if (!features || features.length === 0 || !target) {
      throw new AutoMlError('Features and target variable must be specified', 'INVALID_INPUT');
    }

    // Extract numerical feature matrix X and target vector y
    const X: number[][] = [];
    const y: number[] = [];

    for (const row of dataset) {
      const targetVal = Number(row[target]);
      if (isNaN(targetVal)) continue;

      const featureRow: number[] = [];
      let isValid = true;
      for (const feat of features) {
        const val = Number(row[feat]);
        if (isNaN(val)) {
          isValid = false;
          break;
        }
        featureRow.push(val);
      }

      if (isValid) {
        X.push(featureRow);
        y.push(targetVal);
      }
    }

    const n = X.length;
    if (n < 10) {
      throw new AutoMlError('Not enough valid numerical rows after parsing', 'INSUFFICIENT_DATA');
    }

    // Candidate model roster
    const candidateModels: BaseMlModel[] = [];
    if (task === 'regression') {
      candidateModels.push(new RidgeRegressionModel());
      candidateModels.push(new DecisionTreeModel('regression'));
      candidateModels.push(new KnnModel('regression', 3));
    } else {
      candidateModels.push(new DecisionTreeModel('classification'));
      candidateModels.push(new KnnModel('classification', 3));
    }

    const evaluatedCandidates: CandidateModelResult[] = [];

    for (const model of candidateModels) {
      const startT = Date.now();

      // K-Fold Cross Validation
      const foldSize = Math.floor(n / cvFolds);
      const cvMetricScores: number[] = [];
      let aggregatedPreds: number[] = [];
      let aggregatedActuals: number[] = [];

      for (let fold = 0; fold < cvFolds; fold++) {
        const valStart = fold * foldSize;
        const valEnd = fold === cvFolds - 1 ? n : valStart + foldSize;

        const trainX = [...X.slice(0, valStart), ...X.slice(valEnd)];
        const trainY = [...y.slice(0, valStart), ...y.slice(valEnd)];
        const valX = X.slice(valStart, valEnd);
        const valY = y.slice(valStart, valEnd);

        if (trainX.length === 0 || valX.length === 0) continue;

        model.fit(trainX, trainY);
        const preds = model.predict(valX);

        aggregatedPreds.push(...preds);
        aggregatedActuals.push(...valY);

        const foldMetric = task === 'regression'
          ? this.computeR2(valY, preds)
          : this.computeF1(valY, preds);
        cvMetricScores.push(foldMetric);
      }

      const meanCvScore = cvMetricScores.reduce((a, b) => a + b, 0) / (cvMetricScores.length || 1);
      const metrics = this.computeMetrics(task, aggregatedActuals, aggregatedPreds);
      const trainingTimeMs = Date.now() - startT;

      evaluatedCandidates.push({
        modelName: model.name,
        task,
        rank: 0,
        cvScore: Number(meanCvScore.toFixed(4)),
        metrics,
        trainingTimeMs,
        isBestModel: false,
      });
    }

    // Sort by CV score descending
    evaluatedCandidates.sort((a, b) => b.cvScore - a.cvScore);
    evaluatedCandidates.forEach((c, idx) => {
      c.rank = idx + 1;
      c.isBestModel = idx === 0;
    });

    const bestModel = evaluatedCandidates[0];

    // Compute Permutation Feature Importance using best model
    const bestModelInstance = candidateModels.find(m => m.name === bestModel.modelName) || candidateModels[0];
    bestModelInstance.fit(X, y);
    const baselineScore = task === 'regression'
      ? this.computeR2(y, bestModelInstance.predict(X))
      : this.computeF1(y, bestModelInstance.predict(X));

    const featureImportances: FeatureImportanceScore[] = [];
    let totalImp = 0;

    for (let c = 0; c < features.length; c++) {
      // Shuffle column c
      const shuffledX = X.map(row => [...row]);
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = shuffledX[i][c];
        shuffledX[i][c] = shuffledX[j][c];
        shuffledX[j][c] = tmp;
      }

      const permScore = task === 'regression'
        ? this.computeR2(y, bestModelInstance.predict(shuffledX))
        : this.computeF1(y, bestModelInstance.predict(shuffledX));

      const drop = Math.max(0, baselineScore - permScore);
      totalImp += drop;
      featureImportances.push({
        featureName: features[c],
        importance: drop,
        rank: 0,
      });
    }

    // Normalize importances
    featureImportances.forEach(f => {
      f.importance = totalImp > 0 ? Number((f.importance / totalImp).toFixed(4)) : Number((1 / features.length).toFixed(4));
    });
    featureImportances.sort((a, b) => b.importance - a.importance);
    featureImportances.forEach((f, idx) => {
      f.rank = idx + 1;
    });

    const executiveSummary = `Evaluated ${evaluatedCandidates.length} candidate models over ${n} samples. Best performing model is '${bestModel.modelName}' (CV Score: ${bestModel.cvScore}). Top predictive driver is '${featureImportances[0]?.featureName}' (${(featureImportances[0]?.importance * 100).toFixed(1)}% importance).`;

    return {
      task,
      totalSamples: n,
      featuresAnalyzed: features,
      targetVariable: target,
      bestModelName: bestModel.modelName,
      leaderboard: evaluatedCandidates,
      featureImportances,
      executiveSummary,
    };
  }

  private static computeMetrics(task: ModelTaskType, actual: number[], pred: number[]): ModelEvaluationMetrics {
    const n = actual.length;
    if (task === 'regression') {
      let sumSqErr = 0, sumAbsErr = 0, sumY = 0;
      for (let i = 0; i < n; i++) {
        const err = actual[i] - pred[i];
        sumSqErr += err * err;
        sumAbsErr += Math.abs(err);
        sumY += actual[i];
      }
      const rmse = Math.sqrt(sumSqErr / (n || 1));
      const mae = sumAbsErr / (n || 1);
      const rSquared = this.computeR2(actual, pred);

      return {
        rmse: Number(rmse.toFixed(4)),
        mae: Number(mae.toFixed(4)),
        rSquared: Number(rSquared.toFixed(4)),
      };
    } else {
      let tp = 0, fp = 0, fn = 0, tn = 0;
      for (let i = 0; i < n; i++) {
        const a = actual[i] >= 1 ? 1 : 0;
        const p = pred[i] >= 0.5 ? 1 : 0;
        if (a === 1 && p === 1) tp++;
        else if (a === 0 && p === 1) fp++;
        else if (a === 1 && p === 0) fn++;
        else tn++;
      }

      const accuracy = (tp + tn) / (n || 1);
      const precision = tp / (tp + fp || 1);
      const recall = tp / (tp + fn || 1);
      const f1Score = (2 * precision * recall) / (precision + recall || 1);

      return {
        accuracy: Number(accuracy.toFixed(4)),
        precision: Number(precision.toFixed(4)),
        recall: Number(recall.toFixed(4)),
        f1Score: Number(f1Score.toFixed(4)),
      };
    }
  }

  private static computeR2(actual: number[], pred: number[]): number {
    const n = actual.length;
    if (n === 0) return 0;
    const mean = actual.reduce((a, b) => a + b, 0) / n;
    let ssr = 0, sst = 0;
    for (let i = 0; i < n; i++) {
      ssr += Math.pow(actual[i] - pred[i], 2);
      sst += Math.pow(actual[i] - mean, 2);
    }
    return sst > 0 ? Math.max(0, 1 - ssr / sst) : 0;
  }

  private static computeF1(actual: number[], pred: number[]): number {
    let tp = 0, fp = 0, fn = 0;
    for (let i = 0; i < actual.length; i++) {
      const a = actual[i] >= 1 ? 1 : 0;
      const p = pred[i] >= 0.5 ? 1 : 0;
      if (a === 1 && p === 1) tp++;
      else if (a === 0 && p === 1) fp++;
      else if (a === 1 && p === 0) fn++;
    }
    const precision = tp / (tp + fp || 1);
    const recall = tp / (tp + fn || 1);
    return (2 * precision * recall) / (precision + recall || 1);
  }
}
