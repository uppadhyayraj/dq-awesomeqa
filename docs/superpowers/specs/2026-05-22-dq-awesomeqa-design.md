# dq-awesomeqa Plugin Design

**Date:** 2026-05-22  
**Status:** Approved  
**Author:** Raj Uppadhyay

---

## Overview

`dq-awesomeqa` is a Claude Code plugin that brings a full QA lifecycle to any project. It covers four testing domains — UI (E2E + visual), API, Accessibility, and Performance — through 12 skills that guide QA engineers the way a senior QA consultant would: asking the right questions, explaining the reasoning behind each step, and always closing with clear recommended next actions.

The plugin orchestrates three existing specialized tools:
- **democratize-quality MCP server** — API test planning, generation, and healing
- **accessibility-cli** — WCAG accessibility auditing + Playwright-based UI automation
- **nbomber-cli** — Load test scenario generation and execution

It adds no runtime code of its own. All skills are `SKILL.md` instruction files.

---

## Design Principles

1. **Consultant tone** — Skills explain *why* they ask what they ask. Findings are interpreted in professional QA language. Every skill ends with clear next steps.
2. **Config-first** — All skills read `dq-qa.config.json` before acting. If it doesn't exist, they invoke `qa-onboard` automatically.
3. **Domain isolation** — Each execution skill owns one domain. Domain skills can be run independently without running the full lifecycle.
4. **Tools do the heavy lifting** — Code and config generation delegates to the underlying tools (`api_generator`, `dq-nbomber generate`, `a11y-cli`). Skills orchestrate and refine, never generate from scratch.
5. **Separate reports, unified summary** — Each domain produces its own native report. `qa-report` aggregates them into a single `qa-summary.md` dashboard.

---

## Plugin Structure

```
dq-awesomeqa/
├── .claude-plugin/
│   └── plugin.json       ← Claude Code plugin descriptor (name, version, description)
├── package.json
├── README.md
├── skills/
│   ├── qa-setup/
│   │   └── SKILL.md
│   ├── qa-onboard/
│   │   └── SKILL.md
│   ├── qa-plan/
│   │   └── SKILL.md
│   ├── qa-impact/
│   │   └── SKILL.md
│   ├── qa-ui/
│   │   └── SKILL.md
│   ├── qa-api/
│   │   └── SKILL.md
│   ├── qa-a11y/
│   │   └── SKILL.md
│   ├── qa-perf/
│   │   └── SKILL.md
│   ├── qa-triage/
│   │   └── SKILL.md
│   ├── qa-coverage/
│   │   └── SKILL.md
│   ├── qa-codegen/
│   │   └── SKILL.md
│   └── qa-report/
│       └── SKILL.md
└── hooks/
    ├── qa-safety.js      ← PreToolUse guard
    ├── session-start     ← SessionStart: injects skill index into context
    ├── stop              ← Stop: emits progress + token/cost status line
    └── run-hook.cmd      ← cross-platform bash wrapper (Windows support)
```

---

## Project Config: `dq-qa.config.json`

Created by `qa-onboard`, read by all other skills. Committed to the project repo.

```json
{
  "project": {
    "name": "my-app"
  },
  "domains": {
    "ui": {
      "enabled": true,
      "baseUrl": "https://app.example.com",
      "recordVideo": true,
      "reportDir": "./qa-reports/ui"
    },
    "api": {
      "enabled": true,
      "baseUrl": "https://api.example.com",
      "schemaUrl": "https://api.example.com/swagger.json",
      "reportDir": "./qa-reports/api"
    },
    "accessibility": {
      "enabled": true,
      "jurisdiction": "WCAG2.1",
      "level": "AA",
      "reportDir": "./qa-reports/a11y"
    },
    "performance": {
      "enabled": true,
      "schemaUrl": "https://api.example.com/swagger.json",
      "thresholds": {
        "p99LatencyMs": 500,
        "okRequestPercent": 95
      },
      "reportDir": "./qa-reports/perf"
    }
  },
  "requirements": {
    "docsPath": "./docs/requirements"
  }
}
```

