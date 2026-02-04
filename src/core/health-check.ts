import { HealthCheckResult } from '../types/solution';

export class HealthChecker {
  /**
   * Perform HTTP health check on a URL
   */
  async checkHealth(url: string, timeout = 5000, retries = 3): Promise<HealthCheckResult> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const startTime = Date.now();
        const response = await this.fetchWithTimeout(url, timeout);
        const responseTime = Date.now() - startTime;

        if (response.ok) {
          return {
            url,
            healthy: true,
            responseTime,
          };
        } else {
          if (attempt === retries - 1) {
            return {
              url,
              healthy: false,
              error: `HTTP ${response.status}: ${response.statusText}`,
            };
          }
        }
      } catch (error) {
        if (attempt === retries - 1) {
          return {
            url,
            healthy: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }

      // Wait before retry
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return {
      url,
      healthy: false,
      error: 'Max retries exceeded',
    };
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(url: string, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Wait for service to become healthy
   */
  async waitForHealthy(url: string, maxWaitTime = 60000, checkInterval = 2000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const result = await this.checkHealth(url, 3000, 1);
      if (result.healthy) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    return false;
  }

  /**
   * Check multiple URLs concurrently
   */
  async checkMultiple(urls: string[]): Promise<Map<string, HealthCheckResult>> {
    const results = new Map<string, HealthCheckResult>();
    const checks = urls.map(async (url) => {
      const result = await this.checkHealth(url);
      results.set(url, result);
    });
    await Promise.all(checks);
    return results;
  }
}
