import { app, BrowserWindow, ipcMain, shell, dialog, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ProcessManager } from '../core/process-manager';
import { PortManager } from '../core/port-manager';
import { HealthChecker } from '../core/health-check';
import { SolutionManager } from '../core/solution-manager';
import { ProfileManager } from './managers/ProfileManager';
import { Solution } from '../types/solution';
import { SplashWindow } from './windows/splash';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let splashWindow: SplashWindow | null = null;
let tray: Tray | null = null;

// Core managers
const processManager = new ProcessManager();
const portManager = new PortManager();
const healthChecker = new HealthChecker();
const configPath = path.join(app.getPath('userData'), 'solutions.json');
const solutionManager = new SolutionManager(configPath);
const profileManager = new ProfileManager();

const createWindow = () => {
  // Get the correct icon path for both dev and production
  const iconPath = path.join(app.getAppPath(), 'src', 'assets', 'logo.png');
  const icon = nativeImage.createFromPath(iconPath);
  console.log('Window icon path:', iconPath);
  console.log('Icon loaded:', !icon.isEmpty());

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    backgroundColor: '#F7F8FA',
    frame: false,
    show: false, // Don't show until ready
    icon: icon.isEmpty() ? undefined : icon, // Set window icon if it exists
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Show window when ready and close splash after minimum 5 seconds
  const splashStartTime = Date.now();
  const MIN_SPLASH_TIME = 5000; // 5 seconds minimum

  mainWindow.once('ready-to-show', () => {
    const elapsedTime = Date.now() - splashStartTime;
    const remainingTime = Math.max(0, MIN_SPLASH_TIME - elapsedTime);

    // Wait for remaining time to ensure splash shows for at least 5 seconds
    setTimeout(() => {
      // Close splash screen
      if (splashWindow) {
        splashWindow.close();
        splashWindow = null;
      }

      // Show main window with fade-in effect
      mainWindow?.show();
      mainWindow?.focus();
    }, remainingTime);
  });

  // Open DevTools in development
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close
  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin') {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

const createTray = () => {
  // Create tray icon with ASSEMBLE logo
  const iconPath = path.join(app.getAppPath(), 'src', 'assets', 'logo.png');
  const icon = nativeImage.createFromPath(iconPath);

  if (!icon.isEmpty()) {
    tray = new Tray(icon.resize({ width: 16, height: 16 }));
  } else {
    console.error('Tray icon not found at:', iconPath);
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow?.show();
      },
    },
    { type: 'separator' },
    {
      label: 'Start All',
      click: async () => {
        const solutions = await solutionManager.getAll();
        for (const solution of solutions) {
          try {
            await processManager.startProcess(solution);
          } catch (error) {
            console.error(`Failed to start ${solution.name}:`, error);
          }
        }
      },
    },
    {
      label: 'Stop All',
      click: async () => {
        await processManager.stopAll();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip('ERP Launcher');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow?.show();
  });
};

