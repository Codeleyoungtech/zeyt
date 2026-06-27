# Agent Prompt — Split Creation Lag (~2-3 seconds, janky animation)

Paste this AFTER 14-PANE-STATE-AND-FONT-FIXES.md has been addressed —
read the note below before starting, this is likely connected to that
fix, not a separate root cause.

---

## PROMPT START

When creating a split (Ctrl+D or Ctrl+Shift+D), it currently takes
roughly 2-3 seconds before the new pane appears, and the split animation
itself looks laggy/janky rather than smooth during that time.

### Check this first

If the pane-state-loss bug from 14-PANE-STATE-AND-FONT-FIXES.md (Item 1)
has already been fixed — specifically, if PTYs and xterm.js instances no
longer get killed/recreated unnecessarily on layout changes — re-test
split creation speed BEFORE doing any further work here. It's likely
that bug was the direct cause of this lag too: spawning a fresh PTY,
waiting for shell init, and mounting a new xterm.js instance is exactly
the kind of work that takes 2-3 seconds and would explain both the delay
and the janky animation (the animation is likely competing with expensive
synchronous work happening at the same time, not failing on its own).

Report whether fixing Item 1 already resolved this. If split creation is
now fast (sub-300ms to appear, smooth animation), this task is done with
no further changes needed — just confirm and report.

### If the lag persists even after the Item 1 fix

Diagnose with timing instrumentation (same approach as the restore-speed
fix in 09-RESTORE-PERFORMANCE-FIX.md) around:
1. Time from keypress to the new PTY spawn command being issued.
2. Time for the PTY spawn itself to complete (shell process actually
   starting).
3. Time for the new xterm.js instance to mount and complete its first
   render/fit.
4. Whether the split animation (the panel resizing/sliding into place)
   is CSS-driven (cheap, GPU-friendly) or JS-driven with manual
   style/layout updates on each frame (expensive, likely the cause of
   jank if so).

Likely fixes depending on what's found:
- If PTY spawn itself is slow: confirm it's not accidentally blocking the
  UI thread waiting for the shell's full startup (sourcing a heavy
  `.zshrc`/`.bashrc`, for example) before showing the pane — the pane
  should appear and the animation should complete immediately, with the
  terminal ready to accept input as soon as the shell finishes
  initializing in the background, not gated behind it.
- If the animation itself is the janky part: switch it to a pure CSS
  transition (`transform`/`width`/`grid-template-columns` transition)
  rather than any JavaScript-driven frame-by-frame style update, so it's
  handled by the browser's compositor and stays smooth regardless of
  what else is happening on the main thread.

### Test
Create a split rapidly several times in a row (not just once) and confirm
it consistently appears in well under a second with a visually smooth
animation, with no difference in feel between the 1st and 5th split
created in the same session.

## PROMPT END
