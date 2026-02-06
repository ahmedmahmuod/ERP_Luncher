export interface Solution {
  id: string;
  name: string;
  repoPath: string;
  command: string;
  args: string[];
  port: number;
  pathSuffix?: string; // Default "/"
  category: string;
  autoStart: boolean;
  baseUrlOverride?: string; // Optional override for baseUrl
  color?: string;
  // REMOVED: url - now computed dynamically as resolvedUrl
}

/**
 * Solution with computed resolved URL
 * Used in renderer for display purposes
 */
export interface SolutionWithUrl extends Solution {
  resolvedUrl: string;
}

export interface ProcessState {
  id: string;
  pid: number | null;
  status: 'stopped' | 'starting' | 'running' | 'error';
  port: number;
  startTime: number | null;
  logs: LogEntry[];
  healthStatus?: 'healthy' | 'unhealthy' | 'checking';
}

export interface LogEntry {
  timestamp: number;
  type: 'stdout' | 'stderr' | 'system';
  message: string;
}

export interface PortCheckResult {
  port: number;
  available: boolean;
  suggestedPort?: number;
}

export interface HealthCheckResult {
  url: string;
  healthy: boolean;
  responseTime?: number;
  error?: string;
}

// IPC API Types
export interface ElectronAPI {
  // Solution Management
  solutions: {
    getAll: () => Promise<Solution[]>;
    add: (solution: Omit<Solution, 'id'>) => Promise<Solution>;
    update: (id: string, solution: Partial<Solution>) => Promise<Solution>;
    delete: (id: string) => Promise<void>;
  };

  // Process Management
  processes: {
    start: (solutionId: string) => Promise<void>;
    stop: (solutionId: string) => Promise<void>;
    restart: (solutionId: string) => Promise<void>;
    getState: (solutionId: string) => Promise<ProcessState>;
    getAllStates: () => Promise<Record<string, ProcessState>>;
    startAll: () => Promise<void>;
    stopAll: () => Promise<void>;
    onStateChange: (callback: (id: string, state: ProcessState) => void) => void;
    onLog: (callback: (id: string, log: LogEntry) => void) => void;
  };

  // Port Management
  ports: {
    check: (port: number) => Promise<PortCheckResult>;
    findAvailable: (startPort: number) => Promise<number>;
  };

  // Shell Operations
  shell: {
    openBrowser: (url: string) => Promise<void>;
    openFolder: (path: string) => Promise<void>;
    selectFolder: () => Promise<string | null>;
  };

  // Window Operations
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };

  // Profile Management
  profiles: {
    getAll: () => Promise<import('./profile').Profile[]>;
    getActive: () => Promise<import('./profile').Profile>;
    setActive: (profileId: string) => Promise<void>;
  };

  // Configuration Management
  config: {
    resetToDefaults: () => Promise<void>;
    validatePath: (path: string) => Promise<boolean>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
