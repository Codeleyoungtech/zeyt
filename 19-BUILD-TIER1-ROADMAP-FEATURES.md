# Agent Prompt — Build Tier 1 Roadmap Features

Paste this to your coding agent. Scope: the two highest-priority v1.1
features from ROADMAP.md — agent/long-task notifications, and
directory-scoped command autosuggest. Full specs exist in
17-AGENT-NOTIFICATIONS.md and 18-DIRECTORY-AUTOSUGGEST.md — read both in
full before starting either implementation.

---

## PROMPT START

Before writing any code, confirm these prerequisites are actually true —
do not start either feature if they aren't:

1. The pane-state-loss bug described in
   `14-PANE-STATE-AND-FONT-FIXES.md` (Item 1) has been fixed and tested —
   PTYs and xterm.js instances must persist correctly across workspace
   switches and split creation, not be killed/recreated. Both features
   below depend on reliably tracking long-lived PTY output streams; if
   PTYs are still being unexpectedly torn down, both features will be
   built on an unstable foundation. If this hasn't been confirmed fixed
   yet, stop and say so instead of proceeding.
2. v1.0's core phases per `02-DEVELOPMENT-PLAN.md` are otherwise stable
   (tabs, splits, workspaces, settings all working as expected in normal
   daily use).

If both are confirmed, proceed in this order:

### Feature 1 — Agent & long-task notifications (build first)

Read `17-AGENT-NOTIFICATIONS.md` in full. Implement **Tier 1 only** from
that spec in this pass — do not attempt Tier 2 (pattern matching) or
Tier 3 (process-aware detection) yet:

- Terminal bell (`\a`/BEL) detection, wired to a native OS notification
  via Tauri's notification API (in addition to, not necessarily
  replacing, any existing in-app visual bell behavior).
- Process-exit detection with a minimum runtime threshold (default 10
  seconds) before it triggers a notification — short commands finishing
  shouldn't notify, long ones should.
- A visual badge on the relevant tab, and on the dock/taskbar icon when
  the window isn't focused.
- Clicking the OS notification should focus the Zeyt window AND switch
  to the specific tab/pane that triggered it.
- A master on/off toggle in Settings, plus the minimum-runtime threshold
  as a configurable value (reasonable default pre-filled).
- This needs to be **per-pane opt-in via manual flag** for this pass
  (per Section 4 of the spec) — implement the simpler manual-toggle
  model, not auto-detection. A small icon/control on each pane to mark it
  "watch this pane" is sufficient; only watched panes should fire
  notifications.

**Test:** flag a pane as watched, run a command that takes >10 seconds
and produces a bell or exits, switch to a different tab/app, confirm a
native OS notification appears and clicking it returns focus to the
correct tab/pane.

### Feature 2 — Directory-scoped command autosuggest (build second)

Read `18-DIRECTORY-AUTOSUGGEST.md` in full. Implement:

- Per-directory command history logging (cwd-tagged), stored under the
  existing Zeyt app data location, with the size cap described in the
  spec (default 500 commands per directory, prune oldest).
- Ghost-text inline suggestion as the user types, fuzzy-matched against
  history for the exact current directory first, falling back to parent-
  directory history when no exact match exists.
- Tab (or right-arrow at end-of-line) to accept the suggestion; continuing
  to type normally should not be blocked or interfered with.
- Respect the "leading space = don't save to history" convention
  mentioned in the spec's edge cases section, matching existing bash/zsh
  behavior users already expect.
- History should be shared across all panes/tabs that share the same
  cwd, not siloed per individual pane.

**Test:** run several distinct commands in one directory, open a new
pane/tab in that same directory, confirm autosuggest offers those same
commands. Open a pane in a completely different, unrelated directory and
confirm it does NOT suggest commands from the first directory (unless
it's a parent-path match, per the spec's ranking rule).

### Constraints
- Build and test Feature 1 fully before starting Feature 2 — don't
  interleave them, since isolating problems in one is much harder if both
  are mid-implementation simultaneously.
- Don't implement anything from Tier 2/3 of the notifications spec, or
  the "subdirectory relationship ranking" nuance in autosuggest beyond
  the basic exact-match-then-parent-fallback described above — keep this
  pass to exactly what's specified, further refinement comes later.
- If anything in either spec conflicts with how the current codebase
  already tracks cwd-per-pane or PTY output, flag the conflict and ask
  rather than silently choosing an approach that diverges from the
  documented architecture.

## PROMPT END
