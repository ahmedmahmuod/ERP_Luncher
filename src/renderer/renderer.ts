import './styles/main.css';
import '@shoelace-style/shoelace/dist/themes/dark.css';

// Manual registration for reliability with bundling
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';
import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';

import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path';
import { Solution, ProcessState, LogEntry } from '../types/solution';

// Set Shoelace base path to CDN for icons (easiest for dev)
setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.16.0/dist/');

// Error Reporting to UI
window.onerror = (msg, url, line) => {
  const errDiv = document.createElement('div');
  errDiv.style.cssText =
    'position:fixed;top:0;left:0;background:red;color:white;z-index:9999;padding:10px;font-size:10px;width:100%';
  errDiv.textContent = `RENDERER ERROR: ${msg} [Line: ${line}]`;
  document.body.appendChild(errDiv);
};

// Application State
let solutions: Solution[] = [];
let processStates: Record<string, ProcessState> = {};
let activeLogSolutionId: string | null = 'all';
let logs: (LogEntry & { solutionId: string })[] = [];
let searchQuery = '';
let categoryFilter = 'all';

// UI Elements
const solutionsGrid = document.getElementById('solutions-grid')!;
const logsContent = document.getElementById('logs-content')!;
const logsPanel = document.getElementById('logs-panel')!;
const categoryList = document.getElementById('category-list')!;
const searchInput = document.getElementById('search-input') as any;
const categoryFilterSelect = document.getElementById('category-filter') as any;
const logFilterSelect = document.getElementById('log-filter') as any;
const runAllBtn = document.getElementById('run-all-btn')!;
const stopAllBtn = document.getElementById('stop-all-btn')!;
const addSolutionBtn = document.getElementById('add-solution-btn')!;
const solutionModal = document.getElementById('solution-modal') as any;
const solutionForm = document.getElementById('solution-form') as HTMLFormElement;
const toggleLogsBtn = document.getElementById('toggle-logs-btn')!;
const closeLogsBtn = document.getElementById('close-logs-btn')!;
const clearLogsBtn = document.getElementById('clear-logs-btn')!;
const browsePathBtn = document.getElementById('browse-path-btn')!;
const autoScrollCheck = document.getElementById('auto-scroll-check') as any;
const resizeHandle = document.getElementById('resize-handle')!;

// Window Controls
document
  .getElementById('minimize-btn')
  ?.addEventListener('click', () => window.electronAPI.window.minimize());
document
  .getElementById('maximize-btn')
  ?.addEventListener('click', () => window.electronAPI.window.maximize());
document
  .getElementById('close-btn')
  ?.addEventListener('click', () => window.electronAPI.window.close());

// Initialize
async function init() {
  await loadSolutions();
  setupEventListeners();
  updateCategories();
  renderSolutions();
}

// IPC Listeners
window.electronAPI.processes.onStateChange((id: string, state: ProcessState) => {
  processStates[id] = state;
  renderSolutions();
});

window.electronAPI.processes.onLog((id: string, log: LogEntry) => {
  const enhancedLog = { ...log, solutionId: id };
  logs.push(enhancedLog);
  if (logs.length > 5000) logs.shift(); // Max 5000 lines
  if (activeLogSolutionId === 'all' || activeLogSolutionId === id) {
    appendLog(enhancedLog);
  }
});

// Event Listeners
function setupEventListeners() {
  // Toolbar
  searchInput.addEventListener('sl-input', (e: any) => {
    searchQuery = e.target.value.toLowerCase();
    renderSolutions();
  });

  categoryFilterSelect.addEventListener('sl-change', (e: any) => {
    categoryFilter = e.target.value;
    renderSolutions();
  });

  runAllBtn.addEventListener('click', () => window.electronAPI.processes.startAll());
  stopAllBtn.addEventListener('click', () => window.electronAPI.processes.stopAll());

  // Solutions
  addSolutionBtn.addEventListener('click', () => {
    resetModal();
    solutionModal.label = 'Add New Solution';
    solutionModal.show();
  });

  // Logs
  toggleLogsBtn.addEventListener('click', () => {
    logsPanel.classList.toggle('hidden');
    renderSolutions(); // Re-layout cards
  });

  closeLogsBtn.addEventListener('click', () => logsPanel.classList.add('hidden'));

  logFilterSelect.addEventListener('sl-change', (e: any) => {
    activeLogSolutionId = e.target.value;
    renderLogs();
  });

  clearLogsBtn.addEventListener('click', () => {
    logs = [];
    logsContent.innerHTML = '';
    updateLogStats();
  });

  // Modal
  browsePathBtn.addEventListener('click', async () => {
    const path = await window.electronAPI.shell.selectFolder();
    if (path) (document.getElementById('solution-path') as any).value = path;
  });

  solutionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = (solutionForm as any).dataset.editingId;

    const data: Omit<Solution, 'id'> = {
      name: (document.getElementById('solution-name') as any).value,
      repoPath: (document.getElementById('solution-path') as any).value,
      command: (document.getElementById('solution-command') as any).value,
      args: (document.getElementById('solution-args') as any).value
        .split(',')
        .map((a: string) => a.trim())
        .filter((a: string) => a),
      port: parseInt((document.getElementById('solution-port') as any).value),
      category: (document.getElementById('solution-category') as any).value,
      url: (document.getElementById('solution-url') as any).value,
      autoStart: (document.getElementById('solution-autostart') as any).checked,
    };

    try {
      if (id) {
        await window.electronAPI.solutions.update(id, data);
        showToast('Success', 'Solution updated successfully', 'success');
      } else {
        await window.electronAPI.solutions.add(data);
        showToast('Success', 'Solution added successfully', 'success');
      }
      solutionModal.hide();
      await loadSolutions();
    } catch (error: any) {
      showToast('Error', error.message, 'danger');
    }
  });

  // Resizing Logic
  let isResizing = false;
  resizeHandle.addEventListener('mousedown', () => (isResizing = true));
  window.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const width = window.innerWidth - e.clientX;
    if (width > 300 && width < 800) {
      logsPanel.style.width = `${width}px`;
    }
  });
  window.addEventListener('mouseup', () => (isResizing = false));
}

