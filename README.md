# ERP Launcher

**Production-Grade Developer ERP Launcher** - Mission Control for Frontend Repositories

A high-performance, native Electron desktop application designed to manage multiple frontend repositories, dev servers, and processes from a single control panel.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Electron](https://img.shields.io/badge/Electron-28.x-47848F?logo=electron)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)

---

## 🎯 Overview

ERP Launcher eliminates the pain of managing multiple micro-frontend repositories by providing:

- **Centralized Process Management** - Start/Stop all dev servers from one place
- **Live Log Streaming** - Real-time stdout/stderr monitoring with color coding
- **Port Conflict Detection** - Automatic port availability checking
- **Health Monitoring** - HTTP health checks after service launch
- **System Tray Integration** - Quick access to common operations
- **Auto-Start Support** - Launch specific solutions on app startup

---

## ✨ Features

### Core Capabilities

✅ **Solution Management**

- Add, edit, delete solutions dynamically
- Persistent JSON storage
- Category-based organization
- Custom commands and arguments

✅ **Process Engine**

- Robust process spawning with `child_process.spawn`
- Cross-platform process tree termination (Windows: `taskkill /T /F`)
- PID tracking and state management
- Live stdout/stderr streaming

✅ **Smart Port Management**

- Port availability checking before launch
- Conflict detection with suggested alternatives
- Wait for port to become active

✅ **Professional UI**

- Dark theme optimized for developers
- Real-time status updates
- Animated transitions
- Responsive grid layout

✅ **Advanced Operations**

- Run All / Stop All
- Group operations by category
- Open in browser
- View logs per solution

---

## 🏗️ Architecture

### Security Model

ERP Launcher follows Electron's secure architecture:

```
┌─────────────────────────────────────────┐
│         Renderer Process (UI)           │
│  - No direct Node.js access             │
│  - Uses electronAPI via contextBridge   │
└─────────────┬───────────────────────────┘
              │ IPC (contextBridge)
┌─────────────▼───────────────────────────┐
│         Preload Script                  │
│  - Exposes safe APIs only               │
│  - contextIsolation: true               │
└─────────────┬───────────────────────────┘
              │ IPC
┌─────────────▼───────────────────────────┐
│         Main Process                    │
│  - Full Node.js access                  │
│  - Process management                   │
│  - File system operations               │
│  - System tray                          │
└─────────────────────────────────────────┘
```

**Security Settings:**

- `contextIsolation: true` - Renderer cannot access Node.js
- `nodeIntegration: false` - No direct Node.js in renderer
- `sandbox: false` - Required for preload script

### Project Structure

```
ERP_Launcher/
├── src/
│   ├── electron/
│   │   ├── main.ts           # Main process entry
│   │   └── preload.ts        # IPC bridge
│   ├── core/
│   │   ├── process-manager.ts    # Process spawning & lifecycle
│   │   ├── port-manager.ts       # Port availability checking
│   │   ├── health-check.ts       # HTTP health checks
│   │   └── solution-manager.ts   # CRUD for solutions
│   ├── types/
│   │   └── solution.ts       # TypeScript interfaces
│   └── renderer/
│       ├── index.html        # Main UI
│       ├── renderer.ts       # UI logic
│       └── styles/
│           └── main.css      # TailwindCSS styles
├── forge.config.ts           # Electron Forge config
├── vite.*.config.ts          # Vite configs
├── tailwind.config.js        # TailwindCSS config
├── tsconfig.json             # TypeScript config
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Windows** (primary platform, cross-platform support available)

### Installation

1. **Clone the repository**

   ```bash
   cd d:\Ahmed Frontend\Vibecoding\ERP_Luncher
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run dev
   ```

---

## 🛠️ Development

### Available Scripts

```bash
npm run dev       # Start development server with hot reload
npm run build     # Build for production
npm run package   # Package as distributable
npm run lint      # Run ESLint
npm run format    # Format code with Prettier
```

### Development Workflow

1. **Start dev server**: `npm run dev`
2. **Make changes** to TypeScript/CSS files
3. **Hot reload** automatically updates the app
4. **DevTools** open automatically in development

---

## 📦 Building & Packaging

### Create Executable

```bash
npm run package
```

This creates a distributable in the `out/` directory.

### Create Installer

```bash
npm run build
```

This creates installers using Electron Forge makers:

- **Windows**: Squirrel installer (`.exe`)
- **Cross-platform**: ZIP archive

**Output location**: `out/make/`

### Distribution

The packaged app includes:

- Electron runtime
- All dependencies
- Your application code
- Default solutions configuration

**First run**: The app creates `solutions.json` in the user data directory:

- Windows: `%APPDATA%\erp-launcher\solutions.json`

---

## 📋 How to Use

### Adding a Solution

1. Click **"Add Solution"** in the sidebar
2. Fill in the form:
   - **Name**: Display name (e.g., "Angular Shell")
   - **Repository Path**: Absolute path to your repo
   - **Command**: Executable (e.g., `npm`, `ng`, `yarn`)
   - **Arguments**: Comma-separated args (e.g., `start`, `serve`)
   - **Port**: Dev server port (e.g., `4200`)
   - **Category**: Grouping label (e.g., "Frontend")
   - **URL**: Health check URL (auto-generated if empty)
   - **Auto-start**: Launch on app startup
3. Click **"Save"**

### Managing Processes

**Start a solution**: Click the **"Run"** button on the solution card

**Stop a solution**: Click the **"Stop"** button (only visible when running)

**Run All**: Click **"Run All"** in the sidebar to start all solutions

**Stop All**: Click **"Stop All"** to terminate all running processes

**View Logs**: Click the logs icon to filter logs for that solution

**Open in Browser**: Click the globe icon to open the URL

### Process Manager Internals

**How it works:**

1. **Spawn Process**

   ```typescript
   spawn(command, args, {
     cwd: repoPath,
     shell: true,
     env: { ...process.env, PORT: port.toString() },
   });
   ```

2. **Stream Logs**
   - `stdout` → Green logs
   - `stderr` → Red logs
   - System events → Blue logs

3. **Terminate Process**
   - **Windows**: `taskkill /pid <PID> /T /F` (kills entire process tree)
   - **Unix**: `process.kill(-pid, 'SIGTERM')` (kills process group)

4. **Health Check**
   - Wait 3 seconds after spawn
   - HTTP GET to configured URL
   - Retry up to 3 times
   - Update status badge

---

## 🔧 Configuration

### Solutions Schema

```json
{
  "id": "uuid",
  "name": "My Angular App",
  "repoPath": "C:\\projects\\angular-app",
  "command": "npm",
  "args": ["start"],
  "port": 4200,
  "url": "http://localhost:4200",
  "category": "Frontend",
  "autoStart": false,
  "color": "#dd0031"
}
```

### Customization

**Change theme colors**: Edit `tailwind.config.js`

**Modify window size**: Edit `src/electron/main.ts` → `createWindow()`

**Add custom commands**: Extend IPC handlers in `main.ts`

---

## 🐛 Troubleshooting

### Port Already in Use

**Symptom**: Error when starting a solution

**Solution**:

- Check if another process is using the port
- Use the suggested alternative port
- Update the solution configuration

### Process Won't Stop

**Symptom**: Process remains running after clicking "Stop"

**Solution**:

- Check Task Manager for zombie processes
- Manually kill using PID shown in the card
- Restart the app

### Logs Not Showing

**Symptom**: No logs appear in the logs panel

**Solution**:

- Click "View Logs" icon on the solution card
- Ensure logs panel is visible (click "Show" if hidden)
- Check that the process is actually running

### Build Errors

**Symptom**: `npm run build` fails

**Solution**:

- Delete `node_modules` and reinstall: `npm install`
- Clear Electron Forge cache: `rm -rf out/`
- Ensure all dependencies are installed

---

## 🤝 Contributing

This is an internal tool, but contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` and `npm run format`
5. Submit a pull request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

Built with:

- [Electron](https://www.electronjs.org/) - Cross-platform desktop apps
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Vite](https://vitejs.dev/) - Fast build tool
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS
- [Electron Forge](https://www.electronforge.io/) - Build & package

---

## 📞 Support

For issues or questions:

- Open an issue on GitHub
- Contact the development team
- Check the troubleshooting section above

---

**Built with ❤️ for developers who manage multiple micro-frontends**
