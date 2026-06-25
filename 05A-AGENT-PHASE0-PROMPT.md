# Agent Prompt — Phase 0: Hardware Gate Test

Paste this to your AI coding agent (Claude Code, Codex, etc.) as-is. Run
this BEFORE the full build prompt (05B-AGENT-BUILD-PROMPT.md). Its only
job is to produce a go/no-go signal.

---

## PROMPT START

You are setting up a throwaway test project to answer one question:
**does Tauri v2's webview run acceptably on this machine?** This is not
the real app — do not add any terminal logic, PTY code, or UI beyond the
default scaffold. Speed and a clear verdict matter more than completeness.

### Context

This machine is a ~12-year-old laptop with integrated graphics. A
previous GTK4/OpenGL-based terminal tool (PrettyMux) crashed on it with
`GtkGLArea failed to create an OpenGL context`. Tauri's Linux webview
(WebKitGTK) is a much lighter dependency than that, but has not been
verified on this exact hardware yet. This test exists to verify it before
any real development starts.

### Steps

1. **Check prerequisites.** Run and report:
   ```bash
   cat /etc/os-release | grep -E "VERSION|^NAME"
   which cargo rustc node npm
   glxinfo 2>/dev/null | grep -E "OpenGL renderer|OpenGL version" || echo "glxinfo not installed"
   free -h
   ```
   If `cargo`/`rustc` are missing, install Rust via
   `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh` and
   source the cargo env. If `node`/`npm` are missing, stop and tell me —
   don't install a Node version without asking, since I likely have a
   preferred version manager already.

2. **Install Tauri v2 Linux system dependencies** (note: `4.1`, not the
   older `4.0` some tutorials reference):
   ```bash
   sudo apt update
   sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
     libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
   ```
   If `libwebkit2gtk-4.1-dev` cannot be found, run
   `apt-cache search webkit2gtk` and report the output instead of
   guessing at a substitute package — that itself is signal.

3. **Scaffold the minimal test app** — React + TypeScript template, no
   extra configuration:
   ```bash
   npm create tauri-app@latest -- --name zeyt-gate-test --template react-ts
   cd zeyt-gate-test
   npm install
   ```

4. **Run it and report timing**, not just success/failure:
   ```bash
   time npm run tauri dev
   ```
   Let it run for at least 30 seconds once the window opens (or report
   immediately if it fails to open or errors out). While it's running,
   in a separate terminal capture:
   ```bash
   ps aux | grep -i zeyt-gate-test
   ```
   to confirm the process is alive and report approximate CPU% from
   `top`/`htop` if available, sampled while the window sits idle on
   screen for ~15 seconds.

5. **Report back, plainly, without editorializing:**
   - Did `npm run tauri dev` succeed or fail? Paste any error verbatim.
   - Approximate time from command start to window appearing.
   - Approximate idle CPU% while the window sat open and untouched.
   - Any visible warnings in the terminal output (GTK warnings, GL
     context errors, WebKit warnings) — paste them even if the window
     still opened successfully.

6. **Do not proceed to any further development.** This is the entire
   task. Stop here and wait for a decision based on the report.

### What I will do with your report

- If it opened cleanly, with reasonable load time and low idle CPU: go
  ahead with the full Tauri + React + xterm.js build plan.
- If it crashed, hung, or showed GL/WebKit errors: switch to a GTK3 +
  VTE native architecture instead (no webview at all) — a different
  build prompt for that path exists if needed.

## PROMPT END
