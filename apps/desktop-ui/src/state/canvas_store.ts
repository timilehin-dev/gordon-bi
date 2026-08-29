import { ChartSpec, VisualCardLayout, ReportCanvasLayout, CrossFilterState } from '@gordon/shared-types';

export class CanvasStore {
  private layout: ReportCanvasLayout;
  private crossFilter: CrossFilterState = { selectedValues: [] };
  private listeners: Set<(layout: ReportCanvasLayout, filter: CrossFilterState) => void> = new Set();

  constructor() {
    this.layout = {
      id: 'default_canvas',
      title: 'Executive Analytics Report',
      cards: [],
      specs: {},
      theme: 'dark',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  public getLayout(): ReportCanvasLayout {
    return {
      ...this.layout,
      cards: this.layout.cards.map(c => ({ ...c })),
      specs: { ...this.layout.specs },
    };
  }

  public getCrossFilter(): CrossFilterState {
    return { ...this.crossFilter, selectedValues: [...this.crossFilter.selectedValues] };
  }

  public addVisualCard(spec: ChartSpec, layoutProps: Partial<VisualCardLayout> = {}): void {
    const cardId = `card_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newCard: VisualCardLayout = {
      id: cardId,
      chartSpecId: spec.id,
      x: layoutProps.x ?? (this.layout.cards.length % 2) * 6,
      y: layoutProps.y ?? Math.floor(this.layout.cards.length / 2) * 4,
      width: layoutProps.width ?? 6,
      height: layoutProps.height ?? 4,
      zIndex: this.layout.cards.length + 1,
    };

    this.layout.specs[spec.id] = { ...spec };
    this.layout.cards.push(newCard);
    this.layout.updatedAt = Date.now();
    this.notify();
  }

  public updateCardPosition(cardId: string, x: number, y: number): void {
    const card = this.layout.cards.find(c => c.id === cardId);
    if (card) {
      // Snapping to 12-column grid
      card.x = Math.max(0, Math.min(12 - card.width, Math.round(x)));
      card.y = Math.max(0, Math.round(y));
      this.layout.updatedAt = Date.now();
      this.notify();
    }
  }

  public removeCard(cardId: string): void {
    const card = this.layout.cards.find(c => c.id === cardId);
    if (card) {
      delete this.layout.specs[card.chartSpecId];
      this.layout.cards = this.layout.cards.filter(c => c.id !== cardId);
      this.layout.updatedAt = Date.now();
      this.notify();
    }
  }

  public setCrossFilter(dimension: string, value: string | number, sourceCardId: string, multiSelect = false): void {
    if (this.crossFilter.activeDimension !== dimension) {
      this.crossFilter = {
        activeDimension: dimension,
        selectedValues: [value],
        sourceCardId,
      };
    } else {
      const exists = this.crossFilter.selectedValues.some(v => String(v) === String(value));
      if (exists) {
        // Remove value
        const updated = this.crossFilter.selectedValues.filter(v => String(v) !== String(value));
        this.crossFilter = updated.length > 0
          ? { ...this.crossFilter, selectedValues: updated }
          : { selectedValues: [] };
      } else {
        // Append or replace
        this.crossFilter = {
          activeDimension: dimension,
          selectedValues: multiSelect ? [...this.crossFilter.selectedValues, value] : [value],
          sourceCardId,
        };
      }
    }
    this.notify();
  }

  public clearCrossFilter(): void {
    this.crossFilter = { selectedValues: [] };
    this.notify();
  }

  public subscribe(listener: (layout: ReportCanvasLayout, filter: CrossFilterState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const layout = this.getLayout();
    const filter = this.getCrossFilter();
    this.listeners.forEach(l => l(layout, filter));
  }
}
