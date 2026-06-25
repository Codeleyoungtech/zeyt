# Zeyt — Product Requirements Document

**Status:** Draft v1.0
**Owner:** Eleyoungtech
**Last updated:** 2026-06-24

> Name: `Zeyt`. Fits the Codeleyoungtech ("ceyt") brand sound family —
> checked for collisions in the dev-tools/terminal space, none found.

---

## 1. Vision

A standalone, GPU-optional terminal emulator with macOS-grade visual design,
built to run smoothly on a 12-year-old integrated-graphics laptop and to look
and feel competitive with premium Mac terminals (iTerm2, WezTerm, Ghostty,
"cmux"-style tools) when later run on capable hardware.

One codebase. Two performance profiles, chosen automatically:
- **Software path** (DOM rendering) — guaranteed to run on weak/old GPUs.
- **Accelerated path** (WebGL/Canvas) — engaged automatically when the host
  GPU supports it, for buttery scroll/redraw on modern machines.

The non-negotiable constraint: **the dev machine must be able to run and
develop the app comfortably.** If a feature or rendering technique fails that
test, it doesn't ship as the default.

---

## 2. Problem statement

Existing "beautiful terminal" options force a bad tradeoff for Ele's setup:

- **GPU-accelerated GTK4 terminals** (PrettyMux, limux/Ghostty-based tools)
  crash outright on old integrated graphics — confirmed firsthand
  (`GtkGLArea failed to create an OpenGL context`).
- **Lightweight GTK3/VTE terminals** (Tilix, GNOME Terminal) run fine but
  look generic — no macOS-style chrome, vibrancy, animations, or modern
  polish.
- **Electron-based terminals** (Hyper) run anywhere but are heavy on RAM and
  startup time, which matters on old hardware with limited memory headroom.

There is no terminal that is simultaneously (a) safe on 10+ year old
integrated graphics, (b) visually on par with premium macOS terminals, and
(c) built on a stack Ele already knows (Tauri + Rust + React/TS).

---

## 3. Goals

| # | Goal | Why it matters |
|---|------|-----------------|
| G1 | Runs smoothly as a daily driver on Ele's current laptop | Primary success condition — this is a real, not theoretical, daily driver |
| G2 | macOS-grade visual design (chrome, motion, typography) | Stated bar: "beat cmux on Mac" visually and in feel |
| G3 | Shareable — installable by other people on Linux/macOS/Windows | Explicit requirement: "I might share it with others" |
| G4 | No GPU dependency in the default configuration | Hard lesson from PrettyMux/limux failures on this hardware |
| G5 | Reuses Ele's existing stack (Tauri, Rust, React, TS) | Minimizes new-tool learning curve, maximizes shipping speed |
| G6 | Folder-scoped workspaces — layout auto-restores per project path | Real differentiator vs. every tool evaluated so far (PrettyMux, limux, Tilix, stock iTerm2) — see `04-WORKSPACES.md` |

### Non-goals (v1)

- Not a tmux-style detachable/SSH-persistent session multiplexer (that's a
  different product — see `04-FUTURE-MULTIPLEXER.md` if revisited later).
- Not aiming for plugin/extension ecosystem in v1.
- Not aiming for Windows ConPTY support in v1 (Linux + macOS first; Windows
  is a stretch goal once the core is stable).
- Not building a custom terminal-emulation engine from scratch (parsing
  ANSI/VT100 yourself is a multi-month project with no payoff — use a proven
  library, see Section 6).

---

## 4. Target users

1. **Primary: Ele himself.** Daily driver on a resource-constrained Linux
   laptop, heavy AI-coding-tool usage (Claude Code, Codex, Gemini CLI),
   multiple concurrent project panes.
2. **Secondary: People who would download it from GitHub.** Developers who
   want a good-looking terminal but don't want Electron bloat or GPU-only
   tools that crash on their hardware (a real, underserved niche — see the
   PrettyMux/limux complaints in terminal communities).

---

## 5. Success criteria

App is "done" for v1 when all of the following are true:

- [ ] Runs on Ele's laptop with no GPU-context errors, no crashes, in the
      default (software) rendering mode.
- [ ] CPU usage stays low (<5%) when idle with 4+ panes open.
- [ ] Cold start to interactive prompt in under 1 second on Ele's hardware.
- [ ] Visual: custom titlebar, traffic-light controls, rounded window
      corners, smooth tab/pane open-close animations, dark theme that looks
      intentionally designed (not default Electron/Tauri chrome).
      Note: live background blur/"vibrancy" is descoped to v1.1+ since it is
      the single most GPU/compositor-sensitive visual feature — ship with a
      solid/semi-transparent background first (see Section 7, Phase 2).
