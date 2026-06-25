# Zeyt

Zeyt is a modern, high-performance terminal emulator built with Tauri, Rust, and React. It features a native PTY backend, comprehensive split-pane management, and a rich, customizable interface.

## Features
- **Lightning Fast**: Powered by a custom Rust PTY backend (`portable-pty`) and xterm.js rendering.
- **Advanced Workspaces**: Folder-scoped sessions with persistent layouts, tabs, and split-panes.
- **Split Panes**: Arbitrarily split your terminal horizontally or vertically (`Ctrl+Shift+D` / `Ctrl+D`).
- **Tabs**: Manage multiple contexts in one window (`Ctrl+T` to open, `Ctrl+W` to close).
- **Theming**: Premium dark mode out of the box with customizable accent colors and cursors.
- **Session Persistence**: Zeyt remembers your exact pane layout and working directories across restarts.

## Installation
Pre-compiled binaries for Windows, macOS (Intel & Apple Silicon), and Linux are available in the [Releases](../../releases) tab.

## Development Setup

1. **Install Prerequisites**:
   - [Node.js](https://nodejs.org/) & [pnpm](https://pnpm.io/)
   - [Rust](https://rustup.rs/)
   - Tauri dependencies (see [Tauri setup guide](https://tauri.app/v1/guides/getting-started/prerequisites))

2. **Clone and Install**:
   ```bash
   git clone https://github.com/Codeleyoungtech/zeyt.git
   cd zeyt
   pnpm install
   ```

3. **Run in Development**:
   ```bash
   pnpm tauri dev
   ```

4. **Build for Production**:
   ```bash
   pnpm tauri build
   ```

## License
MIT License
