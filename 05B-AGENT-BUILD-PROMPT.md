# Agent Prompt — Full Build: Zeyt

Paste this to your AI coding agent as the master instruction for building
Zeyt. It assumes Phase 0 (05A-AGENT-PHASE0-PROMPT.md) has already been run.
If it hasn't, the agent is instructed to stop and run it first.

This prompt references the project's own docs (01-PRD.md,
02-DEVELOPMENT-PLAN.md, 03-ARCHITECTURE.md, 04-WORKSPACES.md) — keep those
four files in the repo root or a `docs/` folder so the agent can read them
directly instead of relying on this prompt to restate everything.

---

## PROMPT START

You are building **Zeyt** — a fast, GPU-optional terminal app with macOS-inspired design, folder-aware workspaces, and a clean split-pane layout — built to run smoothly even on older hardware. Full specification lives in four docs;
read them in this order before writing any code:

1. `01-PRD.md` — vision, scope, goals, success criteria
2. `02-DEVELOPMENT-PLAN.md` — the phased build order you must follow
3. `03-ARCHITECTURE.md` — repo structure, data models, PTY lifecycle,
   rendering strategy
4. `04-WORKSPACES.md` — the folder-scoped workspace system (Phase 6.5)

Treat these documents as the source of truth. If anything in this prompt
conflicts with them, the docs win. If something is ambiguous in both, ask
before guessing — this is a real product the owner intends to use daily
and potentially share publicly, not a disposable prototype.

### Hard gate — check this first

Before any other action: confirm whether the Phase 0 hardware gate test
(05A-AGENT-PHASE0-PROMPT.md) has already been run and passed in this
environment. Look for an existing `zeyt-gate-test/` directory or ask the
user directly: "Has the Phase 0 hardware test already passed?"

- **If not yet run:** stop, run that prompt's steps yourself, report the
  result, and wait for explicit go-ahead before continuing.
- **If it passed:** proceed with the Tauri + React + xterm.js stack as
  specified below.
- **If it failed (GL/WebKit errors, crashes, unacceptable load time):**
  stop and flag this clearly. Do not silently fall back to the GTK3+VTE
  architecture on your own judgment — that's a significant scope and
  language-mix change (native GTK widgets instead of React/TS) that the
  human should explicitly decide on, even though it's documented as the
  fallback path in `03-ARCHITECTURE.md` Section 7.

### Non-negotiable constraints (do not optimize these away)

- **DOM renderer only for xterm.js in v1.0.** Do not load
  `@xterm/addon-webgl` until explicitly told to start Phase 7. This is a
  deliberate sequencing decision, not an oversight — the WebGL path is
  v1.1, gated behind a capability probe, with graceful fallback. Building
  it early defeats the purpose of proving the safe path first.
- **Every PTY spawn must have a corresponding kill path.** When a pane or
  tab closes, the backing PTY process must be terminated and its registry
  entry removed, and the corresponding xterm.js instance must be disposed
  (`terminal.dispose()`). This is the single most important correctness
  rule in the codebase — orphaned shells degrade the host machine over a
  long session. Write a test or manual verification step for this at the
  end of every phase that touches pane/tab lifecycle (`ps aux | grep
  <shell>` should show zero orphans after closing everything).
- **No hardcoded shell.** Spawn `$SHELL`, falling back to `/bin/bash` only
  if unset. Do not assume bash.
- **Follow the phase order in `02-DEVELOPMENT-PLAN.md`.** Don't jump ahead
  to theming or persistence before tabs and splits are solid, and don't
  build v1.1 polish (Phase 7: WebGL, vibrancy, animations beyond simple
  CSS transitions) before v1.0's phases are complete and tested.
- **Naming:** the app is `Zeyt` (capitalized in UI/docs/titles), the
  binary/CLI invocation is `zeyt` (lowercase), app data lives under
  `~/.local/share/zeyt/` on Linux.

### Stack (already decided — do not re-litigate)

- App shell: **Tauri v2** + **Rust**
- PTY: Rust `portable-pty` crate
- Terminal rendering: `@xterm/xterm` (DOM renderer, default — see
  constraints above)
- UI: **React + TypeScript**
- Styling: **Tailwind** utility classes + custom CSS for window chrome
- State: **Zustand** (rationale in `03-ARCHITECTURE.md` Section 3 — don't
  switch to Redux/Context without discussing first)

### Working agreement — how to proceed through phases

Work through `02-DEVELOPMENT-PLAN.md`'s phases in order:

- Phase 1 (PTY + raw render) → Phase 2 (macOS chrome) → Phase 3 (tabs) →
  Phase 4 (split panes) → Phase 5 (theming) → Phase 6 (session
  persistence) → Phase 6.5 (folder-scoped workspaces, see `04-WORKSPACES.md`)
  → Phase 8 (packaging). Phase 7 (v1.1 polish: WebGL, vibrancy,
  animations, macOS build) comes only after all of the above are done and
  the human has confirmed v1.0 feels stable as a daily driver.

**After each phase**, stop and report:
- What was built, in plain terms.
- The specific test/checklist from that phase's section in
  `02-DEVELOPMENT-PLAN.md` (e.g. Phase 3's orphan-process check), and
  the actual result of running it.
- Anything you had to deviate from the docs on, and why.

Do not silently continue to the next phase without this checkpoint — the
human needs to actually run the app between phases to judge feel, which
text output alone can't capture.

### Code quality expectations

- This will potentially be shared publicly (PRD Section 3, Goal G3). Write
  it as if a stranger will clone and read it: no hardcoded paths specific
  to this machine, no commented-out debug cruft left in, reasonable
  variable names over abbreviations.
- Match the data models in `03-ARCHITECTURE.md` Section 3 (`PaneNode`,
  `Tab`) and `04-WORKSPACES.md` Section 1 (`Workspace`) — don't invent a
  different shape without flagging why the documented one doesn't work.
- Rust side: standard `cargo fmt`/`cargo clippy` cleanliness. TypeScript
  side: keep components reasonably small and colocate styles per the
  `frontend-design` conventions if that skill/reference is available in
  your environment.

### What to do if you get stuck or something contradicts the docs

Stop and ask, with specifics — don't guess silently and don't pick a
different architecture than what's documented because it seemed easier.
The docs reflect deliberate tradeoffs (e.g. DOM-only rendering, layout-only
persistence instead of true process resurrection) that were already
debated; if a technical obstacle makes one of them genuinely infeasible,
say so explicitly rather than quietly routing around it.

### First action

Confirm the Phase 0 gate status, then read all four docs in full, then
report back a short plan for Phase 1 before writing code.

## PROMPT END
