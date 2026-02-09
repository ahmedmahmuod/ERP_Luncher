/**
 * Toast Notification System
 * Centralized toast manager with bottom-right positioning
 */

interface ToastOptions {
  message: string;
  variant?: 'primary' | 'success' | 'neutral' | 'warning' | 'danger';
  icon?: string;
  duration?: number;
}

// Type for Shoelace Alert element
interface SlAlert extends HTMLElement {
  variant: 'primary' | 'success' | 'neutral' | 'warning' | 'danger';
  closable: boolean;
  duration: number;
  toast: () => void;
  hide: () => void;
}

class Toaster {
  private container: HTMLElement | null;
  private toasts: Set<SlAlert> = new Set();

  constructor() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      console.error('Toast container not found! Add <div id="toast-container"></div> to your HTML');
    }
  }

  /**
   * Show a toast notification
   */
  show(options: ToastOptions & { title?: string }): void {
    const toast = document.createElement('sl-alert') as SlAlert;
    toast.variant = options.variant || 'primary';
    toast.closable = true;
    toast.duration = options.duration || 3000;

    // Create content with optional title and icon
    let content = '';
    const iconName =
      options.icon ||
      (options.variant === 'success'
        ? 'check-circle'
        : options.variant === 'danger'
          ? 'exclamation-octagon'
          : 'info-circle');

    content = `<sl-icon name="${iconName}" slot="icon"></sl-icon>`;
    if (options.title) {
      content += `<strong>${options.title}</strong><br />`;
    }
    content += options.message;

    toast.innerHTML = content;

    // Use Shoelace's internal toast functionality
    // This correctly handles the toast stack and positioning
    document.body.appendChild(toast);
    void toast.toast();

    // Remove after hide
    toast.addEventListener('sl-after-hide', () => {
      this.toasts.delete(toast);
      toast.remove();
    });
  }

  /**
   * Show success toast
   */
  success(message: string): void {
    this.show({
      message,
      variant: 'success',
      icon: 'check-circle',
      duration: 3000,
    });
  }

  /**
   * Show error toast
   */
  error(message: string): void {
    this.show({
      message,
      variant: 'danger',
      icon: 'exclamation-triangle',
      duration: 5000,
    });
  }

  /**
   * Show warning toast
   */
  warning(message: string): void {
    this.show({
      message,
      variant: 'warning',
      icon: 'exclamation-circle',
      duration: 4000,
    });
  }

  /**
   * Show info toast
   */
  info(message: string): void {
    this.show({
      message,
      variant: 'primary',
      icon: 'info-circle',
      duration: 3000,
    });
  }

  /**
   * Clear all toasts
   */
  clearAll(): void {
    this.toasts.forEach((toast) => {
      void toast.hide();
    });
    this.toasts.clear();
  }
}

// Export singleton instance
export const toaster = new Toaster();

// Make it globally available for debugging
declare global {
  interface Window {
    toaster: Toaster;
  }
}

window.toaster = toaster;
