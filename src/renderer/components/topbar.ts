/**
 * Top Bar Component
 * Handles search, category filtering, and primary actions
 */

export interface TopBarCallbacks {
  onSearch: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onAddSolution: () => void;
  onRunAll: () => void;
  onStopAll: () => void;
  onToggleLogs: () => void;
}

// Shoelace component types
interface ShoelaceInputEvent extends Event {
  target: HTMLElement & { value: string };
}

interface ShoelaceChangeEvent extends Event {
  target: HTMLElement & { value: string };
}

export class TopBar {
  private searchInput: HTMLElement | null;
  private categorySelect: HTMLElement | null;
  private callbacks: TopBarCallbacks;

  constructor(callbacks: TopBarCallbacks) {
    this.callbacks = callbacks;
    this.searchInput = document.getElementById('search-input');
    this.categorySelect = document.getElementById('category-filter');
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Search input
    this.searchInput?.addEventListener('sl-input', (e: Event) => {
      const event = e as ShoelaceInputEvent;
      this.callbacks.onSearch(event.target.value.toLowerCase());
    });

    // Category filter
    this.categorySelect?.addEventListener('sl-change', (e: Event) => {
      const event = e as ShoelaceChangeEvent;
      this.callbacks.onCategoryChange(event.target.value);
    });

    // Action buttons
    document.getElementById('add-solution-btn')?.addEventListener('click', () => {
      this.callbacks.onAddSolution();
    });

    document.getElementById('run-all-btn')?.addEventListener('click', () => {
      this.callbacks.onRunAll();
    });

    document.getElementById('stop-all-btn')?.addEventListener('click', () => {
      this.callbacks.onStopAll();
    });

    document.getElementById('toggle-logs-btn')?.addEventListener('click', () => {
      this.callbacks.onToggleLogs();
    });
  }

  updateCategories(categories: string[]): void {
    if (!this.categorySelect) return;

    const allCategories = ['all', ...categories];
    this.categorySelect.innerHTML = allCategories
      .map((c) => `<sl-option value="${c}">${c.charAt(0).toUpperCase() + c.slice(1)}</sl-option>`)
      .join('');
  }

  setCategory(category: string): void {
    if (this.categorySelect) {
      (this.categorySelect as HTMLElement & { value: string }).value = category;
    }
  }
}
