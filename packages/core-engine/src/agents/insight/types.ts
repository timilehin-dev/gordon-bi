import { TimeSeriesForecastOutput, AnomalyDetectionOutput, DriverAnalysisOutput } from '@gordon/tool-registry';

export interface NarrativeSection {
  heading: string;
  content: string;
  citationLineageIds: string[];
}

export interface ExecutiveReport {
  title: string;
  generatedAt: number;
  executiveSummary: string;
  sections: NarrativeSection[];
  totalCitations: number;
  fullMarkdown: string;
}

export interface InsightSynthesisInput {
  businessGoal: string;
  tableName: string;
  totalRecords: number;
  forecast?: { output: TimeSeriesForecastOutput; toolExecutionId: string };
  anomalies?: { output: AnomalyDetectionOutput; toolExecutionId: string };
  drivers?: { output: DriverAnalysisOutput; toolExecutionId: string };
  documentReferences?: Array<{ chunkId: string; citationText: string }>;
}
