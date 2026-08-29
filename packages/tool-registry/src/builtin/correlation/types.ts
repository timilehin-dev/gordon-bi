export interface DriverAttribution {
  featureName: string;
  correlation: number;
  regressionCoefficient: number;
  importanceScore: number;
  impactDirection: 'positive' | 'negative';
}

export interface DriverAnalysisInput {
  targetMetric: string;
  targetValues: number[];
  features: Record<string, number[]>;
}

export interface DriverAnalysisOutput {
  targetMetric: string;
  totalObservations: number;
  drivers: DriverAttribution[];
  rSquared: number;
  keyPositiveDriver?: string;
  keyNegativeDriver?: string;
}
