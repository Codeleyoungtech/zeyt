# Zeyt — Architecture

**Companion to:** 01-PRD.md, 02-DEVELOPMENT-PLAN.md
**Last updated:** 2026-06-24

---

## 1. High-level architecture

```
┌─────────────────────────────────────────────────────┐
│                     Tauri Window                      │
│  ┌─────────────────────────────────────────────────┐  │
│  │              React + TypeScript UI                │  │
│  │  ┌───────────┐  ┌──────────────────────────────┐ │  │
│  │  │ Titlebar  │  │   Tab Bar                     │ │  │
│  │  └───────────┘  └──────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │  Pane Tree (per active tab)                   │ │  │
│  │  │  ┌────────────┐  ┌────────────┐               │ │  │
│  │  │  │ xterm.js   │  │ xterm.js   │  ...           │ │  │
│  │  │  │ instance   │  │ instance   │               │ │  │
│  │  │  └─────┬──────┘  └─────┬──────┘               │ │  │
│  │  └────────┼───────────────┼──────────────────────┘ │  │
│  └───────────┼───────────────┼────────────────────────┘  │
│              │ Tauri IPC     │ Tauri IPC                  │
│  ┌───────────▼───────────────▼────────────────────────┐  │
│  │              Rust Backend (src-tauri)                │  │
│  │  ┌────────────┐  ┌────────────┐                     │  │
│  │  │ PTY #1     │  │ PTY #2     │  ... (portable-pty) │  │
│  │  │ (bash/zsh) │  │ (bash/zsh) │                     │  │
│  │  └────────────┘  └────────────┘                     │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

One Rust-side PTY per terminal pane. One xterm.js instance per terminal
pane. Tauri's IPC (commands + events) is the only bridge between them —
the frontend never touches a PTY directly.

---

## 2. Repo structure

```
Zeyt/
├── src/                        # React frontend
│   ├── components/
│   │   ├── Titlebar.tsx
│   │   ├── TabBar.tsx
│   │   ├── PaneTree.tsx        # recursive split renderer
│   │   ├── TerminalView.tsx    # wraps one xterm.js instance
│   │   └── SettingsPanel.tsx
│   ├── lib/
│   │   ├── ptyClient.ts        # typed wrapper over Tauri invoke/events
│   │   ├── gpuProbe.ts         # WebGL capability detection (v1.1)
│   │   └── theme.ts            # theme loading/validation
│   ├── state/
│   │   └── store.ts            # Zustand store: tabs, panes, settings
│   ├── themes/
│   │   ├── dark-pro.json
│   │   ├── nord.json
│   │   └── high-contrast.json
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── pty.rs              # PTY spawn/write/resize/kill commands
│   │   └── session.rs          # session save/restore file I/O
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/                       # this PRD + architecture + dev plan
├── README.md
└── LICENSE
```

---

## 3. State model

### Pane tree (per tab)

A tab's layout is a binary tree. Each node is either a `Leaf` (one
terminal) or a `Split` (a direction + two children).

```typescript
type PaneNode =
  | { type: 'leaf'; id: string; ptyId: string; cwd: string }
  | { type: 'split'; id: string; direction: 'horizontal' | 'vertical';
      ratio: number; first: PaneNode; second: PaneNode };

interface Tab {
  id: string;
  title: string;
  root: PaneNode;
  activePaneId: string;
}

interface AppState {
  tabs: Tab[];
  activeTabId: string;
  settings: Settings;
}
```

**Why a tree, not a flat grid:** terminal splits are recursive by nature
(split a pane, then split one of the resulting panes again) — a tree
models this directly, whereas a flat grid needs awkward span/merge logic
for the same cases. This is the same model WezTerm and iTerm2 use
internally.

### Why Zustand over Redux/Context

The pane tree updates frequently (resize drags, new splits) but is purely
local UI state — no need for Redux's middleware/devtools ceremony.
Zustand gives a single store with minimal boilerplate. Plain React
Context is also viable but causes more re-render tuning work as the tree
grows; Zustand's selector-based subscriptions avoid that for free.

---

## 4. PTY lifecycle (Rust side)

```rust
// src-tauri/src/pty.rs (shape, not complete code)

use portable_pty::{native_pty_system, PtySize, CommandBuilder};

#[tauri::command]
fn spawn_pty(cwd: String) -> Result<String, String> {
    // 1. native_pty_system().openpty(PtySize { ... })
    // 2. CommandBuilder::new(shell_path()), set cwd
    // 3. pair.slave.spawn_command(cmd)
    // 4. spawn a reader thread on pair.master that emits
    //    Tauri events (e.g. "pty-output-{id}") for each chunk read
    // 5. store the master writer + child handle in a global registry
    //    (e.g. Mutex<HashMap<String, PtyHandle>>) keyed by a generated id
    // 6. return the id to the frontend
}

#[tauri::command]
fn write_pty(id: String, data: String) -> Result<(), String> { /* ... */ }

#[tauri::command]
fn resize_pty(id: String, rows: u16, cols: u16) -> Result<(), String> { /* ... */ }

