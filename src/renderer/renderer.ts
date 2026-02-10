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
import type { Profile } from '../types/profile';

// Import components
import { TopBar } from './components/topbar';
import { Sidebar } from './components/sidebar';
import { SolutionCard } from './components/solution-card';
import { LogsPanel } from './components/logs-panel';
import { toaster } from './components/Toaster';

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
let activeProfile: Profile | null = null;

/**
 * Compute resolved URL for a solution based on active profile
 */
function computeResolvedUrl(solution: Solution): string {
  const baseUrl = solution.baseUrlOverride || activeProfile?.baseUrl || 'http://localhost';
  const pathSuffix = solution.pathSuffix || '/';
  return `${baseUrl}:${solution.port}${pathSuffix}`;
}

// UI Elements
const solutionsGrid = document.getElementById('solutions-grid')!;
const solutionModal = document.getElementById('solution-modal') as any;
const solutionForm = document.getElementById('solution-form') as HTMLFormElement;
const browsePathBtn = document.getElementById('browse-path-btn')!;
const solutionEnvOverride = document.getElementById('solution-env-override') as any;

// Views
const dashboardView = document.getElementById('dashboard-view')!;
const settingsView = document.getElementById('settings-view')!;
const navDashboard = document.getElementById('nav-dashboard')!;
const navSettings = document.getElementById('nav-settings')!;

// Settings Elements
const activeProfileSelect = document.getElementById('active-profile-select') as any;
const resetDefaultsBtn = document.getElementById('reset-defaults-btn')!;
const profileInfoDisplay = document.getElementById('profile-info-display')!;

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

  // Load active profile
  await loadActiveProfile();

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
      void loadAllProfiles(); // Ensure profiles are loaded for the modal
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

// Load active profile
async function loadActiveProfile() {
  try {
    activeProfile = await window.electronAPI.profiles.getActive();
    console.log('Active profile loaded:', activeProfile);

    // Update settings UI if it exists
    if (activeProfileSelect && activeProfile) {
      activeProfileSelect.value = activeProfile.id;
      updateProfileInfoDisplay();
    }
  } catch (error) {
    console.error('Failed to load active profile:', error);
    // Fallback to local
    activeProfile = { id: 'local', name: 'Local', baseUrl: 'http://localhost' };
  }
}

async function loadAllProfiles() {
  try {
    const profiles = await window.electronAPI.profiles.getAll();
    const options = profiles
      .map((p: Profile) => `<sl-option value="${p.baseUrl}">${p.name} (${p.baseUrl})</sl-option>`)
      .join('');

    if (activeProfileSelect) {
      activeProfileSelect.innerHTML = options;
      if (activeProfile) activeProfileSelect.value = activeProfile.id;
    }

    if (solutionEnvOverride) {
      solutionEnvOverride.innerHTML = `
        <sl-option value="">Follow Global Default</sl-option>
        ${options}
      `;
    }
  } catch (error) {
    console.error('Failed to load all profiles:', error);
  }
}

function updateProfileInfoDisplay() {
  if (profileInfoDisplay && activeProfile) {
    profileInfoDisplay.innerHTML = `
      <div><strong>Current Base URL:</strong> ${activeProfile.baseUrl}</div>
      <div style="margin-top: 4px; opacity: 0.7">All app URLs will resolve relative to this address.</div>
    `;
  }
}

