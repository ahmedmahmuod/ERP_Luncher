import * as net from 'net';
import { PortCheckResult } from '../types/solution';

export class PortManager {
  /**
   * Check if a port is available
   */
  async checkPort(port: number): Promise<PortCheckResult> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          // Port is in use, find next available
          this.findAvailablePort(port + 1).then((suggestedPort) => {
            resolve({
              port,
              available: false,
              suggestedPort,
            });
          });
        } else {
          resolve({
            port,
            available: false,
          });
        }
      });

      server.once('listening', () => {
        server.close();
        resolve({
          port,
          available: true,
        });
      });

      server.listen(port, '127.0.0.1');
    });
  }

  /**
   * Find the next available port starting from a given port
   */
  async findAvailablePort(startPort: number, maxAttempts = 10): Promise<number> {
    for (let port = startPort; port < startPort + maxAttempts; port++) {
      const result = await this.checkPort(port);
      if (result.available) {
        return port;
      }
    }
    throw new Error(`No available port found in range ${startPort}-${startPort + maxAttempts}`);
  }

  /**
   * Check multiple ports at once
   */
  async checkPorts(ports: number[]): Promise<Map<number, boolean>> {
    const results = new Map<number, boolean>();
    const checks = ports.map(async (port) => {
      const result = await this.checkPort(port);
      results.set(port, result.available);
    });
    await Promise.all(checks);
    return results;
  }

  /**
   * Wait for a port to become available (useful for health checks)
   */
  async waitForPort(port: number, timeout = 30000, interval = 500): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const isListening = await this.isPortListening(port);
        if (isListening) {
          return true;
        }
      } catch {
        // Port not ready yet
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    return false;
  }

  /**
   * Check if a port is actively listening (opposite of checkPort)
   */
  private async isPortListening(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();

      socket.setTimeout(1000);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, '127.0.0.1');
    });
  }
}