---

## Skill Lifecycle Flow

```
qa-setup        (once per machine — installs CLIs + registers MCP server)
    │
    ▼
qa-onboard      (once per project — collects config → dq-qa.config.json)
    │
    ▼
qa-plan  ◀──── qa-impact  (triggered by new/changed requirements)
    │
    ├──────────────────────────────────────┐
    ▼           ▼           ▼              ▼
  qa-ui      qa-api      qa-a11y        qa-perf
    │           │           │              │
    └───────────┴───────────┴──────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
          qa-triage            qa-coverage
              │
              ▼
          qa-codegen   (generates fixes / new tests from triage or gaps)
              │
              ▼
          qa-report    (unified summary linking all domain reports)
```

Skills that don't find `dq-qa.config.json` automatically invoke `qa-onboard` before proceeding.

---

## Phase 1 Skills — Responsibilities

### `qa-setup`
**Frequency:** Once per developer machine  
**What it does:**
1. Checks whether `a11y-cli`, `dq-nbomber`, and the DQ MCP server are available
2. For each missing tool, explains what it is and why it's needed, then runs the install:
   - `npm install -g @democratize-quality/accessibility-cli`
   - `dotnet tool install -g dq-nbomber-cli`
   - `claude mcp add democratize-quality npx @democratize-quality/mcp-server`
3. Validates each tool responds correctly after install
4. Closes with a summary of what was installed and recommends running `qa-onboard` next

---

### `qa-onboard`
**Frequency:** Once per project  
**What it does:**
1. Explains the purpose of each question before asking it (consultant tone)
2. Asks sequentially:
   - Project name
   - Frontend URL (skip if no UI testing)
   - API base URL + schema URL or local file path (OpenAPI or GraphQL)
   - Accessibility: jurisdiction (WCAG 2.1 / WCAG 2.2 / Section 508 / EN 301 549) and conformance level (A / AA / AAA)
   - Performance: base URL, p99 latency threshold, ok-request % threshold
   - Requirements docs path (optional)
3. Writes `dq-qa.config.json` to project root
4. Closes with a summary of what was configured and recommends running `qa-plan` next

---

### `qa-plan`
**Frequency:** Per release or major requirement change  
**What it does:**
1. Reads `dq-qa.config.json` and any requirements docs at `requirements.docsPath`
2. If no requirements docs exist, asks the user for testing goals and priorities
3. Produces `qa-plan.md` with:
   - Risk-based test prioritization per domain
   - Test scope: what is in/out of scope and why
   - Test types per domain (smoke, regression, exploratory)
   - Entry/exit criteria
   - Recommended execution order
4. Explains reasoning behind each prioritization decision (consultant tone)
5. Closes by recommending which domain to execute first based on risk

---

### `qa-impact`
**Frequency:** When requirements change  
**What it does:**
1. Takes new or changed requirements as input (file, URL, or pasted text)
2. Diffs against existing `qa-plan.md`
3. Outputs a structured impact report:
   - Tests to add (new scenarios)
   - Tests to modify (changed behavior)
   - Tests to retire (removed features)
4. Explains the QA risk of each change
5. Updates `qa-plan.md` with the adjustments

---

### `qa-ui`
**Frequency:** On demand / CI  
**Underlying tool:** accessibility-cli (playwright-cli engine)  
**What it does:**
1. Reads `domains.ui` from `dq-qa.config.json`
2. Opens the app in headed mode for exploration
3. Guides user to walk through key flows — builds YAML scripts incrementally
4. Runs flows via `a11y-cli` with Playwright HTML reporter enabled + video recording
5. Surfaces failures with a brief root-cause assessment
6. Reports: Playwright HTML report + recordings at `domains.ui.reportDir`
7. Recommends running `qa-a11y` next for the same flows

