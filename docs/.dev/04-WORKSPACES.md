# Zeyt — Workspaces (Folder-Scoped Layouts)

**Companion to:** 01-PRD.md, 02-DEVELOPMENT-PLAN.md, 03-ARCHITECTURE.md
**Last updated:** 2026-06-24
**Status:** Approved for v1.0 scope (layout-only persistence — see Section 5
for why true process resurrection is explicitly out of scope)

---

## 1. What this is

A **Workspace** is a saved bundle of tabs + pane layouts, tagged to a root
folder path. Open the app (or a new window) anywhere under that path, and
the matching workspace's layout loads automatically — same tabs, same
splits, same per-pane working directories. You can also jump to any
workspace manually regardless of where you currently are.

This sits as one new layer above the existing Tab/PaneNode model from
`03-ARCHITECTURE.md` — nothing below it changes:

```
Workspace (tagged to root path, e.g. ~/projects/flustro)
  └── Tab[]                      ← unchanged from 03-ARCHITECTURE.md
        └── PaneNode tree         ← unchanged
              └── Leaf (terminal, cwd)
```

```typescript
interface Workspace {
  id: string;
  name: string;            // display name, defaults to folder basename
  rootPath: string;        // absolute path this workspace is scoped to
  tabs: Tab[];
  activeTabId: string;
  lastUsedAt: number;       // epoch ms, for sorting in the quick-switcher
}

interface AppState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;  // null = no path match, generic session
  settings: Settings;
}
```

---

## 2. Path matching logic

### Trigger: "both" — auto-detect with manual override

On launch (and on opening a new window), Zeyt needs a starting path. Source
priority, first match wins:

1. **CLI arg / "open here" integration** — e.g. `zeyt ~/projects/flustro` or
   a right-click "Open in Zeyt" file-manager action passes an explicit path.
2. **Last active workspace's root path** — if no path is given, fall back to
   whatever workspace was active when the app last closed.
3. **`$HOME`** — final fallback, generic session, no workspace match.

### Matching rule: longest-prefix-match

Given a target path, find the workspace whose `rootPath` is the longest
matching prefix:

```typescript
function findMatchingWorkspace(
  targetPath: string,
  workspaces: Workspace[]
): Workspace | null {
  const normalized = normalizePath(targetPath); // resolve symlinks, trailing slash
  const matches = workspaces.filter(w =>
    normalized === w.rootPath || normalized.startsWith(w.rootPath + '/')
  );
  if (matches.length === 0) return null;
  // longest rootPath wins — same rule as .gitignore / router path resolution
  return matches.reduce((best, w) =>
    w.rootPath.length > best.rootPath.length ? w : best
  );
}
```

This resolves the overlapping-roots case directly: if you have workspaces
for both `~/projects` and `~/projects/flustro`, opening inside
`~/projects/flustro/src` matches the more specific one, not the parent.

### Manual override: quick-switcher

A `Cmd/Ctrl+K`-style palette lists all saved workspaces (sorted by
`lastUsedAt`, most recent first), independent of current path. Selecting one
switches the active workspace immediately — this is the "always overridable"
half of the requirement, and it's genuinely useful standalone (jumping
between Flustro/Offrr/Desplio contexts without touching the filesystem).

**No match found:** don't silently create a workspace. Open a normal,
unscoped session (a single tab, single pane, cwd = the target path). Prompt
once, non-blocking ("Save this as a workspace for this folder?" — a toast or
small banner, not a modal) so the first run in a new project folder doesn't
feel intrusive.

---

## 3. Save semantics — auto-track, explicit pin

Two distinct behaviors, deliberately kept separate so casual layout
experiments don't silently overwrite a layout you cared about:

### Auto-tracking (default, always on)

Once a workspace is active, any layout change — new tab, new split, pane
closed, cwd changed via `cd` — gets written to that workspace's saved state
on a debounced interval (same mechanism as the generic session persistence
already planned in `02-DEVELOPMENT-PLAN.md` Phase 6, just scoped per-workspace
instead of globally). This is what makes it feel "alive" — the workspace
always reflects how you last left that folder.

