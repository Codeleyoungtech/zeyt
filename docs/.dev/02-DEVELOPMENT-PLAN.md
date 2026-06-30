# Zeyt — Development Plan

**Companion to:** 01-PRD.md, 03-ARCHITECTURE.md
**Last updated:** 2026-06-24

This is a day-by-day build order. Each phase ends with something you can
actually run and judge — never more than a few days of work before you get
a real signal back.

---

## Phase 0 — Hardware gate test (½ day, DO NOT SKIP)

**Goal:** prove Tauri's webview runs acceptably on your laptop *before*
writing a single line of app logic. This is the single highest-risk
unknown in the whole project — PrettyMux and limux both failed for GPU
context reasons, and Tauri's Linux webview (WebKitGTK) is a different,
much lighter dependency, but it is not zero-risk and deserves its own test.

### Steps

1. Install Tauri prerequisites:
   ```bash
   sudo apt update
   sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
     libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
   ```
2. Scaffold the absolute minimum Tauri app (no terminal logic yet):
   ```bash
   npm create tauri-app@latest -- --name zeyt-test --template react-ts
   cd zeyt-test
   npm install
   npm run tauri dev
   ```
3. Once the window opens, judge it honestly:
   - Does the window open within a couple seconds?
   - Is scrolling a long text block in the webview smooth?
   - Does `htop` (run on the host, not in the app) show reasonable CPU
     usage with the window open and idle?
   - Resize the window rapidly — any visible lag or tearing?

### Go / no-go

- **Go:** proceed to Phase 1 with Tauri as planned.
- **No-go (visible stutter, high idle CPU, or crashes):** switch to the
  fallback architecture — GTK3 + VTE + Rust (see "Fallback Architecture"
  in `03-ARCHITECTURE.md`). This is a real, working pattern (it's what
  Tilix and GNOME Terminal use) and avoids a webview entirely. Re-read
  that section before continuing; the phase numbering below still applies
  conceptually, just with GTK3 widgets instead of React components.

Don't skip this gate to "save time." Finding out on day 5 instead of day 0
costs you four days.

---

## Phase 1 — PTY + raw terminal render (1-2 days)

**Goal:** a window that runs a real shell. Ugly is fine. This phase proves
the actual hard part (process I/O + escape-code rendering) works on your
machine before any chrome is built.

1. Add `portable-pty` to the Rust side (`src-tauri/Cargo.toml`).
2. Write a Tauri command that spawns a shell (`$SHELL` or `/bin/bash`)
   inside a PTY, and streams output to the frontend via Tauri's event
   system.
3. On the frontend, install `@xterm/xterm`, mount a `Terminal` instance in
   a `<div>`, and pipe:
   - PTY output → `terminal.write()`
   - Terminal user input (`terminal.onData`) → Tauri command → PTY stdin
4. Handle resize: PTY resize on window/pane resize, using `fit` addon
   (`@xterm/addon-fit`).

### Real-hardware test checklist
Run inside it: `htop`, `vim`, `nano`, `git log --oneline | head -50`,
`tmux` (yes, run tmux inside your own terminal — if it renders cleanly
your VT100/curses handling is solid). Scroll fast. Resize the window.
Type quickly. If anything stutters, try switching the xterm.js renderer
type (`renderType: 'dom'` is default and the safe choice; do not enable
`addon-webgl` yet — that's Phase 1.1 territory in the PRD, deliberately
deferred).

**This phase is done when** you trust this terminal enough to do real work
in it for ten minutes without it bothering you.

---

## Phase 2 — macOS-style chrome (2-3 days)

**Goal:** it looks like a real app, not a dev tool.

1. Hide the native OS window decoration (Tauri config:
   `"decorations": false` in `tauri.conf.json`).
2. Build a custom titlebar component:
   - Traffic-light buttons (close/minimize/maximize) — SVG circles, hover
     states reveal the icon (exact macOS behavior), click handlers call
     Tauri's window API (`appWindow.close()`, etc.)
   - Draggable region (`data-tauri-drag-region` attribute) so the window
     can still be moved by dragging the titlebar.
3. Rounded window corners + subtle border. (On Linux this may require
   compositor cooperation — test on your actual desktop environment; if
   Cinnamon's compositor doesn't cooperate, fall back to rounded corners
   drawn inside the webview content area, with the OS window square but
   the visible content rounded — still reads as polished.)
4. Background: **solid dark color with optional flat transparency**, not
   live blur. Live vibrancy is explicitly deferred to Phase 7 (v1.1) and
   gated behind a GPU check — don't build it here.
5. Pick and apply a monospace font (JetBrains Mono or Cascadia Code
   recommended — clean at small sizes, doesn't tax rendering the way
   heavily-ligated fonts can).

**Done when** a screenshot of it next to iTerm2/WezTerm doesn't
embarrass you.

---

## Phase 3 — Tabs (2-3 days)

**Goal:** multiple independent terminal sessions in one window.

1. Design the state shape first (see ARCHITECTURE.md "State Model") —
   a list of tabs, each owning one PTY + one xterm.js instance.
2. Tab bar UI: add tab (+ button, `Cmd/Ctrl+T`), close tab (`Cmd/Ctrl+W`,
   middle-click), reorder (drag), rename (double-click to edit).
3. **Critical correctness point:** when a tab closes, you must:
   - Kill the underlying PTY process (orphaned shells will pile up and
     slowly degrade the laptop over a session — exactly the failure mode
     that matters for a daily driver).
   - Dispose the xterm.js instance (`terminal.dispose()`) to free its
     internal buffers/listeners.