// Initialize app
app.whenReady().then(async () => {
  // Show splash screen first
  splashWindow = new SplashWindow();
  splashWindow.create();

  // Initialize solution manager
  await solutionManager.initialize();

  // Create main window (will show when ready-to-show fires)
  createWindow();
  createTray();
  setupIpcHandlers();

  // Start auto-start solutions
  const autoStartSolutions = await solutionManager.getAutoStart();
  for (const solution of autoStartSolutions) {
    try {
      await processManager.startProcess(solution);
    } catch (error) {
      console.error(`Failed to auto-start ${solution.name}:`, error);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup on quit
app.on('before-quit', async () => {
  await processManager.stopAll();
});

// Setup IPC handlers
function setupIpcHandlers() {
  // Solution Management
  ipcMain.handle('solutions:getAll', async () => {
    return await solutionManager.getAll();
  });

  ipcMain.handle('solutions:add', async (_event, solution: Omit<Solution, 'id'>) => {
    return await solutionManager.add(solution);
  });

  ipcMain.handle('solutions:update', async (_event, id: string, updates: Partial<Solution>) => {
    return await solutionManager.update(id, updates);
  });

  ipcMain.handle('solutions:delete', async (_event, id: string) => {
    await solutionManager.delete(id);
  });

  // Process Management
  ipcMain.handle('processes:start', async (_event, solutionId: string) => {
    const solution = await solutionManager.getById(solutionId);
    if (!solution) {
      throw new Error('Solution not found');
    }

    // Check port availability
    const portCheck = await portManager.checkPort(solution.port);
    if (!portCheck.available) {
      throw new Error(
        `Port ${solution.port} is already in use. Suggested port: ${portCheck.suggestedPort || 'N/A'}`
      );
    }

    await processManager.startProcess(solution);

    // Perform health check after a delay
    setTimeout(async () => {
      // Compute resolved URL for health check
      const resolvedUrl = profileManager.computeResolvedUrl(
        solution.port,
        solution.pathSuffix,
        solution.baseUrlOverride
      );

      const healthy = await healthChecker.waitForHealthy(resolvedUrl, 30000);
      const state = processManager.getState(solutionId);
      if (state) {
        state.healthStatus = healthy ? 'healthy' : 'unhealthy';
        mainWindow?.webContents.send('process:state-change', solutionId, state);
      }
    }, 3000);
  });

  ipcMain.handle('processes:stop', async (_event, solutionId: string) => {
    await processManager.stopProcess(solutionId);
  });

  ipcMain.handle('processes:restart', async (_event, solutionId: string) => {
    const solution = await solutionManager.getById(solutionId);
    if (!solution) {
      throw new Error('Solution not found');
    }
    await processManager.restartProcess(solution);
  });

  ipcMain.handle('processes:getState', async (_event, solutionId: string) => {
    return processManager.getState(solutionId);
  });

  ipcMain.handle('processes:getAllStates', async () => {
    return processManager.getAllStates();
  });

  ipcMain.handle('processes:startAll', async () => {
    const solutions = await solutionManager.getAll();
    for (const solution of solutions) {
      try {
        if (!processManager.isRunning(solution.id)) {
          await processManager.startProcess(solution);
        }
      } catch (error) {
        console.error(`Failed to start ${solution.name}:`, error);
      }
    }
  });

  ipcMain.handle('processes:stopAll', async () => {
    await processManager.stopAll();
  });

  // Port Management
  ipcMain.handle('ports:check', async (_event, port: number) => {
    return await portManager.checkPort(port);
  });

  ipcMain.handle('ports:findAvailable', async (_event, startPort: number) => {
    return await portManager.findAvailablePort(startPort);
  });

  // Shell Operations
  ipcMain.handle('shell:openBrowser', async (_event, url: string) => {
    await shell.openExternal(url);
  });

  ipcMain.handle('shell:openFolder', async (_event, folderPath: string) => {
    await shell.openPath(folderPath);
  });

  ipcMain.handle('shell:selectFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Window Operations
  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    mainWindow?.close();
  });

  // Profile Management
  ipcMain.handle('profiles:getAll', async () => {
    return profileManager.getProfiles();
  });

  ipcMain.handle('profiles:getActive', async () => {
    return profileManager.getActiveProfile();
  });

  ipcMain.handle('profiles:setActive', async (_event, profileId: string) => {
    profileManager.setActiveProfile(profileId);
  });

  // Configuration Management
  ipcMain.handle('config:resetToDefaults', async () => {
    await solutionManager.resetToDefaults();
    profileManager.resetToDefaults();
  });

  ipcMain.handle('config:validatePath', async (_event, pathToValidate: string) => {
    try {
      const stats = await fs.stat(pathToValidate);
      return stats.isDirectory();
    } catch {
      return false;
    }
  });

  // Forward process events to renderer
  processManager.on('state-change', (id, state) => {
    mainWindow?.webContents.send('process:state-change', id, state);
  });

  processManager.on('log', (id, log) => {
    mainWindow?.webContents.send('process:log', id, log);
  });
}

// Declare Vite constants
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;
