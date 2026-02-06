/**
 * Solution Card Component
 * Renders individual solution cards with actions
 */

import type { Solution, ProcessState } from '../../types/solution';

export interface SolutionCardCallbacks {
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onOpen: (url: string) => void;
  onViewLogs: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export class SolutionCard {
  static render(
    solution: Solution,
    state: ProcessState,
    resolvedUrl: string,
    _callbacks: SolutionCardCallbacks
  ): string {
    const statusVariant = this.getStatusVariant(state.status);
    const healthVariant = this.getHealthVariant(state.healthStatus);
    const statusClass = state.status === 'running' ? 'running' : state.status;

    return `
      <sl-card class="solution-card">
        <div slot="header" class="card-header">
          <div class="card-title">
            <span class="status-pulse ${statusClass}"></span>
            <strong class="truncate" style="max-width: 200px;" title="${solution.name}">
              ${solution.name}
            </strong>
          </div>
          <sl-badge variant="${statusVariant}" size="small" pill>
            ${state.status.toUpperCase()}
          </sl-badge>
        </div>

        <div class="card-body">
          <div class="card-info-row">
            <span class="card-info-label">
              <sl-icon name="folder"></sl-icon>
              PATH
            </span>
            <span class="card-info-value truncate" style="max-width: 150px;" title="${solution.repoPath}">
              ${solution.repoPath.split(/[\\/]/).pop() || ''}
            </span>
          </div>

          <div class="card-info-row">
            <span class="card-info-label">
              <sl-icon name="ethernet"></sl-icon>
              PORT
            </span>
            <span class="card-info-value">${solution.port}</span>
          </div>

          <div class="card-info-row">
            <span class="card-info-label">
              <sl-icon name="cpu"></sl-icon>
              PID
            </span>
            <span class="card-info-value">${state.pid || '---'}</span>
          </div>

          <div class="card-info-row">
            <span class="card-info-label">
              <sl-icon name="activity"></sl-icon>
              HEALTH
            </span>
            <sl-badge variant="${healthVariant}" size="small" pill>
              ${state.healthStatus || 'N/A'}
            </sl-badge>
          </div>
        </div>

        <div slot="footer" class="card-footer">
          <div class="card-actions">
            ${
              state.status === 'running'
                ? `
              <sl-button 
                variant="danger" 
                size="small" 
                data-action="stop" 
                data-id="${solution.id}"
              >
                <sl-icon slot="prefix" name="stop-fill"></sl-icon>
                Stop
              </sl-button>
            `
                : `
              <sl-button 
                variant="success" 
                size="small" 
                data-action="start" 
                data-id="${solution.id}"
              >
                <sl-icon slot="prefix" name="play-fill"></sl-icon>
                Run
              </sl-button>
            `
            }
            <sl-button 
              variant="default" 
              size="small" 
              outline 
              data-action="open" 
              data-url="${resolvedUrl}"
            >
              <sl-icon name="box-arrow-up-right"></sl-icon>
            </sl-button>
          </div>

          <div class="card-actions">
            <sl-button 
              variant="default" 
              size="small" 
              outline 
              data-action="logs" 
              data-id="${solution.id}"
            >
              <sl-icon name="terminal"></sl-icon>
            </sl-button>
            <sl-dropdown hoist>
              <sl-button slot="trigger" variant="default" size="small" outline caret>
                <sl-icon name="three-dots-vertical"></sl-icon>
              </sl-button>
              <sl-menu>
                <sl-menu-item data-action="edit" data-id="${solution.id}">
                  <sl-icon slot="prefix" name="pencil"></sl-icon>
                  Edit
                </sl-menu-item>
                <sl-menu-item data-action="delete" data-id="${solution.id}" style="color: var(--danger);">
                  <sl-icon slot="prefix" name="trash"></sl-icon>
                  Delete
                </sl-menu-item>
              </sl-menu>
            </sl-dropdown>
          </div>
        </div>
      </sl-card>
    `;
  }

  static attachEventListeners(container: HTMLElement, callbacks: SolutionCardCallbacks): void {
    // Delegate events from the container
    container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('[data-action]') as HTMLElement;

      if (!button) return;

      const action = button.dataset.action;
      const id = button.dataset.id;
      const url = button.dataset.url;

      switch (action) {
        case 'start':
          if (id) callbacks.onStart(id);
          break;
        case 'stop':
          if (id) callbacks.onStop(id);
          break;
        case 'open':
          if (url) callbacks.onOpen(url);
          break;
        case 'logs':
          if (id) callbacks.onViewLogs(id);
          break;
        case 'edit':
          if (id) callbacks.onEdit(id);
          break;
        case 'delete':
          if (id) callbacks.onDelete(id);
          break;
      }
    });
  }

  private static getStatusVariant(status: string): string {
    switch (status) {
      case 'running':
        return 'success';
      case 'error':
        return 'danger';
      case 'starting':
        return 'warning';
      default:
        return 'neutral';
    }
  }

  private static getHealthVariant(health?: string): string {
    switch (health) {
      case 'healthy':
        return 'success';
      case 'unhealthy':
        return 'danger';
      default:
        return 'neutral';
    }
  }
}