4. Keyboard navigation between tabs (`Cmd/Ctrl+1-9`, `Cmd/Ctrl+Shift+[/]`).

**Test:** open 10 tabs, close them all, check `ps aux | grep bash` (or
your shell) on the host — zero orphaned processes should remain.

---

## Phase 4 — Split panes (3-4 days)

**Goal:** the actual "multiplexer" feel — panes within a tab.

1. Model panes as a binary tree (each node is either a leaf = one
   terminal, or a split = two children + a direction). See
   ARCHITECTURE.md for the exact data structure.
2. Split commands: `Cmd/Ctrl+D` (vertical split), `Cmd/Ctrl+Shift+D`
   (horizontal split) — matches iTerm2 muscle memory, which you'll
   appreciate even on Linux.
3. Resizable dividers (drag to resize, with min-size constraints so a
   pane can't be dragged to zero width).
4. Keyboard pane navigation (`Cmd/Ctrl+Option+Arrow` or your own scheme —
   document it clearly since this is the #1 thing users will want to
   rebind).
5. Same orphan-cleanup discipline as Phase 3 applies per-pane, not just
   per-tab.

**Test:** same orphan-process check as Phase 3, but with nested splits
closed in different orders (close a parent split while children are
still open, close leaves one at a time, etc.) — this is where pane-tree
bugs hide.

---

## Phase 5 — Theming + fonts (1-2 days)

1. Define a theme as a JSON file: 16 ANSI colors + background/foreground/
   cursor/selection colors + optional accent color for chrome elements.
2. Ship 3-4 built-in themes (e.g., a clean dark, a Nord-style, a high
   contrast one, and one that closely mirrors macOS Terminal's default
   "Pro" theme for the "beat cmux" comparison).
3. Settings UI: theme picker, font family/size picker, cursor style
   (block/bar/underline + blink toggle).
4. Store user prefs in Tauri's app data dir as JSON (not in xterm.js
   memory — must survive restarts).

---

## Phase 6 — Session persistence (1-2 days)

1. On a debounced interval (or on app close), serialize: open tabs, pane
   tree per tab, working directory per pane, active tab/pane.
2. On launch, read this file and reconstruct the layout, spawning fresh
   PTYs `cd`'d into the saved working directories (you generally cannot
   resurrect the actual shell process — only its working directory and
   layout — be upfront about this limitation in the UI/README so users
   don't expect tmux-style true session resurrection).

---

## Phase 6.5 — Folder-scoped workspaces (3-4 days)

**Goal:** layouts that auto-restore based on which project folder you're
in, plus a manual quick-switcher. Full design in `04-WORKSPACES.md` —
this phase entry is just the placement/sequencing; read that doc before
starting.

1. Add the `Workspace` layer above the existing `Tab[]` state — restructure
   the Zustand store to nest tabs under workspaces (1 day).
2. Path matching (longest-prefix-match) + launch-time resolution from
   CLI arg / last-active / `$HOME` fallback (½-1 day).
3. Quick-switcher UI (`Cmd/Ctrl+K`-style palette) (½-1 day).
4. Auto-tracking debounced save + explicit "duplicate as snapshot" pin
   action (1 day).

**Test:** open the app inside three different project folders across
separate sessions, confirm each gets its own restored layout; open inside
a subfolder of a saved workspace root and confirm it still matches;
create two workspaces with overlapping roots and confirm the more
specific one wins.

---



Only start this phase after Phase 0-6 produce a stable daily driver.

1. GPU capability probe (see ARCHITECTURE.md) → conditionally load
   `@xterm/addon-webgl`, with automatic fallback to DOM renderer on any
   WebGL context creation failure (same failure class PrettyMux hit —
   catch it gracefully instead of crashing).
2. Background blur/vibrancy — gated behind the same GPU probe.
3. Open/close animations for tabs and panes.
4. Shell integration marks (current command/exit status, à la iTerm2).
5. Quake-mode global hotkey.
6. macOS build target + .dmg packaging.

---

## Phase 8 — Packaging + sharing (1-2 days, can run in parallel with Phase 5-6)

1. `tauri build` for Linux → produces `.AppImage` and `.deb`.
2. Write the README: what it is, screenshot, install instructions,
   keyboard shortcut cheatsheet, known limitations (e.g., "session
   restore reconstructs layout/cwd, not live shell state").
3. Pick a license (MIT recommended for a sharable side project — no
   strong reason to restrict it).
4. Tag a `v1.0.0` GitHub release with the built binaries attached.

---

## Suggested total timeline

| Phase | Time | Cumulative |
|---|---|---|
| 0 — Hardware gate | 0.5 day | 0.5 day |
| 1 — PTY + raw render | 1-2 days | ~2.5 days |
| 2 — macOS chrome | 2-3 days | ~5.5 days |
| 3 — Tabs | 2-3 days | ~8.5 days |
| 4 — Split panes | 3-4 days | ~12.5 days |
| 5 — Theming | 1-2 days | ~14.5 days |
| 6 — Persistence | 1-2 days | ~16.5 days |
| 6.5 — Workspaces | 3-4 days | ~20.5 days |
| 8 — Packaging | 1-2 days | ~22.5 days |

**Realistic v1.0, working solo evenings/weekends: ~3-3.5 weeks** (was
2.5-3.5 weeks before folder-scoped workspaces were added to scope — see
`04-WORKSPACES.md`).
A rough functional demo (Phases 0-2 only): under a week.

Phase 7 (v1.1 polish) is intentionally excluded from this total — it
starts only once v1 has proven itself as a stable daily driver.
