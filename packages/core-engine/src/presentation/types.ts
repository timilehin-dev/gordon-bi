export interface PresentationSlide {
  title: string;
  subtitle?: string;
  bulletPoints: string[];
  kpiHighlight?: {
    label: string;
    value: string | number;
    trendDirection?: 'up' | 'down' | 'neutral';
  };
  chartRecommendation?: string;
  speakerNotes: string;
}

export interface PptxPresentationDeck {
  deckTitle: string;
  companyOrProject: string;
  author: string;
  slides: PresentationSlide[];
  theme: 'modern_dark' | 'corporate_light' | 'executive_navy';
}

export interface PptxExportResult {
  deckTitle: string;
  slideCount: number;
  openXmlManifest: string;
  jsonSlidesSpec: string;
  generatedAt: number;
}
