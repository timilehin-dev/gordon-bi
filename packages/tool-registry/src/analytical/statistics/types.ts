export type HypothesisTestType =
  | 'two_sample_ttest'
  | 'paired_ttest'
  | 'one_way_anova'
  | 'mann_whitney_u'
  | 'chi_square_independence';

export interface HypothesisTestParams {
  testType: HypothesisTestType;
  groupA: number[];
  groupB?: number[];
  groupsAnova?: number[][];
  contingencyTable?: number[][];
  alpha?: number; // default 0.05
}

export interface HypothesisTestResult {
  testType: HypothesisTestType;
  testStatistic: number;
  pValue: number;
  isSignificant: boolean;
  alpha: number;
  degreesOfFreedom?: number;
  effectSize?: number; // Cohen's d or Eta-squared or Cramér's V
  effectSizeInterpretation?: string;
  interpretation: string;
}

export type DistributionType = 'normal' | 'lognormal' | 'exponential' | 'poisson';

export interface DistributionFitParams {
  data: number[];
  targetDistribution?: DistributionType; // If omitted, tests all and picks best fit
}

export interface FittedDistributionSummary {
  distribution: DistributionType;
  parameters: Record<string, number>;
  ksStatistic: number;
  pValue: number;
  logLikelihood: number;
  bic: number;
  isGoodFit: boolean;
}

export interface DistributionFitResult {
  bestFit: FittedDistributionSummary;
  allCandidates: FittedDistributionSummary[];
}

export interface AbTestParams {
  controlVisitors: number;
  controlConversions: number;
  treatmentVisitors: number;
  treatmentConversions: number;
  alpha?: number; // default 0.05
}

export interface AbTestResult {
  controlRate: number;
  treatmentRate: number;
  absoluteLift: number;
  relativeLiftPercent: number;
  zStatistic: number;
  pValue: number;
  isSignificant: boolean;
  confidenceInterval95: [number, number];
  bayesianProbabilityTreatmentBeatsControl: number;
  recommendation: 'Adopt Treatment' | 'Retain Control' | 'Continue Experiment';
}
