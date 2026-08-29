export type ChartType =
  | 'bar'
  | 'line'
  | 'area'
  | 'scatter'
  | 'pie'
  | 'donut'
  | 'heatmap'
  | 'waterfall'
  | 'kpi_card'
  | 'table';

export interface VisualEncoding {
  xField?: string;
  yField?: string;
  categoryField?: string;
  valueField?: string;
  colorField?: string;
  sizeField?: string;
  tooltipFields?: string[];
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none';
}

export interface ChartFormatting {
  numberFormat?: 'currency' | 'percentage' | 'integer' | 'decimal' | 'compact';
  currencySymbol?: string;
  decimalPlaces?: number;
  colorPalette?: string[];
  showLegend?: boolean;
  showGridLines?: boolean;
  xAxisTitle?: string;
  yAxisTitle?: string;
}

export interface ChartSpec {
  id: string;
  title: string;
  chartType: ChartType;
  tableName: string;
  encoding: VisualEncoding;
  formatting?: ChartFormatting;
  filterDimension?: string;
  filterValue?: string | number;
  description?: string;
}

export interface VisualCardLayout {
  id: string;
  chartSpecId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface ReportCanvasLayout {
  id: string;
  title: string;
  cards: VisualCardLayout[];
  specs: Record<string, ChartSpec>;
  theme: 'light' | 'dark' | 'corporate';
  createdAt: number;
  updatedAt: number;
}

export interface CrossFilterState {
  activeDimension?: string;
  selectedValues: Array<string | number>;
  sourceCardId?: string;
}
