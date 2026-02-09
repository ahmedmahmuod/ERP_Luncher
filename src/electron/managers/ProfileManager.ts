import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import type { Profile, UserConfig } from '../../types/profile';

export class ProfileManager {
  private configPath: string;
  private config: UserConfig;
  private defaultProfilesPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, 'user-config.json');
    this.defaultProfilesPath = path.join(app.getAppPath(), 'config', 'default-profiles.json');
    this.config = this.loadConfig();
  }

  /**
   * Load user configuration or create from defaults
   */
  private loadConfig(): UserConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading user config:', error);
    }

    // First run - load defaults
    return this.createDefaultConfig();
  }

  /**
   * Create default configuration from default-profiles.json
   */
  private createDefaultConfig(): UserConfig {
    try {
      const defaultProfiles = this.loadDefaultProfiles();
      const config: UserConfig = {
        profiles: defaultProfiles,
        activeProfileId: 'local', // Default to local environment
      };
      this.saveConfig(config);
      return config;
    } catch (error) {
      console.error('Error creating default config:', error);
      // Fallback to hardcoded defaults
      return {
        profiles: [
          { id: 'local', name: 'Local', baseUrl: 'http://localhost' },
          { id: 'staging', name: 'Staging', baseUrl: 'https://assemblestage.com' },
          { id: 'production', name: 'Production', baseUrl: 'https://mid-erp.com' },
        ],
        activeProfileId: 'local',
      };
    }
  }

  /**
   * Load default profiles from config file
   */
  private loadDefaultProfiles(): Profile[] {
    const data = fs.readFileSync(this.defaultProfilesPath, 'utf-8');
    return JSON.parse(data);
  }

  /**
   * Save configuration to disk
   */
  private saveConfig(config: UserConfig): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
      this.config = config;
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  }

  /**
   * Get all profiles
   */
  getProfiles(): Profile[] {
    return this.config.profiles;
  }

  /**
   * Get active profile
   */
  getActiveProfile(): Profile {
    const profile = this.config.profiles.find((p) => p.id === this.config.activeProfileId);
    if (!profile) {
      // Fallback to first profile if active not found
      return this.config.profiles[0];
    }
    return profile;
  }

  /**
   * Set active profile
   */
  setActiveProfile(profileId: string): void {
    const profile = this.config.profiles.find((p) => p.id === profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }
    this.config.activeProfileId = profileId;
    this.saveConfig(this.config);
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    const defaultConfig = this.createDefaultConfig();
    this.saveConfig(defaultConfig);
  }

  /**
   * Get base URL for active profile
   */
  getActiveBaseUrl(): string {
    return this.getActiveProfile().baseUrl;
  }

  /**
   * Compute resolved URL for a solution
   */
  computeResolvedUrl(port: number, pathSuffix: string = '/', baseUrlOverride?: string): string {
    const baseUrl = baseUrlOverride || this.getActiveBaseUrl();
    const suffix = pathSuffix || '/';
    return `${baseUrl}:${port}${suffix}`;
  }
}
