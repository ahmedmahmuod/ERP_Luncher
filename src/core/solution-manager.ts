import * as fs from 'fs/promises';
import * as path from 'path';
import { Solution } from '../types/solution';
import { randomUUID } from 'crypto';

export class SolutionManager {
  private configPath: string;
  private solutions: Solution[] = [];

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  /**
   * Initialize and load solutions from file
   */
  async initialize(): Promise<void> {
    try {
      await this.ensureConfigFile();
      await this.load();
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
      // File doesn't exist, create with default solutions
      const defaultSolutions: Solution[] = [
        {
          id: randomUUID(),
          name: 'Example Angular App',
          repoPath: 'C:\\projects\\angular-app',
          command: 'npm',
          args: ['start'],
          port: 4200,
          url: 'http://localhost:4200',
          category: 'Frontend',
          autoStart: false,
          color: '#dd0031',
        },
        {
          id: randomUUID(),
          name: 'Example React App',
          repoPath: 'C:\\projects\\react-app',
          command: 'npm',
          args: ['start'],
          port: 3000,
          url: 'http://localhost:3000',
          category: 'Frontend',
          autoStart: false,
          color: '#61dafb',
        },
      ];

      const dir = path.dirname(this.configPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(defaultSolutions, null, 2), 'utf-8');
    }
  }

  /**
   * Load solutions from file
   */
  private async load(): Promise<void> {
    const content = await fs.readFile(this.configPath, 'utf-8');
    this.solutions = JSON.parse(content) as Solution[];
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
}