---

### `qa-api`
**Frequency:** On demand / CI  
**Underlying tool:** democratize-quality MCP server  
**What it does:**
1. Reads `domains.api` from `dq-qa.config.json`
2. Calls `api_planner` to generate test plan from schema
3. Calls `api_generator` to produce executable tests (Playwright / Jest / Postman)
4. Optionally calls `api_healer` if existing tests are failing
5. Explains what each generated test is verifying and why
6. Reports: Playwright/Jest HTML report at `domains.api.reportDir`

---

### `qa-a11y`
**Frequency:** On demand / CI  
**Underlying tool:** accessibility-cli  
**What it does:**
1. Reads `domains.accessibility` from `dq-qa.config.json`
2. Runs WCAG audit at the configured jurisdiction and level
3. Interprets findings using QA language — severity, affected user groups, remediation guidance
4. Generates accessibility-cli HTML/JSON compliance report at `domains.accessibility.reportDir`
5. Categorizes violations by WCAG criterion and severity (critical / serious / moderate / minor)
6. Closes with top 3 recommended fixes and their business impact

---

### `qa-perf`
**Frequency:** On demand / CI  
**Underlying tool:** nbomber-cli  
**What it does:**
1. Reads `domains.performance` from `dq-qa.config.json`
2. Runs `dq-nbomber generate <schemaUrl>` to scaffold YAML + data files
3. Refines generated YAML: auth flow, load simulation shape, thresholds from config
4. Runs `dq-nbomber validate` and fixes any errors
5. Hands the config to the user to run (`dq-nbomber run`) — explains why execution is user-initiated
6. After run, interprets nbomber HTML report: p99/p95 latency, error rate, threshold pass/fail
7. Report at `domains.performance.reportDir`

---

### `qa-triage`
**Frequency:** After test runs  
**What it does:**
1. Takes test failure output from any domain (paste, file, or report path)
2. Categorizes each failure:
   - Severity: P0 (blocking) / P1 (critical) / P2 (major) / P3 (minor)
   - Domain: UI / API / A11y / Perf
   - Type: product bug / test bug / environment issue / flaky
3. Suggests root cause per failure based on error pattern
4. Outputs a structured triage report with recommended owner and next action per item
5. Surfaces the most critical items first — explains business risk

---

### `qa-coverage`
**Frequency:** Per sprint / release  
**What it does:**
1. Reads `qa-plan.md` and existing test files/configs across all domains
2. Compares planned vs. implemented coverage per domain
3. Identifies:
   - Untested API endpoints
   - UI flows with no test coverage
   - A11y flows not audited
   - Perf scenarios not in YAML config
4. Outputs a prioritized list of coverage gaps with risk rating
5. Recommends which gaps to close first based on user-facing risk

---

### `qa-codegen`
**Frequency:** On demand  
**What it does:**
1. Determines which domain needs code generation from context or user input
2. Delegates to the correct tool:
   - API: calls `api_generator` via DQ MCP server
   - Perf: runs `dq-nbomber generate <spec>`
   - UI / A11y: drives playwright-cli exploration to build YAML scripts
3. Refines generated output — fills gaps the tools can't resolve automatically
4. Explains what was generated and what the user should review before running
5. Does **not** generate test code from scratch without running the tool first

---

### `qa-report`
**Frequency:** After execution across domains  
**What it does:**
1. Locates each domain's report output at the `reportDir` paths in config
2. Reads summary data from each native report
3. Generates `qa-summary.md` at project root with:
   - Executive summary: overall QA status (pass / warn / fail)
   - Per-domain result table: tests run, passed, failed, skipped
   - Top findings per domain (max 5 each)
   - Links to full native reports (Playwright HTML, nbomber HTML, a11y HTML/JSON)
4. Surfaces the most critical cross-domain risk if any domain is failing
5. Formats the summary to be shareable with stakeholders

---

## Reporting Architecture

