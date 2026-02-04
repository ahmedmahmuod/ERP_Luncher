import { spawn, ChildProcess } from 'child_process';
import { ProcessState, LogEntry, Solution } from '../types/solution';
import { EventEmitter } from 'events';

export class ProcessManager extends EventEmitter {
  private processes: Map<string, ChildProcess> = new Map();
  private states: Map<string, ProcessState> = new Map();

  constructor() {
    super();
  }

  async startProcess(solution: Solution): Promise<void> {
    if (this.processes.has(solution.id)) {
      throw new Error(`Process ${solution.name} is already running`);
    }

    // Initialize state
    const state: ProcessState = {
      id: solution.id,
      pid: null,
      status: 'starting',
      port: solution.port,
      startTime: null,
      logs: [],
      healthStatus: 'checking',
    };

    this.states.set(solution.id, state);
    this.emit('state-change', solution.id, state);

    try {
      // Spawn process
      const child = spawn(solution.command, solution.args, {
        cwd: solution.repoPath,
        shell: true,
        env: {
          ...process.env,
          PORT: solution.port.toString(),
          FORCE_COLOR: '1',
        },
      });

      this.processes.set(solution.id, child);

      // Update state with PID
      state.pid = child.pid || null;
      state.status = 'running';
      state.startTime = Date.now();
      this.emit('state-change', solution.id, state);

      // Handle stdout
      child.stdout?.on('data', (data: Buffer) => {
        const message = data.toString();
        const log: LogEntry = {
          timestamp: Date.now(),
          type: 'stdout',
          message,
        };
        state.logs.push(log);
        this.emit('log', solution.id, log);
      });

      // Handle stderr
      child.stderr?.on('data', (data: Buffer) => {
        const message = data.toString();
        const log: LogEntry = {
          timestamp: Date.now(),
          type: 'stderr',
          message,
        };
        state.logs.push(log);
        this.emit('log', solution.id, log);
      });

      // Handle process exit
      child.on('exit', (code, signal) => {
        const log: LogEntry = {
          timestamp: Date.now(),
          type: 'system',
          message: `Process exited with code ${code || 0} (signal: ${signal || 'none'})`,
        };
        state.logs.push(log);
        state.status = code === 0 ? 'stopped' : 'error';
        state.pid = null;
        this.emit('log', solution.id, log);
        this.emit('state-change', solution.id, state);
        this.processes.delete(solution.id);
      });

      // Handle errors
      child.on('error', (error) => {
        const log: LogEntry = {
          timestamp: Date.now(),
          type: 'system',
          message: `Error: ${error.message}`,
        };
        state.logs.push(log);
        state.status = 'error';
        this.emit('log', solution.id, log);
        this.emit('state-change', solution.id, state);
      });

      // Add startup log
      const startLog: LogEntry = {
        timestamp: Date.now(),
        type: 'system',
        message: `Started ${solution.name} on port ${solution.port} (PID: ${state.pid})`,
      };
      state.logs.push(startLog);
      this.emit('log', solution.id, startLog);
    } catch (error) {
      state.status = 'error';
      const errorLog: LogEntry = {
        timestamp: Date.now(),
        type: 'system',
        message: `Failed to start: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
      state.logs.push(errorLog);
      this.emit('log', solution.id, errorLog);
      this.emit('state-change', solution.id, state);
      throw error;
    }
  }

  async stopProcess(solutionId: string): Promise<void> {
    const child = this.processes.get(solutionId);
    const state = this.states.get(solutionId);

    if (!child || !state) {
      throw new Error('Process not found');
    }

    const pid = child.pid;
    if (!pid) {
      throw new Error('Process PID not available');
    }

    try {
      // Windows: Kill entire process tree
      if (process.platform === 'win32') {
        const { exec } = await import('child_process');
        exec(`taskkill /pid ${pid} /T /F`, (error) => {
          if (error) {
            console.error('Error killing process tree:', error);
          }
        });
      } else {
        // Unix: Kill process group
        process.kill(-pid, 'SIGTERM');
      }

      const stopLog: LogEntry = {
        timestamp: Date.now(),
        type: 'system',
        message: `Stopped process (PID: ${pid})`,
      };
      state.logs.push(stopLog);
      this.emit('log', solutionId, stopLog);

      this.processes.delete(solutionId);
    } catch (error) {
      const errorLog: LogEntry = {
        timestamp: Date.now(),
        type: 'system',
        message: `Error stopping process: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
      state.logs.push(errorLog);
      this.emit('log', solutionId, errorLog);
      throw error;
    }
  }

  async restartProcess(solution: Solution): Promise<void> {
    if (this.processes.has(solution.id)) {
      await this.stopProcess(solution.id);
      // Wait a bit before restarting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    await this.startProcess(solution);
  }

  getState(solutionId: string): ProcessState | undefined {
    return this.states.get(solutionId);
  }

  getAllStates(): Record<string, ProcessState> {
    const result: Record<string, ProcessState> = {};
    this.states.forEach((state, id) => {
      result[id] = state;
    });
    return result;
  }

  isRunning(solutionId: string): boolean {
    return this.processes.has(solutionId);
  }

  async stopAll(): Promise<void> {
    const stopPromises = Array.from(this.processes.keys()).map((id) => this.stopProcess(id));
    await Promise.allSettled(stopPromises);
  }
}
