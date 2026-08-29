export interface GrangerCausalityParams {
  xSeries: number[];
  ySeries: number[];
  maxLag?: number;
}

export interface GrangerCausalityResult {
  isCausal: boolean;
  bestLag: number;
  fStatistic: number;
  pValue: number;
  rSquaredUnrestricted: number;
  rSquaredRestricted: number;
  interpretation: string;
}

export interface CointegrationParams {
  seriesA: number[];
  seriesB: number[];
}

export interface CointegrationResult {
  isCointegrated: boolean;
  betaSlope: number;
  alphaIntercept: number;
  adfStatistic: number;
  criticalValue95: number;
  rSquared: number;
  interpretation: string;
}

export interface GarchParams {
  returns: number[];
  confidenceLevel?: number; // 0.95 or 0.99
}

export interface GarchResult {
  omega: number;
  alpha: number;
  beta: number;
  persistence: number;
  longRunVolatility: number;
  conditionalVolatilities: number[];
  varHorizon1: number;
  cvarHorizon1: number;
}

export interface HpFilterParams {
  series: number[];
  lambda?: number; // default: 1600 (quarterly), 14400 (monthly), 100 (annual)
}

export interface HpFilterResult {
  trend: number[];
  cycle: number[];
  cycleVarianceRatio: number;
}
