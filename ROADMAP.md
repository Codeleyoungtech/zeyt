# Zeyt — Roadmap

**Last updated:** 2026-06-26
**Purpose:** capture every feature idea worth keeping, without trying to
build all of it before v1.0 ships. This is a living backlog — full specs
exist separately for the top two priority items (17, 18); everything else
here is intentionally a shorter pitch, to be expanded into its own spec
only once it's actually being scheduled.

This roadmap deliberately excludes ideas that would turn Zeyt into a
heavier, multi-tool "everything app" (embedded browser, Docker/Kubernetes
explorers, database GUI clients, local LLM runtime, etc.) — those conflict
with Zeyt's core positioning as a fast, GPU-optional, lightweight
terminal, and are a different product, not a feature set for this one.

---

## Tier 1 — Priority for v1.1 (full specs exist)

1. **Agent & long-task notifications** — see `17-AGENT-NOTIFICATIONS.md`.
   Native OS notification + badge when a watched pane goes idle after
   activity, hits a known prompt pattern, or a long-running process
   exits. The single sharpest differentiator on this list — built
   specifically for agentic coding workflows (Claude Code, Codex,
   Gemini CLI), a niche no other macOS-aesthetic terminal currently
   targets directly.
2. **Directory-scoped command autosuggest** — see
   `18-DIRECTORY-AUTOSUGGEST.md`. Ghost-text suggestions from command
   history, scoped per-working-directory rather than global, working
   uniformly regardless of which shell the user runs.

---

## Tier 2 — Strong candidates for v1.1 or v1.2 (cheap, fits the product)

3. **Command palette (actions, not just workspaces)** — extend the
   existing Ctrl+K UI pattern to fuzzy-search app *actions* (new split,
   change theme, toggle sidebar, open settings) the way VS Code's
   Cmd+Shift+P works. Cheap because the palette UI/infrastructure already
   exists from the workspace switcher — this is mostly a new data source
   feeding the same component.
4. **Clickable smart text in terminal output** — file paths, URLs, and
   git commit hashes become clickable (open file in default editor, open
   URL in browser, preview a commit). xterm.js supports this via link
   providers; relatively cheap, high "feels premium" payoff.
5. **Destructive-command warning glyph** — lightweight pattern match on
   commands like `rm -rf`, `git push --force`, shows a small inline
   warning indicator before/as the command runs. Not a blocking
   confirmation (don't slow down power users) — just a flag. Particularly
   relevant given how often an *agent*, not the user directly, may be the
   one issuing commands.
6. **Per-pane "agent running" badge** — small icon on a tab/pane
   currently running a recognized agent CLI process, so at a glance
   across many open tabs you can see which are agent-busy vs. idle shell.
   Natural pairing with the Tier 3 auto-detect mode in the notifications
   spec.
7. **Scrollback search** (`Cmd/Ctrl+F` within a pane) — searches the
   current pane's scrollback buffer. Surprisingly often missing from
   indie terminal projects; genuinely essential for daily use, not a
   nice-to-have.
8. **Inline image preview** — `cat image.png` (or similar) renders a
   thumbnail instead of binary garbage in the terminal. Expected at this
   tier now (iTerm2, Kitty both do this).

---

## Tier 3 — Good ideas, lower urgency

9. **Broadcast input to all panes in a split** — type once, sends to
   every pane in the current split simultaneously. Useful for running
   the same command across multiple project checkouts at once.
10. **Per-workspace shell profiles** — different shell, env vars, or
    startup command per saved workspace (not just cwd, which workspaces
    already capture per `04-WORKSPACES.md`). Natural extension of the
    existing workspace data model — would need a small schema addition,
    not a redesign.
11. **Lightweight project preview pane** — NOT a general embedded
    browser. Specifically: a lazy-loaded panel (zero resource cost until
    the user explicitly opens it) that can show a localhost dev-server
    preview or a markdown/README render alongside the terminal. Framed
    narrowly like this, it avoids the "embedded Chromium" weight problem
    — it would reuse Tauri's existing webview rather than bundling a
    second browser engine, and never initializes unless explicitly
    triggered.

---

## Tier 4 — Ecosystem/credibility (matters once Zeyt has real outside users)

12. **Auto-update mechanism** — Tauri has a built-in updater plugin;
    means people don't have to manually redownload every release from
    GitHub. Worth adding once there's a real release cadence to support.
13. **Simple landing page/site** — even a single page. A README alone
    reads as "project"; a small site reads as "product." Low effort,
    meaningful credibility signal once sharing widely.
14. **Plugin/extension system** — the right long-term answer to "how does
    Zeyt grow past what one person builds," but this is a real
    ecosystem/distribution undertaking on its own, not a feature. Don't
    start until Zeyt has a real user base asking for specific
    integrations — building a plugin API speculatively, before knowing
    what plugins people actually want, tends to produce the wrong API.

---

## Explicitly out of scope (considered and rejected, not just unprioritized)

To avoid these resurfacing and needing re-litigation later: embedded full
browser engine, Docker/Kubernetes container explorers, database GUI
clients (Postgres/MySQL/Mongo/Redis), built-in API client (Postman-style),
local LLM runtime, real-time multi-user collaboration, SSH server
manager UI, animated/particle theme effects, music/Spotify integration.
Each is a legitimate standalone product; absorbing them into Zeyt works
against its core positioning as a fast, lightweight, GPU-optional
terminal rather than a heavy all-in-one IDE-replacement.

---

## How to use this doc

When picking up new work after a build phase completes: check Tier 1
first (specs already exist, ready to hand to an agent). Tier 2 items are
worth converting into a full spec (matching the style of
`04-WORKSPACES.md` or `17-AGENT-NOTIFICATIONS.md`) right before they're
actually scheduled — don't write detailed specs for everything in advance,
that's wasted effort if priorities shift. Tier 3/4 stay as one-line
pitches until there's a real reason to promote them.
