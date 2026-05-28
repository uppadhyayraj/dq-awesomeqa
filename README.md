# dq-awesomeqa

A QA lifecycle plugin that guides QA engineers through the full Software Testing Life Cycle — UI, API, Accessibility, and Performance — with the expertise of a senior QA consultant.

Works with **Claude Code**, **GitHub Copilot (VS Code)**, **Cursor**, **Gemini CLI**, **Codex CLI/App**, and **OpenCode**.

---

## Installation

> Each coding agent needs its own separate installation. If you use more than one, install dq-awesomeqa for each.

### Claude Code

**Option A — Local clone (works today):**

```bash
git clone https://github.com/uppadhyayraj/dq-awesomeqa
```

Then register the local path in your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "enabledPlugins": {
    "dq-awesomeqa@dq-awesomeqa": true
  },
  "extraKnownMarketplaces": {
    "democratize-quality": {
      "source": {
        "source": "directory",
        "path": "/path/to/dq-awesomeqa"
      }
    }
  }
}
```

Restart Claude Code and run `/qa-init` to verify.

**Option B — Marketplace (once listed):**

```bash
/plugin install dq-awesomeqa@claude-plugins-official
```

---

### GitHub Copilot (VS Code)

> Requires VS Code with the GitHub Copilot extension. Agent plugins must be enabled (preview feature).

**Step 1 — Enable agent plugins** in your VS Code user `settings.json`:

```json
{
  "chat.plugins.enabled": true
}
```

> This must be a **user-level** setting — workspace settings are silently ignored.

**Step 2 — Register the local clone:**

```bash
git clone https://github.com/uppadhyayraj/dq-awesomeqa
```

Add to your VS Code user `settings.json`:

```json
{
  "chat.plugins.enabled": true,
  "chat.pluginLocations": {
    "/path/to/dq-awesomeqa": true
  }
}
```

**Step 3 — Verify:** Restart VS Code and type `/qa-init` in the Copilot chat panel.

For full details and troubleshooting, see [docs/copilot-install.md](docs/copilot-install.md).

---

### Cursor

**Step 1 — Clone the repo:**

```bash
git clone https://github.com/uppadhyayraj/dq-awesomeqa
```

**Step 2 — Install via Cursor agent chat:**

```
/add-plugin /path/to/dq-awesomeqa
```

Or search for `dq-awesomeqa` in the Cursor plugin marketplace once listed.

**Step 3 — Verify:** Open a Cursor agent session and type `/qa-init`.

---

### Gemini CLI

Install directly from GitHub:

```bash
gemini extensions install https://github.com/uppadhyayraj/dq-awesomeqa
```

To update later:

```bash
gemini extensions update dq-awesomeqa
```

**Verify:** Start a Gemini CLI session and type `/qa-init`.

---

### Codex CLI

Open the plugin search interface and search for `dq-awesomeqa`:

```
/plugins
```

Search for `dq-awesomeqa` and select **Install Plugin**.

**Verify:** Run `/qa-init` in a Codex session.

---

### Codex App

Navigate to **Plugins** in the sidebar, find `dq-awesomeqa` in the Testing section, and click **+** to install.

---

### OpenCode

Add to your `opencode.json`:

```json
{
  "plugin": ["dq-awesomeqa@git+https://github.com/uppadhyayraj/dq-awesomeqa.git"]
}
```

Restart OpenCode — it installs automatically and registers all `/qa-*` skills.

For full details, see [.opencode/INSTALL.md](.opencode/INSTALL.md).

---

## Prerequisites (all platforms)

| Requirement | Used by |
|-------------|---------|
| Node.js | Hooks (safety, audit, sanitize) |
| `a11y-cli` | UI + Accessibility tests (`/qa-setup` installs this) |
| `dq-nbomber` | Performance tests (`/qa-setup` installs this) |
| `democratize-quality` MCP server | API tests (run `/qa-setup` to register) |

Run `/qa-setup` after installing the plugin — it installs the CLI tools and registers the MCP server.

---

## Getting started

Run `/qa-init` to begin. It walks you through every phase of the STLC in order, enforces phase gates, lets you choose which domains to cover, and won't let you skip steps that would leave gaps.

If you prefer to work domain by domain, see the individual skills below.

## The STLC Journey

```
/qa-init
  │
  ├─ Phase 1 — Setup
  │     /qa-setup    → install tools (once per machine)
  │     /qa-onboard  → configure project (once per project)
  │
  ├─ Phase 2 — Planning
  │     /qa-requirement → gather requirements (first cycle) → requirements/ folder
  │     /qa-impact      → record what changed (subsequent cycles)
  │     /qa-plan        → derive test strategy from requirements/ → qa-plan.md
  │
  ├─ Phase 3 — Design  (only domains in scope)
  │     /qa-api      → API test plan
  │     /qa-ui       → UI interaction script
  │     /qa-a11y     → Accessibility audit (runs after /qa-ui)
  │     /qa-perf     → Load test config
  │     /qa-coverage → Design gap check (are all planned areas designed?)
  │
  ├─ Phase 4 — Execution
  │     /qa-exec     → run all in-scope domain tests
  │
  └─ Phase 5 — Closure
        /qa-triage   → categorize failures, ship/no-ship verdict (if failures)
        /qa-coverage → release readiness gate (is it safe to ship?)
        /qa-report   → consolidated QA summary