#[tauri::command]
fn kill_pty(id: String) -> Result<(), String> { /* ... */ }
```

**Critical discipline:** `kill_pty` must be called when a pane/tab closes,
and the registry entry removed. This is the single most important
correctness rule in the whole backend — skipping it is exactly how a
"daily driver" terminal slowly accumulates zombie shells and degrades
the host machine over a long session.

### Shell to spawn

Default to the user's `$SHELL` env var, falling back to `/bin/bash`. Do
not hardcode `bash` — Ele and other users may run zsh/fish.

---

## 5. Rendering strategy — GPU-optional by design

This is the architectural decision that directly answers the "won't
crash on old hardware, but can still compete with premium Mac terminals" requirement.

`@xterm/xterm` ships two renderer paths in the same package:

1. **DOM renderer (default).** Pure CPU, no GPU context required at all.
   This is the safe default — same category of operation that already
   works fine for VS Code's integrated terminal on any machine that can
   run a browser tab.
2. **WebGL renderer (`@xterm/addon-webgl`, optional addon).** GPU
   accelerated, faster redraw/scroll on capable hardware, but requires a
   working WebGL2 context — the exact thing that doesn't exist reliably
   on old integrated graphics under some driver configurations.

### The probe-and-fallback pattern

```typescript
// src/lib/gpuProbe.ts (shape)
function canUseWebgl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;
    // optional: check renderer string, blocklist known-bad software
    // rasterizer fallbacks if they're worse than the DOM renderer
    return true;
  } catch {
    return false;
  }
}
```

```typescript
// src/components/TerminalView.tsx (shape)
const term = new Terminal({ /* theme, font, etc */ });
term.open(containerRef.current);

if (settings.rendererPreference === 'auto' && canUseWebgl()) {
  try {
    const webgl = new WebglAddon();
    webgl.onContextLoss(() => {
      // graceful fallback if the context dies mid-session
      webgl.dispose();
      // DOM renderer is already the underlying default, so no further
      // action needed beyond disposing the failed addon
    });
    term.loadAddon(webgl);
  } catch {
    // swallow — DOM renderer remains active, exactly as if WebGL had
    // never been attempted
  }
}
```

This is deliberately the inverse of what PrettyMux/limux do (GPU
acceleration mandatory, hard crash if unavailable). Here, GPU accel is
opportunistic and additive — the app is fully functional with zero GPU
involvement, and *faster* with it when it's safely available.

**v1.0 ships with `rendererPreference` hardcoded to DOM-only.** The probe
and auto-switch logic is a v1.1 (Phase 7) feature, after the DOM-only
baseline has proven itself stable as a daily driver. Don't build the
WebGL path until the foundation is trusted.

---

## 6. Visual design system

Match macOS conventions closely enough to be instantly recognizable, while
keeping every visual element cheap to render:

- **Titlebar:** 28-38px height, traffic lights at 12px diameter, 8px gap,
  positioned ~12-20px from the left edge, vertically centered.
- **Corner radius:** 8-10px on the window, matched on the active pane's
  focus ring if you add one.
- **Typography:** UI font can be a system sans (Tauri/webview will use the
  OS default if you don't override it); terminal font defaults to
  JetBrains Mono or Cascadia Code at 13-14px.
- **Color:** dark theme as default. Background `#1e1e1e`-`#1a1a1a` range,
  not pure black (pure black has poor perceived contrast for code/text
  over long sessions).
- **Motion:** CSS transitions only (opacity/transform), 150-200ms, ease-out.
  Avoid JS-driven animation loops for chrome — they cost CPU for no
  visual benefit over CSS transitions on this kind of UI.

Refer to `/mnt/skills/public/frontend-design/SKILL.md` conventions when
actually implementing components — it covers the design-token and
styling-constraint details for this kind of interface.

---

## 7. Fallback architecture (only if Phase 0 gate fails)

If the Tauri/WebKitGTK webview itself struggles on your hardware
(unlikely, but Phase 0 exists specifically to check), the proven
alternative is the same foundation Tilix and GNOME Terminal already run
on successfully on this exact class of hardware:

- **GTK3 + VTE** (`vte-2.91` via `gtk-rs` bindings) instead of Tauri +
  webview + xterm.js.
- VTE *is* the terminal emulation engine here (no xterm.js needed — it's
  a native GTK widget that already does ANSI parsing, PTY management,
  and rendering as one unit).
- You lose the webview/CSS-based styling flexibility, but GTK3's CSS
  theming (via `GtkStyleContext` and a custom `.css` file) can still
  achieve rounded corners, custom colors, and reasonable chrome
  customization — just with a steeper API to learn than React/CSS.
- This path trades some visual ceiling for guaranteed compatibility with
  your exact hardware class. Only take it if Phase 0 produces a clear
  no-go signal.

---

## 8. Packaging notes

- **Linux:** `tauri build` produces both `.AppImage` (portable, no install
  needed) and `.deb` (apt-installable) from one command, per Tauri's
  bundler config in `tauri.conf.json`.
- **macOS:** same `tauri build` command cross-compiles to `.dmg` given a
  macOS build runner (GitHub Actions with a `macos-latest` runner is the
  practical option if Ele doesn't own a Mac to build on natively).
- **Versioning:** semver, starting at `0.1.0` through the development
  phases, promoted to `1.0.0` only once the Section 5 success criteria in
  the PRD are all checked off.
