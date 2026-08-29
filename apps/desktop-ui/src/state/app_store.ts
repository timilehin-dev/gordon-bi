export type ActiveView = 'report' | 'data' | 'model' | 'lineage' | 'settings';
export type AppTheme = 'dark' | 'light' | 'corporate';

export interface AppState {
  activeView: ActiveView;
  theme: AppTheme;
  agentPanelOpen: boolean;
  selectedTable: string | null;
  loadedTables: string[];
  selectedLineageId: string | null;
  statusMessage: string;
}

export class AppStore {
  private state: AppState;
  private listeners: Set<(state: AppState) => void> = new Set();

  constructor() {
    this.state = {
      activeView: 'report',
      theme: 'dark',
      agentPanelOpen: true,
      selectedTable: null,
      loadedTables: [],
      selectedLineageId: null,
      statusMessage: 'Ready',
    };
  }

  public getState(): AppState {
    return { ...this.state };
  }

  public setActiveView(view: ActiveView): void {
    this.state.activeView = view;
    this.notify();
  }

  public setSelectedLineageId(id: string | null): void {
    this.state.selectedLineageId = id;
    if (id) {
      this.state.activeView = 'lineage';
    }
    this.notify();
  }

  public setTheme(theme: AppTheme): void {
    this.state.theme = theme;
    this.notify();
  }

  public toggleAgentPanel(): void {
    this.state.agentPanelOpen = !this.state.agentPanelOpen;
    this.notify();
  }

  public setSelectedTable(table: string | null): void {
    this.state.selectedTable = table;
    this.notify();
  }

  public setLoadedTables(tables: string[]): void {
    this.state.loadedTables = [...tables];
    if (tables.length > 0 && !this.state.selectedTable) {
      this.state.selectedTable = tables[0];
    }
    this.notify();
  }

  public setStatusMessage(msg: string): void {
    this.state.statusMessage = msg;
    this.notify();
  }

  public subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(l => l(this.getState()));
  }
}