```

**Two feedback loops are built into the journey:**
- Failures after execution → `/qa-triage` → fix → re-execute
- Requirements change between cycles → `/qa-impact` → updated plan → re-design

## Skills reference

### Entry point

| Skill | When to use |
|-------|------------|
| `/qa-init` | Start here — guided STLC journey with phase gates and domain scope selection |

### Setup (run once)

| Skill | When to use |
|-------|------------|
| `/qa-setup` | Once per machine — installs CLIs and registers MCP server |
| `/qa-onboard` | Once per project — collects URLs, schema, a11y level, perf thresholds |

### Planning

| Skill | When to use |
|-------|------------|
| `/qa-requirement` | First cycle — gathers requirements via Jira, paste, or guided questions; writes `requirements/` folder |
| `/qa-plan` | Per cycle — derives test strategy from `requirements/`; writes `qa-plan.md` |
| `/qa-impact` | Subsequent cycles — records changed requirements, updates `requirements/` + `qa-plan.md`, flags domain re-runs |

### Design (one per domain)

| Skill | When to use |
|-------|------------|
| `/qa-api` | Build the API test plan from schema — executed by `/qa-exec` via MCP |
| `/qa-ui` | Explore the live app and build the UI interaction YAML |
| `/qa-a11y` | Add WCAG accessibility scan steps to `ui-test.yaml`, or build a standalone audit |
| `/qa-perf` | Generate load test config from schema via dq-nbomber |

### Execution

| Skill | When to use |
|-------|------------|
| `/qa-exec` | Execute all in-scope domain tests in recommended order (API → UI+A11y → Perf) |

### Closure

| Skill | When to use |
|-------|------------|
| `/qa-triage` | After failures — categorize by severity, cross-reference schema, issue ship verdict |
| `/qa-coverage` | After design (gap check) or before release (readiness gate) |
| `/qa-report` | Consolidate all domain results into `qa-summary.md` |

### Advanced

| Skill | When to use |
|-------|------------|
| `/qa-codegen` | Generate runnable test code (framework files or C# NBomber program) — not part of the main STLC path |

## Domain scope

You don't have to run all domains in every cycle. `/qa-init` (and `/qa-plan`) ask which domains to include at the start of each cycle. A single-domain run (e.g. API only, or Performance only) is a first-class path.

## Phase 2 (coming)

`qa-security`, `qa-ci`, `qa-regression`, `qa-flaky`, `qa-metrics`, `qa-matrix`
