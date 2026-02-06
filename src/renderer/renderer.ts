import './styles/tokens.css';
import './styles/app.css';
import '@shoelace-style/shoelace/dist/themes/light.css';

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

// Import components
import { TopBar } from './components/topbar';
import { Sidebar } from './components/sidebar';
import { SolutionCard } from './components/solution-card';
import { LogsPanel } from './components/logs-panel';

// Set Shoelace base path to CDN for icons
setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.16.0/dist/');

// Error Reporting to UI
window.onerror = (msg, url, line) => {
  const errDiv = document.createElement('div');
  errDiv.style.cssText =
    'position:fixed;top:0;left:0;background:var(--danger);color:white;z-index:9999;padding:10px;font-size:10px;width:100%';
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
const solutionModal = document.getElementById('solution-modal') as any;
const solutionForm = document.getElementById('solution-form') as HTMLFormElement;
const browsePathBtn = document.getElementById('browse-path-btn')!;

// Initialize Components
let topBar: TopBar;
let sidebar: Sidebar;
let logsPanel: LogsPanel;

// Initialize
async function init() {
  // Wait a tick to ensure Shoelace components are fully initialized
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Initialize components FIRST before loading data
  initializeComponents();
  setupEventListeners();

  // Then load data which will call updateCategories()
  await loadSolutions();
}

function initializeComponents() {
  // Initialize TopBar
  topBar = new TopBar({
    onSearch: (query) => {
      searchQuery = query;
      renderSolutions();
    },
    onCategoryChange: (category) => {
      categoryFilter = category;
      renderSolutions();
    },
    onAddSolution: () => {
      resetModal();
      solutionModal.label = 'Add New Solution';
      solutionModal.show();
    },
    onRunAll: () => window.electronAPI.processes.startAll(),
    onStopAll: () => window.electronAPI.processes.stopAll(),
    onToggleLogs: () => {
      logsPanel.toggle();
      renderSolutions(); // Re-layout cards
    },
  });

  // Initialize Sidebar
  sidebar = new Sidebar({
    onCategorySelect: (category) => {
      categoryFilter = category;
      topBar.setCategory(category);
      renderSolutions();
    },
  });

  // Initialize LogsPanel
  logsPanel = new LogsPanel({
    onFilterChange: (solutionId) => {
      activeLogSolutionId = solutionId;
      renderLogs();
    },
    onClear: () => {
      logs = [];
      logsPanel.clear();
    },
    onClose: () => {
      logsPanel.hide();
    },
  });
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
    const solutionName = solutions.find((s) => s.id === id)?.name || 'System';
    logsPanel.appendLog(enhancedLog, solutionName);
  }
});

// Event Listeners
function setupEventListeners() {
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

  // Cancel modal
  document.getElementById('cancel-modal-btn')?.addEventListener('click', () => {
    solutionModal.hide();
  });

  // Attach solution card event listeners
  SolutionCard.attachEventListeners(solutionsGrid, {
    onStart: (id) =>
      window.electronAPI.processes
        .start(id)
        .catch((e: any) => showToast('Error', e.message, 'danger')),
    onStop: (id) => window.electronAPI.processes.stop(id),
    onOpen: (url) => window.electronAPI.shell.openBrowser(url),
    onViewLogs: (id) => {
      activeLogSolutionId = id;
      logsPanel.setFilter(id);
      logsPanel.show();
      renderLogs();
    },
    onEdit: (id) => editSolution(id),
    onDelete: (id) => deleteSolution(id),
  });
}

// Data Fetching
async function loadSolutions() {
  solutions = await window.electronAPI.solutions.getAll();
  processStates = await window.electronAPI.processes.getAllStates();
  updateLogFilters();
  updateCategories();
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
      return SolutionCard.render(solution, state, {
        onStart: () => {},
        onStop: () => {},
        onOpen: () => {},
        onViewLogs: () => {},
        onEdit: () => {},
        onDelete: () => {},
      });
    })
    .join('');
}

function renderLogs() {
  const filtered =
    activeLogSolutionId === 'all' ? logs : logs.filter((l) => l.solutionId === activeLogSolutionId);

  const solutionNames = new Map(solutions.map((s) => [s.id, s.name]));
  logsPanel.renderLogs(filtered, solutionNames);
}

function updateCategories() {
  const categories = Array.from(new Set(solutions.map((s) => s.category)));

  // Calculate solution counts per category
  const counts: Record<string, number> = {};
  solutions.forEach((s) => {
    counts[s.category] = (counts[s.category] || 0) + 1;
  });

  topBar.updateCategories(categories);
  sidebar.updateCategories(categories, counts);
}

function updateLogFilters() {
  logsPanel.updateFilters(solutions.map((s) => ({ id: s.id, name: s.name })));
}

// Actions
function editSolution(id: string) {
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
}

async function deleteSolution(id: string) {
  if (confirm('Are you sure you want to delete this solution?')) {
    await window.electronAPI.solutions.delete(id);
    await loadSolutions();
    showToast('Deleted', 'Solution removed', 'warning');
  }
}

// Utilities
function resetModal() {
  solutionForm.reset();
  delete (solutionForm as any).dataset.editingId;
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

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void init();
  });
} else {
  // DOM is already loaded
  void init();
}