| Domain | Native report tool | Format | Output path |
|--------|--------------------|--------|-------------|
| UI E2E | Playwright HTML reporter + trace viewer | HTML + videos | `domains.ui.reportDir` |
| API | Playwright / Jest reporter | HTML | `domains.api.reportDir` |
| Accessibility | accessibility-cli | HTML + JSON | `domains.accessibility.reportDir` |
| Performance | nbomber-cli HTML + `dq-nbomber trend` interactive dashboard | HTML | `domains.performance.reportDir` |
| Unified | `qa-report` skill | Markdown | `./qa-summary.md` |

---

## Code Generation Strategy

| Domain | Generation tool | Output |
|--------|----------------|--------|
| API | `api_project_setup` → `api_generator` (DQ MCP server) | Playwright / Jest / Postman test files (auto-detects existing framework) |
| Performance (config) | `dq-nbomber generate <schemaUrl>` | `dq-nbomber.yaml` + data CSVs |
| Performance (code) | `dq-nbomber export <yaml> [--format project]` | `Program.cs` + optional `LoadTest.csproj` (runnable NBomber C# program) |
| UI E2E | `a11y-cli` playwright-cli exploration | YAML interaction scripts |
| Accessibility | `a11y-cli` session + snapshot | YAML audit scripts |

`qa-codegen` orchestrates these — it never writes test code from scratch.

### Performance code generation detail
`dq-nbomber export` produces a self-contained NBomber 6.x C# program:
- `--format file` (default) — single `Program.cs` using `#:package` directives, requires .NET 10+
- `--format project` — `Program.cs` + `LoadTest.csproj`, compatible with .NET 8/9

`qa-codegen` asks which .NET version the project targets before choosing the export format.

---

## Hooks

### Safety Hook — `hooks/qa-safety.js` (PreToolUse)
Guards against destructive or out-of-scope operations during QA runs:
- Destructive filesystem operations (`rm -rf`, etc.)
- Writing to application source files (QA role is read + test, not modify)
- Privilege escalation (`sudo`)
- Commands outside the QA toolchain during an active audit

Pattern mirrors the accessibility-cli safety hook.

### Session Start Hook — `hooks/session-start` (SessionStart)
Injects the `using-dq-awesomeqa` context at session start so Claude always knows the available skills and their lifecycle order. Pattern mirrors superpowers' session-start hook — reads the skill index and emits it as `additionalContext`. Cross-platform via `hooks/run-hook.cmd` wrapper (same pattern as superpowers).

### Progress + Token Hook — `hooks/stop` (Stop)
Fires at the end of every Claude turn during an active QA session. Emits a one-line status bar showing:
- Current active skill and step completed
- Tokens used this turn + cumulative session tokens
- Cost estimate for the session

Format example:
```
[dq-awesomeqa] qa-api › plan generated ✓  |  turn: 2.1k tokens  |  session: 18.4k tokens (~$0.03)
```

This gives QA engineers the same turn-by-turn cost visibility that superpowers users expect without requiring any manual `/status` checks.

---

## Phase 2 Skills (Future)

| Skill | Purpose |
|-------|---------|
| `qa-security` | OWASP Top 10, auth/authz, injection testing |
| `qa-ci` | Generate CI pipeline configs (GitHub Actions, GitLab CI, Jenkins) |
| `qa-regression` | Smart regression scoping from git diff |
| `qa-flaky` | Detect and quarantine flaky tests from run history |
| `qa-metrics` | Track QA KPIs over time (defect escape rate, pass rate trends) |
| `qa-matrix` | Cross-browser / cross-device test matrix strategy |

---

## Guiding UX Principle

Every skill should feel like a senior QA consultant is sitting next to the user:
- Explain the *why* behind every question and every finding
- Use professional QA vocabulary (risk-based testing, entry/exit criteria, severity, conformance level)
- Never just dump raw tool output — always interpret it
- Always close with a clear, prioritized "what to do next"
