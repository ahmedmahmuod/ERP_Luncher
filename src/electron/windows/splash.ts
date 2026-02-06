import { BrowserWindow } from 'electron';

export class SplashWindow {
  private window: BrowserWindow | null = null;

  create(): BrowserWindow {
    this.window = new BrowserWindow({
      width: 700,
      height: 450,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Ultra-professional splash screen
    const splashHTML = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ERP Launcher</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        width: 700px;
        height: 450px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        overflow: hidden;
        background: transparent;
      }

      .splash-container {
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        border-radius: 24px;
        box-shadow: 
          0 50px 100px -20px rgba(0, 0, 0, 0.25),
          0 30px 60px -30px rgba(0, 0, 0, 0.3),
          inset 0 0 0 1px rgba(255, 255, 255, 0.5);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
      }

      /* Premium border effect */
      .splash-container::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 24px;
        padding: 2px;
        background: linear-gradient(135deg, #2563eb, #3b82f6, #60a5fa, #93c5fd);
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        opacity: 0.6;
        animation: borderShine 3s ease-in-out infinite;
      }

      /* Animated background pattern */
      .bg-pattern {
        position: absolute;
        inset: 0;
        opacity: 0.03;
        background-image: 
          radial-gradient(circle at 20% 50%, #2563eb 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, #3b82f6 0%, transparent 50%),
          radial-gradient(circle at 40% 20%, #60a5fa 0%, transparent 50%);
        animation: patternMove 15s ease-in-out infinite;
      }

      .content {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2.5rem;
      }

      /* Logo section */
      .logo-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
        animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .logo-wrapper {
        position: relative;
        width: 200px;
        height: 200px;
      }

      .logo-bg {
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%);
        border-radius: 32px;
        animation: logoFloat 4s ease-in-out infinite;
        box-shadow: 
          0 20px 40px -10px rgba(37, 99, 235, 0.4),
          0 0 80px -10px rgba(37, 99, 235, 0.3);
      }

      .logo-bg::before {
        content: '';
        position: absolute;
        inset: 8px;
        background: white;
        border-radius: 26px;
      }

      .logo-text {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 96px;
        font-weight: 900;
        background: linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        letter-spacing: -6px;
        animation: logoScale 4s ease-in-out infinite;
      }

      /* Text section */
      .text-section {
        text-align: center;
        animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
      }

      .app-title {
        font-size: 36px;
        font-weight: 800;
        color: #111827;
        margin-bottom: 0.75rem;
        letter-spacing: -1px;
        background: linear-gradient(135deg, #111827 0%, #374151 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .app-subtitle {
        font-size: 16px;
        color: #6b7280;
        font-weight: 500;
        letter-spacing: 0.3px;
      }

      /* Progress section */
      .progress-section {
        width: 340px;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both;
      }

      .progress-track {
        width: 100%;
        height: 6px;
        background: #e5e7eb;
        border-radius: 9999px;
        overflow: hidden;
        position: relative;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
      }

      .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%);
        border-radius: 9999px;
        position: relative;
        animation: progressFill 5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        box-shadow: 0 0 20px rgba(37, 99, 235, 0.5);
      }

      .progress-bar::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, 
          transparent 0%, 
          rgba(255, 255, 255, 0.6) 50%, 
          transparent 100%);
        animation: progressShimmer 1.5s ease-in-out infinite;
      }

      .status-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .status-text {
        font-size: 14px;
        color: #9ca3af;
        font-weight: 500;
      }

      .status-percentage {
        font-size: 14px;
        color: #2563eb;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

      /* Version badge */
      .version-badge {
        position: absolute;
        bottom: 24px;
        right: 24px;
        padding: 6px 12px;
        background: rgba(37, 99, 235, 0.1);
        border: 1px solid rgba(37, 99, 235, 0.2);
        border-radius: 9999px;
        font-size: 12px;
        color: #2563eb;
        font-weight: 600;
        animation: fadeIn 0.8s ease-out 0.6s both;
      }

      /* Animations */
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes logoFloat {
        0%, 100% {
          transform: translateY(0) scale(1);
        }
        50% {
          transform: translateY(-8px) scale(1.02);
        }
      }

      @keyframes logoScale {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.05);
        }
      }

      @keyframes progressFill {
        0% { width: 0%; }
        15% { width: 25%; }
        30% { width: 45%; }
        50% { width: 65%; }
        70% { width: 80%; }
        85% { width: 92%; }
        100% { width: 100%; }
      }

      @keyframes progressShimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }

      @keyframes borderShine {
        0%, 100% {
          opacity: 0.6;
          background-position: 0% 50%;
        }
        50% {
          opacity: 1;
          background-position: 100% 50%;
        }
      }

      @keyframes patternMove {
        0%, 100% {
          transform: translate(0, 0) scale(1);
        }
        50% {
          transform: translate(20px, 20px) scale(1.1);
        }
      }

      /* Percentage counter animation */
      @keyframes countUp {
        0% { --progress: 0; }
        100% { --progress: 100; }
      }
    </style>
  </head>
  <body>
    <div class="splash-container">
      <div class="bg-pattern"></div>
      
      <div class="content">
        <div class="logo-section">
          <div class="logo-wrapper">
            <div class="logo-bg"></div>
            <div class="logo-text">A</div>
          </div>
        </div>

        <div class="text-section">
          <h1 class="app-title">ERP Launcher</h1>
          <p class="app-subtitle">Initializing Development Environment</p>
        </div>

        <div class="progress-section">
          <div class="progress-track">
            <div class="progress-bar"></div>
          </div>
          <div class="status-container">
            <span class="status-text">Loading system modules...</span>
            <span class="status-percentage" id="percentage">0%</span>
          </div>
        </div>
      </div>

      <div class="version-badge">v1.0.0</div>
    </div>

    <script>
      // Animate percentage counter
      let progress = 0;
      const percentageEl = document.getElementById('percentage');
      const duration = 5000; // 5 seconds
      const steps = 100;
      const stepDuration = duration / steps;

      const interval = setInterval(() => {
        progress += 1;
        percentageEl.textContent = progress + '%';
        if (progress >= 100) {
          clearInterval(interval);
        }
      }, stepDuration);
    </script>
  </body>
</html>
    `;

    void this.window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`);

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
