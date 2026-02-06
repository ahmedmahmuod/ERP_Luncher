/**
 * Environment Profile
 * Defines base URL for different environments (Local, Staging, Production)
 */
export interface Profile {
  id: string;
  name: string;
  baseUrl: string;
}

/**
 * User Configuration
 * Stores profiles and active profile selection
 */
export interface UserConfig {
  profiles: Profile[];
  activeProfileId: string;
}