### Explicit pin (opt-in)

A "Duplicate as snapshot" action freezes the *current* layout under a new
name, decoupled from auto-tracking. Use case: you've built a specific
4-pane layout for debugging session X and don't want next week's casual
tab-juggling to overwrite it. Snapshots don't auto-update; they're static
until explicitly re-saved.

This two-tier model avoids a real trap: pure auto-save-only means "I had a
great layout open three days ago, then idly closed a tab today and it's
gone forever." Pin solves that without making the default behavior require
manual save discipline (which most users — including future-you at 1am —
will not maintain).

---

## 4. Storage

Workspaces persist as JSON in Tauri's app data directory, one file per
workspace plus an index:

```
~/.local/share/zeyt/
├── workspaces/
│   ├── index.json              # [{id, name, rootPath, lastUsedAt}, ...]
│   ├── <workspace-id>.json      # full Tab[]/PaneNode tree for one workspace
│   └── ...
└── settings.json
```

Keeping the index separate from full workspace bodies means the
quick-switcher (Section 2) can load instantly without parsing every saved
pane tree — only the active/selected workspace's full file gets read.

---

## 5. Why true process resurrection is explicitly out of scope (for now)

Worth stating clearly so this doesn't get rediscovered as a "missing
feature" later: **what gets restored is the layout (tabs, splits, working
directories), not the live process state inside each pane.** Closing the
app still terminates the underlying PTYs and whatever was running inside
them (per the orphan-cleanup discipline in `03-ARCHITECTURE.md` Section 4)
— reopening spawns fresh shells `cd`'d into the right places, not the same
`vim` session with unsaved buffers or the same running dev server.

This was a deliberate choice, not a limitation discovered too late:

- **True resurrection requires PTYs to outlive the GUI process.** That
  means a background daemon that owns the PTYs independently of any window
  — the actual tmux/screen architecture (client/server, where "closing
  the terminal" just detaches a client from an always-running server).
- That's a different product shape: Zeyt becomes "a GUI client that
  attaches to a session daemon" rather than "a terminal app." It changes
  packaging (now there's a service to install/manage, not just an app to
  launch), failure modes (what happens if the daemon crashes while the
  GUI is closed?), and platform story (daemons behave differently across
  Linux/macOS).
- The PRD's v2.0+ section already flags this exact idea — "built-in
  tmux-style detach/reattach session backend" — as a stretch goal layered
  on top of the same PTY infrastructure, *after* v1 is stable. That's still
  the right place for it. Revisit it there if, once you're living in
  layout-only workspaces daily, the lack of true resurrection is the thing
  that actually bugs you in practice rather than something that sounds
  good in the abstract.

If/when that's revisited, the **workspace layer designed here does not need
to change** — `Workspace → Tab[] → PaneNode tree` stays the data model
either way. Only the question of "does reopening a leaf spawn a fresh PTY,
or reattach to a still-running one on the daemon" changes underneath it.
That's exactly the kind of forward-compatible layering this doc aimed for.

---

## 6. Build phase placement

Insert as **Phase 6.5** in `02-DEVELOPMENT-PLAN.md`, after Session
Persistence (Phase 6) and before v1.1 Polish (Phase 7) — it's a generalization
of the same persistence mechanism Phase 6 already builds, not a separate
subsystem from scratch:

1. Add the `Workspace` layer above existing `Tab[]` state (1 day) — mostly
   restructuring the existing Zustand store to nest under workspaces.
2. Path matching + launch-time resolution (½-1 day).
3. Quick-switcher UI (½-1 day) — a modal/palette component, reuses patterns
   from any "Cmd+K" style UI.
4. Auto-tracking + debounced save, snapshot/pin action (1 day).

**Adds roughly 3-4 days to the v1.0 timeline** (~22 days / just over 3 weeks
total instead of ~18.5), which is a reasonable cost for what is genuinely
one of the more differentiating features against both Mac terminals and
the GTK-based Linux tools you tried earlier — none of PrettyMux, limux,
Tilix, or stock iTerm2 do automatic path-scoped workspace switching.
