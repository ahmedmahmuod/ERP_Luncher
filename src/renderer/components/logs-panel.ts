/**
 * Logs Panel Component
 * Handles log display, filtering, and controls
 */

import type { LogEntry } from '../../types/solution';

export interface LogsPanelCallbacks {
  onFilterChange: (solutionId: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export class LogsPanel {
  private panel: HTMLElement;
  private content: HTMLElement;
  private filterSelect: any;
  private autoScrollCheck: any;
  private statsElement: HTMLElement;
  private resizeHandle: HTMLElement;
  private callbacks: LogsPanelCallbacks;
  private isResizing: boolean = false;

  constructor(callbacks: LogsPanelCallbacks) {
    this.callbacks = callbacks;
    this.panel = document.getElementById('logs-panel')!;
    this.content = document.getElementById('logs-content')!;
    this.filterSelect = document.getElementById('log-filter');
    this.autoScrollCheck = document.getElementById('auto-scroll-check');
    this.statsElement = document.getElementById('log-stats')!;
    this.resizeHandle = document.getElementById('resize-handle')!;

    this.setupEventListeners();
    this.setupResizing();
  }

  private setupEventListeners(): void {
    // Filter change
    this.filterSelect?.addEventListener('sl-change', (e: any) => {
      this.callbacks.onFilterChange(e.target.value);
    });

    // Clear logs
    document.getElementById('clear-logs-btn')?.addEventListener('click', () => {
      this.callbacks.onClear();
    });

    // Close panel
    document.getElementById('close-logs-btn')?.addEventListener('click', () => {
      this.callbacks.onClose();
    });
  }

  private setupResizing(): void {
    this.resizeHandle.addEventListener('mousedown', () => {
      this.isResizing = true;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isResizing) return;

      const width = window.innerWidth - e.clientX;
      if (width > 300 && width < 800) {
        this.panel.style.width = `${width}px`;
      }
    });

    window.addEventListener('mouseup', () => {
      this.isResizing = false;
    });
  }

  show(): void {
    this.panel.classList.remove('hidden');
  }

  hide(): void {
    this.panel.classList.add('hidden');
  }

  toggle(): void {
    this.panel.classList.toggle('hidden');
  }

  isVisible(): boolean {
    return !this.panel.classList.contains('hidden');
  }

  updateFilters(solutions: Array<{ id: string; name: string }>): void {
    if (!this.filterSelect) return;

    this.filterSelect.innerHTML = `
      <sl-option value="all">All Solutions</sl-option>
      ${solutions.map((s) => `<sl-option value="${s.id}">${s.name}</sl-option>`).join('')}
    `;
  }

  setFilter(solutionId: string): void {
    if (this.filterSelect) {
      this.filterSelect.value = solutionId;
    }
  }

  appendLog(log: LogEntry & { solutionId: string }, solutionName: string): void {
    const div = document.createElement('div');
    const typeClass = this.getLogTypeClass(log.type);
    const time = new Date(log.timestamp).toLocaleTimeString();

    div.className = `log-line ${typeClass}`;
    div.innerHTML = `<span class="text-muted">[${time}]</span> <span style="color: var(--primary); font-weight: var(--font-semibold);">${solutionName}</span> ${this.escapeHtml(log.message)}`;

    this.content.appendChild(div);

    if (this.autoScrollCheck?.checked) {
      this.content.scrollTop = this.content.scrollHeight;
    }

    this.updateStats();
  }

  clear(): void {
    this.content.innerHTML = '';
    this.updateStats();
  }

  renderLogs(
    logs: Array<LogEntry & { solutionId: string }>,
    solutionNames: Map<string, string>
  ): void {
    this.content.innerHTML = '';
    logs.forEach((log) => {
      const solutionName = solutionNames.get(log.solutionId) || 'System';
      this.appendLog(log, solutionName);
    });
  }

  private updateStats(): void {
    const count = this.content.childElementCount;
    this.statsElement.textContent = `${count} line${count !== 1 ? 's' : ''}`;
  }

  private getLogTypeClass(type: string): string {
    switch (type) {
      case 'stderr':
        return 'stderr';
      case 'system':
        return 'system';
      default:
        return 'stdout';
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
