# Zeyt — Agent & Long-Task Notifications

**Companion to:** 01-PRD.md, 03-ARCHITECTURE.md
**Status:** Proposed for v1.1
**Last updated:** 2026-06-26

---

## 1. The problem this solves

Zeyt is built by, and for, someone who runs AI coding agents (Claude Code,
Codex, Gemini CLI) inside terminal panes constantly. The single most
annoying gap in that workflow: an agent finishes a task, or hits a
permission/confirmation prompt, while the user is tabbed away in a
browser, Slack, or another app — and nothing tells them. They only find
out minutes later by accident. Generic terminals have no concept of "this
pane just needs my attention" because they have no notion of *what* is
running inside them. Zeyt controls the PTY layer end-to-end already, so
it's positioned to solve this in a way a plain terminal can't.

This is a real, currently-unclaimed niche: iTerm2 has a basic "alert on
next mark" feature, but nothing in the macOS-aesthetic terminal space is
purpose-built for *agent* workflows specifically (detecting "agent went
idle, probably waiting on you" patterns, not just generic bell events).

---

## 2. Trigger conditions (what fires a notification)

Three tiers, simplest/cheapest first — ship Tier 1 before attempting 2-3:

### Tier 1 — Zero-config baseline (ship first)
- **Terminal bell** (`\a` / `BEL` character) — most shells and many CLI
  tools already emit this on completion or error. xterm.js already
  detects this; just needs to be wired to an OS notification instead of
  (or in addition to) the in-app visual bell.
- **Process exit** — when a foreground process in a pane exits (shell
  returns to prompt) AFTER having run for longer than a configurable
  threshold (default: 10 seconds — short commands shouldn't notify, long
  ones should).

### Tier 2 — Pattern matching (build once Tier 1 ships and feels good)
- **Idle-after-activity detection**: a pane that was producing continuous
  output, then goes silent for more than N seconds (default: 15s,
  configurable) while the process is still running (not exited) — this
  is the classic "agent is waiting for your input" signature.
- **Known prompt patterns**: simple regex match against recent output for
  common confirmation/permission prompts — `(y/n)`, `[Y/n]`, "Do you want
  to proceed?", "Press Enter to continue", etc. Keep this as a small,
  user-editable list of patterns in settings, not a hardcoded black box —
  different tools phrase prompts differently and the list will need
  tuning over time.

### Tier 3 — Process-aware (the real differentiator, build last)
- **Recognized agent process detection**: detect when a pane's running
  process matches known agent CLI names (`claude`, `codex`, `gemini`, or
  whatever the actual binary names are — confirm current names since
  these tools rename/rebrand) and apply a tighter idle threshold
  specifically for those panes (agents tend to go quiet right before they
  need permission, more reliably than a generic shell command does).

---

## 3. What happens when a trigger fires

- **Native OS notification** (Tauri's notification API — no extra
  dependency needed, available cross-platform).
- **Visual badge** on the relevant tab (a small dot/count indicator) AND
  on the dock/taskbar icon if the window isn't focused — so even with the
  notification dismissed/missed, glancing at the dock answers "does
  anything need me."
- Clicking the OS notification (where the platform supports it) should
  focus the Zeyt window and switch to the specific tab/pane that
  triggered it — not just bring the app forward generically.

---

## 4. Per-pane opt-in, not global-always-on

Not every pane should be watched — a pane running `tail -f` on a log file
legitimately goes "idle" for long stretches and shouldn't spam
notifications. Two reasonable models, pick one (recommend the first for
v1.1, simpler to reason about):

- **Manual flag**: a small "watch this pane" toggle (icon in pane corner,
  or a keybinding) the user sets explicitly per pane they care about.
- **Auto-detect** (Tier 3, later): automatically flag panes running a
  recognized agent process, no manual action needed — riskier to get
  right (false positives), revisit only after manual mode is proven
  useful in practice.

---

## 5. Settings needed

- Master on/off toggle for the whole notification system.
- Idle threshold (seconds) — configurable, sensible default.
- Minimum process runtime before exit-notifications fire — configurable.
- Editable list of "prompt pattern" regexes for Tier 2 (advanced users
  only — keep this out of the basic settings view, maybe behind an
  "Advanced" section).

---

## 6. Build sequencing note

This is genuinely v1.1+ scope — do not start before v1.0's core phases
(per 02-DEVELOPMENT-PLAN.md) are stable, and do not start before the
pane-state-loss bug (see 14-PANE-STATE-AND-FONT-FIXES.md) is confirmed
fixed, since this feature depends on reliably tracking long-lived PTY
output streams — building it on top of a PTY layer that's currently
getting killed/recreated unexpectedly would mean building on a shaky
foundation.
