import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import { Solution } from '../types/solution';
import { randomUUID } from 'crypto';

// Old solution format for migration
interface LegacySolution {
  id: string;
  name: string;
  repoPath: string;
  command: string;
  args: string[];
  port: number;
  url?: string; // Old format had url
  category: string;
  autoStart: boolean;
  color?: string;
}

export class SolutionManager {
  private configPath: string;
  private solutions: Solution[] = [];
  private defaultSolutionsPath: string;
  private isFirstRun: boolean = false;

  constructor(configPath: string) {
    this.configPath = configPath;
    this.defaultSolutionsPath = path.join(app.getAppPath(), 'config', 'default-solutions.json');
  }

  /**
   * Initialize and load solutions from file
   */
  async initialize(): Promise<void> {
    try {
      await this.ensureConfigFile();
      await this.load();
      await this.migrateIfNeeded();
    } catch (error) {
      console.error('Failed to initialize SolutionManager:', error);
      this.solutions = [];
    }
  }

  /**
   * Ensure config file exists
   */
  private async ensureConfigFile(): Promise<void> {
    try {
      await fs.access(this.configPath);
    } catch {
      // File doesn't exist - first run
      this.isFirstRun = true;
      await this.loadDefaultSolutions();
    }
  }

  /**
   * Load default solutions from config file
   */
  private async loadDefaultSolutions(): Promise<void> {
    try {
      const defaultSolutions = await this.readDefaultSolutions();
      const dir = path.dirname(this.configPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(defaultSolutions, null, 2), 'utf-8');
      console.log('Loaded default solutions on first run');
    } catch (error) {
      console.error('Error loading default solutions:', error);
      // Fallback to empty array
      await fs.writeFile(this.configPath, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  /**
   * Read default solutions from file
   */
  private async readDefaultSolutions(): Promise<Solution[]> {
    const content = await fs.readFile(this.defaultSolutionsPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Load solutions from file
   */
  private async load(): Promise<void> {
    const content = await fs.readFile(this.configPath, 'utf-8');
    this.solutions = JSON.parse(content) as Solution[];
  }

  /**
   * Migrate old solution format to new format
   * Old: { url: "http://localhost:4200/dashboard" }
   * New: { port: 4200, pathSuffix: "/dashboard" }
   */
  private async migrateIfNeeded(): Promise<void> {
    let needsMigration = false;

    this.solutions = this.solutions.map((solution) => {
      const legacy = solution as unknown as LegacySolution;

      // Check if this solution has old url field
      if (legacy.url && !solution.pathSuffix) {
        needsMigration = true;
        console.log(`Migrating solution: ${solution.name}`);

        try {
          const url = new URL(legacy.url);
          const port = url.port ? parseInt(url.port) : url.protocol === 'https:' ? 443 : 80;
          const pathSuffix = url.pathname || '/';

          // Create migrated solution
          const migrated: Solution = {
            id: solution.id,
            name: solution.name,
            repoPath: solution.repoPath,
            command: solution.command,
            args: solution.args,
            port: port,
            pathSuffix: pathSuffix,
            category: solution.category,
            autoStart: solution.autoStart,
            color: solution.color,
          };

          console.log(`  Migrated: port=${port}, pathSuffix=${pathSuffix}`);
          return migrated;
        } catch (error) {
          console.error(`  Migration failed for ${solution.name}:`, error);
          // Keep existing solution but ensure it has required fields
          return {
            ...solution,
            pathSuffix: solution.pathSuffix || '/',
          };
        }
      }

      // Ensure pathSuffix exists
      if (!solution.pathSuffix) {
        solution.pathSuffix = '/';
      }

      return solution;
    });

    if (needsMigration) {
      console.log('Saving migrated solutions...');
      await this.save();
    }
  }

  /**
   * Save solutions to file
   */
  private async save(): Promise<void> {
    await fs.writeFile(this.configPath, JSON.stringify(this.solutions, null, 2), 'utf-8');
  }

  /**
   * Get all solutions
   */
  async getAll(): Promise<Solution[]> {
    return [...this.solutions];
  }

  /**
   * Get solution by ID
   */
  async getById(id: string): Promise<Solution | undefined> {
    return this.solutions.find((s) => s.id === id);
  }

  /**
   * Add new solution
   */
  async add(solution: Omit<Solution, 'id'>): Promise<Solution> {
    const newSolution: Solution = {
      ...solution,
      id: randomUUID(),
      pathSuffix: solution.pathSuffix || '/',
    };

    this.validateSolution(newSolution);
    this.solutions.push(newSolution);
    await this.save();
    return newSolution;
  }

  /**
   * Update existing solution
   */
  async update(id: string, updates: Partial<Solution>): Promise<Solution> {
    const index = this.solutions.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error(`Solution with id ${id} not found`);
    }

    const updated = { ...this.solutions[index], ...updates, id };
    this.validateSolution(updated);
    this.solutions[index] = updated;
    await this.save();
    return updated;
  }

  /**
   * Delete solution
   */
  async delete(id: string): Promise<void> {
    const index = this.solutions.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error(`Solution with id ${id} not found`);
    }

    this.solutions.splice(index, 1);
    await this.save();
  }

  /**
   * Get solutions by category
   */
  async getByCategory(category: string): Promise<Solution[]> {
    return this.solutions.filter((s) => s.category === category);
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<string[]> {
    const categories = new Set(this.solutions.map((s) => s.category));
    return Array.from(categories);
  }

  /**
   * Get auto-start solutions
   */
  async getAutoStart(): Promise<Solution[]> {
    return this.solutions.filter((s) => s.autoStart);
  }

  /**
   * Reset to default solutions
   */
  async resetToDefaults(): Promise<void> {
    const defaultSolutions = await this.readDefaultSolutions();
    this.solutions = defaultSolutions;
    await this.save();
    console.log('Reset to default solutions');
  }

  /**
   * Validate solution data
   */
  private validateSolution(solution: Solution): void {
    if (!solution.name || solution.name.trim() === '') {
      throw new Error('Solution name is required');
    }
    if (!solution.repoPath || solution.repoPath.trim() === '') {
      throw new Error('Repository path is required');
    }
    if (!solution.command || solution.command.trim() === '') {
      throw new Error('Command is required');
    }
    if (!solution.port || solution.port < 1 || solution.port > 65535) {
      throw new Error('Valid port number is required (1-65535)');
    }
    if (!solution.category || solution.category.trim() === '') {
      throw new Error('Category is required');
    }
  }

  /**
   * Check if this is the first run
   */
  isFirstRunDetected(): boolean {
    return this.isFirstRun;
  }
}