- [ ] Functional: tabs, vertical/horizontal split panes, resizable panes,
      per-pane working directory, copy/paste, find-in-terminal, configurable
      themes and fonts, session restore (reopen with same layout/cwd).
- [ ] Packaged as a single installable binary for Linux (.deb/.AppImage) and
      buildable for macOS (.dmg) without code changes.
- [ ] README + install instructions good enough for a stranger to clone,
      build, and run it.

---

## 6. Key technical decisions (summary — see ARCHITECTURE.md for detail)

| Decision | Choice | Reasoning |
|---|---|---|
| App shell | Tauri v2 + Rust | Matches Desplio stack, tiny binaries, no Electron overhead |
| PTY backend | Rust `portable-pty` crate | Cross-platform PTY spawning, mature, used by WezTerm |
| Terminal emulation/rendering | `xterm.js` (`@xterm/xterm`) | Proven library (powers VS Code's terminal), zero dependencies, ships both a CPU-only DOM renderer and an optional GPU-accelerated WebGL renderer in the same package — exactly the "GPU-optional by default" shape this project needs |
| Renderer selection | Runtime auto-detect, default to DOM | DOM renderer needs no GPU context — same failure class that broke PrettyMux/limux. WebGL addon (`@xterm/addon-webgl`) loaded only if a capability probe succeeds, with automatic fallback. |
| UI framework | React + TypeScript | Matches existing stack; Tauri officially supports it |
| Styling | Tailwind (utility classes) + custom CSS for chrome | Fast iteration, matches frontend-design conventions Ele already uses |
| State management | Zustand or React context (decide in Phase 1) | Lightweight; pane/tab tree doesn't need Redux-level ceremony |

This avoids building a terminal-emulation engine from scratch (the actual
hard, multi-month part of this category of project) while keeping full
control over the chrome, layout, and rendering pipeline — which is where
all the "beat cmux" visual differentiation actually lives.

---

## 7. Feature scope by phase

See `02-DEVELOPMENT-PLAN.md` for the day-by-day build order and
`03-ARCHITECTURE.md` for technical design. Summary:

### v1.0 (daily-driver MVP)
- PTY spawn + xterm.js render (DOM renderer default)
- Custom macOS-style titlebar + traffic lights
- Tabs (create, close, reorder, rename)
- Split panes (horizontal + vertical, resizable, keyboard nav between panes)
- Copy/paste, text selection, scrollback
- Theme system (JSON-based, ship 3-4 built-in themes)
- Font picker (monospace fonts, ligature toggle)
- Session persistence (restore tabs/panes/cwd on relaunch), generalized
  into folder-scoped **workspaces** — see `04-WORKSPACES.md` for the full
  design (path matching, auto-track vs. pin, quick-switcher)
- Settings UI (no manual config file editing required, though file should
  exist underneath for power users)
- Linux packaging (.AppImage + .deb)

### v1.1 (polish + "beat cmux" visual bar)
- GPU capability probe → auto-enable WebGL renderer when safe
- Background vibrancy/blur (gated behind the GPU probe — never default-on
  on an unverified GPU)
- Window/pane open-close animations (CSS transitions, cheap on CPU)
- Shell integration (current command, exit status indicators, like iTerm2's
  shell integration marks)
- Quake-style global hotkey drop-down mode
- macOS packaging (.dmg, code-signing deferred until/if Ele has an Apple
  Developer account)

### v2.0+ (stretch, not committed)
- Plugin/extension API
- SSH connection manager UI
- Built-in tmux-style detach/reattach session backend (the "multiplexer"
  framing from the original ask) as an opt-in mode layered on top of the
  same PTY infrastructure

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| WebKitGTK (Tauri's Linux webview) has its own graphics dependency and could itself struggle on old hardware, even though it's much lighter than GTK4+OpenGL | Phase 1 of the dev plan is a hard go/no-go test on real hardware before any further work. Fallback path documented in ARCHITECTURE.md (GTK3+VTE rewrite) if it fails. |
| Scope creep toward "tmux replacement" muddies a clean v1 | Explicitly descoped (Section 3, Non-goals). Revisit only after v1 ships and is daily-driver-stable. |
| "Beat cmux on Mac" is a moving, subjective bar | Defined as: matches or exceeds it on load time, idle resource usage, and visual polish of chrome/tabs/panes — not "literally outperforms in every dimension." Tracked as a v1.1 goal, not a v1.0 blocker. |
| Solo dev, multiple concurrent projects (Flustro, Offrr, etc.) | Dev plan is scoped in small, independently shippable phases so the project survives being paused and resumed. |

---

## 9. Open questions to resolve during build

- Final app name (don't block development on this).
- Whether to target crates.io/npm registry distribution or GitHub
  releases-only for v1 sharing.
- License for public release (MIT is the default assumption — confirm
  before first public commit).
