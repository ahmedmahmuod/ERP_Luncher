import { BrowserWindow } from 'electron';
import * as path from 'path';

export class SplashWindow {
  private window: BrowserWindow | null = null;

  create(): BrowserWindow {
    this.window = new BrowserWindow({
      width: 500,
      height: 300,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Load splash HTML
    void this.window.loadFile(path.join(__dirname, '../../renderer/splash.html'));

    this.window.on('closed', () => {
      this.window = null;
    });

    return this.window;
  }

  close(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
    this.window = null;
  }

  getWindow(): BrowserWindow | null {
    return this.window;
  }
}
