export interface AnomalyItem {
  index: number;
  periodLabel?: string;
  actualValue: number;
  expectedBaseline: number;
  deviation: number;
  zScore: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectionMethod: 'z_score' | 'iqr' | 'changepoint';
}

export interface ChangePoint {
  index: number;
  periodLabel?: string;
  beforeMean: number;
  afterMean: number;
  shiftDelta: number;
  shiftPercentage: number;
}

export interface AnomalyDetectionInput {
  series: number[];
  labels?: string[];
  sensitivity?: 'low' | 'medium' | 'high';
  metricName?: string;
}

export interface AnomalyDetectionOutput {
  metricName: string;
  totalPoints: number;
  anomalyCount: number;
  anomalies: AnomalyItem[];
  changePoints: ChangePoint[];
  baselineMean: number;
  baselineStdDev: number;
}
