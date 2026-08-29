export type ModelTaskType = 'regression' | 'classification';

export interface ModelFeature {
  name: string;
  type: 'numeric' | 'categorical';
}

export interface AutoMlTrainingParams {
  task: ModelTaskType;
  features: string[];
  target: string;
  dataset: Record<string, any>[];
  cvFolds?: number; // default 3
}

export interface ModelEvaluationMetrics {
  // Regression metrics
  rmse?: number;
  mae?: number;
  rSquared?: number;
  // Classification metrics
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  rocAuc?: number;
}

export interface CandidateModelResult {
  modelName: string;
  task: ModelTaskType;
  rank: number;
  cvScore: number; // Mean CV metric (R2 for regression, F1 for classification)
  metrics: ModelEvaluationMetrics;
  trainingTimeMs: number;
  isBestModel: boolean;
}

export interface FeatureImportanceScore {
  featureName: string;
  importance: number; // 0.0 to 1.0
  rank: number;
}

export interface AutoMlLeaderboardResult {
  task: ModelTaskType;
  totalSamples: number;
  featuresAnalyzed: string[];
  targetVariable: string;
  bestModelName: string;
  leaderboard: CandidateModelResult[];
  featureImportances: FeatureImportanceScore[];
  executiveSummary: string;
}
