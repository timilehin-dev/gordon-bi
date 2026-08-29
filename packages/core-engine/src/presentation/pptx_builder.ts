import { PptxPresentationDeck, PptxExportResult, PresentationSlide } from './types.js';
import { PresentationBuilderError } from './errors.js';

export class PptxPresentationBuilderTool {
  public static buildDeck(deck: PptxPresentationDeck): PptxExportResult {
    if (!deck.deckTitle || !Array.isArray(deck.slides) || deck.slides.length === 0) {
      throw new PresentationBuilderError('Deck title and at least one slide are required', 'INVALID_DECK');
    }

    const xmlSlides = deck.slides.map((s, idx) => this.generateSlideXml(s, idx + 1)).join('\n');

    const openXmlManifest = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <!-- Gordon Autonomous Analytics Presentation Deck: ${deck.deckTitle} -->
  <!-- Author: ${deck.author} | Theme: ${deck.theme} -->
  <p:sldIdLst>
${deck.slides.map((_, i) => `    <p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`).join('\n')}
  </p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="9144000"/>
  <p:slideContent>
${xmlSlides}
  </p:slideContent>
</p:presentation>`;

    const jsonSlidesSpec = JSON.stringify(deck, null, 2);

    return {
      deckTitle: deck.deckTitle,
      slideCount: deck.slides.length,
      openXmlManifest,
      jsonSlidesSpec,
      generatedAt: Date.now(),
    };
  }

  private static generateSlideXml(slide: PresentationSlide, slideNumber: number): string {
    const bulletsXml = slide.bulletPoints
      .map(bp => `        <a:p><a:r><a:t>${this.escapeXml(bp)}</a:t></a:r></a:p>`)
      .join('\n');

    const kpiXml = slide.kpiHighlight
      ? `        <a:p><a:r><a:t>[KPI] ${this.escapeXml(slide.kpiHighlight.label)}: ${this.escapeXml(String(slide.kpiHighlight.value))}</a:t></a:r></a:p>`
      : '';

    return `    <p:sld number="${slideNumber}">
      <p:title>${this.escapeXml(slide.title)}</p:title>
      ${slide.subtitle ? `<p:subtitle>${this.escapeXml(slide.subtitle)}</p:subtitle>` : ''}
      <p:body>
${bulletsXml}
${kpiXml}
      </p:body>
      <p:notes>${this.escapeXml(slide.speakerNotes)}</p:notes>
    </p:sld>`;
  }

  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
