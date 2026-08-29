import { ChartSpec, ChartType, TableProfile } from '@gordon/shared-types';

export interface VisualRecommendation {
  chartSpec: ChartSpec;
  confidenceScore: number;
  rationale: string;
}

export interface EChartsOption {
  title?: { text: string; subtext?: string; left?: string };
  tooltip?: { trigger: string; formatter?: string | ((params: any) => string) };
  legend?: { data?: string[]; show?: boolean };
  xAxis?: { type: string; data?: string[]; name?: string };
  yAxis?: { type: string; name?: string };
  series: Array<{
    name?: string;
    type: string;
    data: any[];
    smooth?: boolean;
    areaStyle?: Record<string, any>;
    itemStyle?: Record<string, any>;
    radius?: string | string[];
  }>;
  color?: string[];
  animation?: boolean;
}