// Data Fetching
async function loadSolutions() {
  solutions = await window.electronAPI.solutions.getAll();
  processStates = await window.electronAPI.processes.getAllStates();
  updateCategories();
  updateLogFilters();
  renderSolutions();
}

// Rendering
function renderSolutions() {
  const filtered = solutions.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery) || s.category.toLowerCase().includes(searchQuery);
    const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  solutionsGrid.innerHTML = filtered
    .map((solution) => {
      const state = processStates[solution.id] || { status: 'stopped', logs: [] };
      const statusColor =
        state.status === 'running'
          ? 'success'
          : state.status === 'error'
            ? 'danger'
            : state.status === 'starting'
              ? 'warning'
              : 'neutral';

      const healthStatus =
        state.healthStatus === 'healthy'
          ? 'success'
          : state.healthStatus === 'unhealthy'
            ? 'danger'
            : 'neutral';

      return `
      <sl-card class="solution-card h-full flex flex-col border border-dark-border bg-dark-elevated">
        <div slot="header" class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="status-pulse bg-accent-${state.status === 'running' ? 'success' : 'danger'}"></span>
            <strong class="text-sm truncate max-w-[150px]">${solution.name}</strong>
          </div>
          <sl-badge variant="${statusColor}" size="small" pill>${state.status.toUpperCase()}</sl-badge>
        </div>

        <div class="space-y-3 py-1">
          <div class="flex items-center justify-between text-[11px] text-text-secondary">
            <span class="flex items-center gap-1"><sl-icon name="folder"></sl-icon> PATH</span>
            <span class="truncate ml-4 flex-1 text-right font-mono" title="${solution.repoPath}">${solution.repoPath.split(/\\|\//).pop()}</span>
          </div>
          
          <div class="flex items-center justify-between text-[11px] text-text-secondary">
            <span class="flex items-center gap-1"><sl-icon name="ethernet"></sl-icon> PORT</span>
            <span class="font-bold text-text-primary">${solution.port}</span>
          </div>

          <div class="flex items-center justify-between text-[11px] text-text-secondary">
            <span class="flex items-center gap-1"><sl-icon name="person"></sl-icon> PID</span>
            <span class="font-mono text-text-primary">${state.pid || '---'}</span>
          </div>

          <div class="flex items-center justify-between text-[11px] text-text-secondary">
            <span class="flex items-center gap-1"><sl-icon name="activity"></sl-icon> HEALTH</span>
             <sl-badge variant="${healthStatus}" size="small" pill>${state.healthStatus || 'N/A'}</sl-badge>
          </div>
        </div>

        <div slot="footer" class="flex items-center justify-between pt-2">
          <div class="flex gap-1">
            ${
              state.status === 'running'
                ? `
              <sl-button variant="danger" size="small" onclick="stopSolution('${solution.id}')">
                <sl-icon name="stop-fill"></sl-icon>
              </sl-button>
            `
                : `
              <sl-button variant="success" size="small" onclick="startSolution('${solution.id}')">
                <sl-icon name="play-fill"></sl-icon>
              </sl-button>
            `
            }
            <sl-button variant="default" size="small" outline onclick="openBrowser('${solution.url}')">
              <sl-icon name="box-arrow-up-right"></sl-icon>
            </sl-button>
          </div>
          
          <div class="flex gap-1">
            <sl-button variant="default" size="small" outline onclick="viewLogs('${solution.id}')">
              <sl-icon name="terminal"></sl-icon>
            </sl-button>
            <sl-dropdown hoist>
              <sl-button slot="trigger" variant="default" size="small" outline caret>
                <sl-icon name="three-dots-vertical"></sl-icon>
              </sl-button>
              <sl-menu>
                <sl-menu-item onclick="editSolution('${solution.id}')">
                  <sl-icon slot="prefix" name="pencil"></sl-icon> Edit
                </sl-menu-item>
                <sl-menu-item onclick="deleteSolution('${solution.id}')" class="text-accent-danger">
                  <sl-icon slot="prefix" name="trash"></sl-icon> Delete
                </sl-menu-item>
              </sl-menu>
            </sl-dropdown>
          </div>
        </div>
      </sl-card>
    `;
    })
    .join('');
}

