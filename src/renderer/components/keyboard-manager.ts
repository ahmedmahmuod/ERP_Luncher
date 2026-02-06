/**
 * Keyboard Shortcuts Manager
 * Handles global keyboard shortcuts for the application
 */

export interface KeyboardShortcuts {
  'search-focus': () => void;
  escape: () => void;
  'toggle-logs': () => void;
  'run-all': () => void;
  'stop-all': () => void;
}

export class KeyboardManager {
  private shortcuts: Partial<KeyboardShortcuts> = {};
  private isListening: boolean = false;

  register(shortcut: keyof KeyboardShortcuts, callback: () => void): void {
    this.shortcuts[shortcut] = callback;
  }

  start(): void {
    if (!this.isListening) {
      document.addEventListener('keydown', this.handleKeyDown);
      this.isListening = true;
    }
  }

  stop(): void {
    if (this.isListening) {
      document.removeEventListener('keydown', this.handleKeyDown);
      this.isListening = false;
    }
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    // Ctrl+K or Cmd+K - Focus search
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.shortcuts['search-focus']?.();
      return;
    }

    // Escape - Close dialogs/panels
    if (event.key === 'Escape') {
      event.preventDefault();
      this.shortcuts['escape']?.();
      return;
    }

    // Ctrl+L or Cmd+L - Toggle logs
    if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
      event.preventDefault();
      this.shortcuts['toggle-logs']?.();
      return;
    }

    // Ctrl+Shift+R - Run all
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
      event.preventDefault();
      this.shortcuts['run-all']?.();
      return;
    }

    // Ctrl+Shift+S - Stop all
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
      event.preventDefault();
      this.shortcuts['stop-all']?.();
      return;
    }
  };
}