function switchView(view: 'dashboard' | 'settings') {
  if (view === 'dashboard') {
    dashboardView.classList.remove('hidden');
    settingsView.classList.add('hidden');
    navDashboard.classList.add('active');
    navSettings.classList.remove('active');
  } else {
    dashboardView.classList.add('hidden');
    settingsView.classList.remove('hidden');
    navDashboard.classList.remove('active');
    navSettings.classList.add('active');
    void loadAllProfiles();
  }
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

  // Navigation
  navDashboard.addEventListener('click', () => switchView('dashboard'));
  navSettings.addEventListener('click', () => switchView('settings'));

  // Settings
  activeProfileSelect.addEventListener('sl-change', async () => {
    const profileId = activeProfileSelect.value;
    await window.electronAPI.profiles.setActive(profileId);
    await loadActiveProfile();
    toaster.info(`Switched to ${activeProfile?.name} environment`);
    renderSolutions(); // Update all card URLs
  });

  resetDefaultsBtn.addEventListener('click', async () => {
    if (
      confirm('Are you sure you want to reset all configurations? This will restore default apps.')
    ) {
      try {
        await window.electronAPI.config.resetToDefaults();
        await loadActiveProfile();
        await loadSolutions();
        toaster.success('Restored default solutions and profiles');
        switchView('dashboard');
      } catch (error: any) {
        toaster.error(error.message);
      }
    }
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
      pathSuffix: (document.getElementById('solution-pathsuffix') as any)?.value || '/',
      category: (document.getElementById('solution-category') as any).value,
      autoStart: (document.getElementById('solution-autostart') as any).checked,
      baseUrlOverride: solutionEnvOverride.value || undefined,
    };

    try {
      if (id) {
        await window.electronAPI.solutions.update(id, data);
        toaster.success('Solution updated successfully');
      } else {
        await window.electronAPI.solutions.add(data);
        toaster.success('Solution added successfully');
      }
      solutionModal.hide();
      await loadSolutions();
    } catch (error: any) {
      toaster.error(error.message);
    }
  });

  // Cancel modal
  document.getElementById('cancel-modal-btn')?.addEventListener('click', () => {
    solutionModal.hide();
  });

  // Attach solution card event listeners
  SolutionCard.attachEventListeners(solutionsGrid, {
    onStart: async (id) => {
      const solution = solutions.find((s) => s.id === id);
      if (!solution) return;

      // Validate repository path
      if (!solution.repoPath || solution.repoPath.trim() === '') {
        toaster.error(
          `Cannot start ${solution.name}: Repository path is not configured. Please edit the solution and add a valid path.`
        );
        // Automatically open edit modal to help user
        setTimeout(() => editSolution(id), 500);
        return;
      }

      // Validate path exists
      const pathExists = await window.electronAPI.config.validatePath(solution.repoPath);
      if (!pathExists) {
        toaster.error(
          `Cannot start ${solution.name}: Repository path does not exist. Please verify the path is correct.`
        );
        setTimeout(() => editSolution(id), 500);
        return;
      }

      window.electronAPI.processes.start(id).catch((e: any) => toaster.error(e.message));
    },
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
      const resolvedUrl = computeResolvedUrl(solution);
      return SolutionCard.render(solution, state, resolvedUrl, {
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
  (document.getElementById('solution-pathsuffix') as any).value = sol.pathSuffix || '/';
  (document.getElementById('solution-category') as any).value = sol.category;
  (document.getElementById('solution-autostart') as any).checked = sol.autoStart;
  solutionEnvOverride.value = sol.baseUrlOverride || '';

  void loadAllProfiles().then(() => {
    solutionModal.show();
  });
}

async function deleteSolution(id: string) {
  if (confirm('Are you sure you want to delete this solution?')) {
    await window.electronAPI.solutions.delete(id);
    await loadSolutions();
    toaster.warning('Solution removed');
  }
}

function resetModal() {
  solutionForm.reset();
  delete (solutionForm as any).dataset.editingId;

  // Set defaults programmatically
  (document.getElementById('solution-command') as any).value = 'ng';
  (document.getElementById('solution-args') as any).value = 'serve';
  (document.getElementById('solution-port') as any).value = '4200';
  (document.getElementById('solution-category') as any).value = 'Frontend';
  (document.getElementById('solution-pathsuffix') as any).value = '/';
  if (solutionEnvOverride) solutionEnvOverride.value = '';
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