function renderLogs() {
  const filtered =
    activeLogSolutionId === 'all' ? logs : logs.filter((l) => l.solutionId === activeLogSolutionId);
  logsContent.innerHTML = '';
  filtered.forEach(appendLog);
  updateLogStats();
}

function appendLog(log: LogEntry & { solutionId: string }) {
  const div = document.createElement('div');
  const typeClass =
    log.type === 'stderr' ? 'log-stderr' : log.type === 'system' ? 'log-system' : 'log-stdout';
  const time = new Date(log.timestamp).toLocaleTimeString();
  const solName = solutions.find((s) => s.id === log.solutionId)?.name || 'System';

  div.className = `log-line py-0.5 animate-fade-in ${typeClass}`;
  div.innerHTML = `<span class="opacity-30 mr-2">[${time}]</span><span class="text-accent-primary font-bold mr-2">${solName}</span>${escapeHtml(log.message)}`;

  logsContent.appendChild(div);

  if (autoScrollCheck.checked) {
    logsContent.scrollTop = logsContent.scrollHeight;
  }
  updateLogStats();
}

function updateLogStats() {
  const stats = document.getElementById('log-stats')!;
  stats.textContent = `${logsContent.childElementCount} lines available`;
}

function updateCategories() {
  const categories = ['all', ...Array.from(new Set(solutions.map((s) => s.category)))];

  categoryFilterSelect.innerHTML = categories
    .map((c) => `<sl-option value="${c}">${c.charAt(0).toUpperCase() + c.slice(1)}</sl-option>`)
    .join('');

  categoryList.innerHTML = categories
    .map(
      (c) => `
    <button onclick="setCategory('${c}')" class="nav-item w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${categoryFilter === c ? 'active' : ''}">
      <sl-icon name="${c === 'all' ? 'collection' : 'folder-symlink'}"></sl-icon>
      <span class="hidden lg:block font-medium truncate">${c.charAt(0).toUpperCase() + c.slice(1)}</span>
    </button>
  `
    )
    .join('');
}

function updateLogFilters() {
  logFilterSelect.innerHTML = `
    <sl-option value="all">All Solutions</sl-option>
    ${solutions.map((s) => `<sl-option value="${s.id}">${s.name}</sl-option>`).join('')}
  `;
}

// Actions (Global functions for HTML onclick)
(window as any).startSolution = (id: string) =>
  window.electronAPI.processes.start(id).catch((e: any) => showToast('Error', e.message, 'danger'));
(window as any).stopSolution = (id: string) => window.electronAPI.processes.stop(id);
(window as any).openBrowser = (url: string) => window.electronAPI.shell.openBrowser(url);
(window as any).viewLogs = (id: string) => {
  activeLogSolutionId = id;
  logFilterSelect.value = id;
  logsPanel.classList.remove('hidden');
  renderLogs();
};

(window as any).setCategory = (c: string) => {
  categoryFilter = c;
  categoryFilterSelect.value = c;
  renderSolutions();
  updateCategories();
};

(window as any).editSolution = (id: string) => {
  const sol = solutions.find((s) => s.id === id);
  if (!sol) return;

  resetModal();
  solutionModal.label = `Edit ${sol.name}`;
  (solutionForm as any).dataset.editingId = id;

  (document.getElementById('solution-name') as any).value = sol.name;
  (document.getElementById('solution-path') as any).value = sol.repoPath;
  (document.getElementById('solution-command') as any).value = sol.command;
  (document.getElementById('solution-args') as any).value = sol.args.join(',');
  (document.getElementById('solution-port') as any).value = sol.port;
  (document.getElementById('solution-category') as any).value = sol.category;
  (document.getElementById('solution-url') as any).value = sol.url;
  (document.getElementById('solution-autostart') as any).checked = sol.autoStart;

  solutionModal.show();
};

(window as any).deleteSolution = async (id: string) => {
  if (confirm('Are you sure you want to delete this solution?')) {
    await window.electronAPI.solutions.delete(id);
    await loadSolutions();
    showToast('Deleted', 'Solution removed', 'warning');
  }
};

// Utilities
function resetModal() {
  solutionForm.reset();
  delete (solutionForm as any).dataset.editingId;
}

function escapeHtml(text: string) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(
  title: string,
  message: string,
  variant: 'primary' | 'success' | 'danger' | 'warning' = 'primary'
) {
  const container = document.getElementById('toast-container')!;
  const alert = Object.assign(document.createElement('sl-alert'), {
    variant,
    closable: true,
    duration: 3000,
    innerHTML: `
      <sl-icon slot="icon" name="${variant === 'success' ? 'check-circle' : variant === 'danger' ? 'exclamation-octagon' : 'info-circle'}"></sl-icon>
      <strong>${title}</strong><br />
      ${message}
    `,
  });
  container.appendChild(alert);
  return (alert as any).toast();
}

// Start the app
void init();
