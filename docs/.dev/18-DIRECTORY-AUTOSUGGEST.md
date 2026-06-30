# Zeyt — Directory-Scoped Command Autosuggest

**Companion to:** 01-PRD.md, 03-ARCHITECTURE.md
**Status:** Proposed for v1.1
**Last updated:** 2026-06-26

---

## 1. The idea

Ghost-text autosuggest, similar to `zsh-autosuggestions` or fish shell's
built-in history suggestions — but scoped **per-directory**, not global.
Global history suggest (what most shells already do) is noisy: it
suggests commands from every project you've ever worked in. Scoping
suggestions to "what do I usually run *in this specific folder*" is
dramatically more useful and is the actual differentiator here, not the
ghost-text UI itself (which is a known pattern).

Building this directly into Zeyt (rather than relying on shell-specific
plugins) means it works consistently regardless of which shell the user
runs — bash, zsh, fish — since Zeyt owns the PTY layer and can observe
commands and cwd directly.

---

## 2. How it should work

1. Zeyt logs each command run in a pane, tagged with the working
   directory it was run in at the time (cwd is already tracked per-pane
   per the existing architecture).
2. When the user starts typing in a prompt, Zeyt fuzzy-matches the
   partial input against the history of commands previously run **in
   that same directory** (exact cwd match first; fall back to
   parent-directory matches if no exact-cwd history exists yet for a
   brand new folder).
3. The best match renders as dim ghost-text inline, completing the rest
   of the line — Tab (or Right-arrow at end-of-line, matching fish's
   convention) accepts it; continuing to type ignores/overrides it.

---

## 3. Storage

- A local history log, keyed by directory path, stored alongside other
  Zeyt app data (`~/.local/share/zeyt/`, consistent with existing storage
  conventions from 04-WORKSPACES.md).
- Reasonable cap on history size per directory (e.g. keep the most recent
  500 commands per path, prune older) to avoid unbounded growth over
  long-term use.
- This is local-only, never transmitted anywhere — worth stating
  explicitly in any privacy-related documentation later, since command
  history can contain sensitive strings (API keys typed inline, etc.).

---

## 4. Edge cases worth deciding up front

- **Sensitive commands**: consider a simple opt-out pattern (e.g. don't
  log/suggest commands matching common secret-bearing patterns, or
  simply: a command prefixed with a space is conventionally NOT saved to
  history in bash/zsh already — honor that same convention here for
  consistency with what users already expect).
- **Subdirectory relationship**: should a suggestion learned in
  `~/projects/zeyt` also surface (lower priority) when in
  `~/projects/zeyt/src`? Recommend yes, with exact-directory matches
  always ranked above parent-directory matches — mirrors the
  longest-prefix-match logic already used for workspace matching in
  04-WORKSPACES.md, so the codebase isn't introducing a second, different
  matching convention for a similar concept.
- **Multiple panes, same directory**: history should be shared/pooled
  across panes/tabs that share a cwd, not siloed per-pane — otherwise the
  suggestion pool stays thin even with heavy overall usage.

---

## 5. Build sequencing note

Lower priority than the agent-notification feature (17-AGENT-
NOTIFICATIONS.md) — that one solves an active daily pain point; this one
is a quality-of-life layer on top of an already-functional terminal. Fine
to sequence after it, or in parallel if convenient, but don't let this
block v1.0 core phases.
