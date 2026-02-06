/**
 * Layout Settings Manager
 * Persists user layout preferences in localStorage
 */

export interface LayoutSettings {
  logsPanelVisible: boolean;
  logsPanelWidth: number;
  sidebarCollapsed: boolean;
}

const DEFAULT_SETTINGS: LayoutSettings = {
  logsPanelVisible: false,
  logsPanelWidth: 450,
  sidebarCollapsed: false,
};

const STORAGE_KEY = 'erp-launcher-layout';

export class LayoutManager {
  private settings: LayoutSettings;

  constructor() {
    this.settings = this.load();
  }

  private load(): LayoutSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...(JSON.parse(stored) as LayoutSettings) };
      }
    } catch (error) {
      console.error('Failed to load layout settings:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save layout settings:', error);
    }
  }

  get(): LayoutSettings {
    return { ...this.settings };
  }

  update(updates: Partial<LayoutSettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.save();
  }

  setLogsPanelVisible(visible: boolean): void {
    this.update({ logsPanelVisible: visible });
  }

  setLogsPanelWidth(width: number): void {
    this.update({ logsPanelWidth: width });
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.update({ sidebarCollapsed: collapsed });
  }

  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.save();
  }
}
