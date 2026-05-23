# dq-awesomeqa Phase 2 Design — Bug Fixes + Lifecycle Redesign

**Date:** 2026-05-23
**Status:** Approved
**Author:** Raj Uppadhyay

---

## Overview

Phase 2 addresses three bugs found in Phase 1 and introduces a redesigned skill lifecycle with
clearer separation between **planning**, **execution**, and **reporting** phases.

### Bugs being fixed

1. **Missing reference folders** — qa-ui, qa-a11y, and qa-perf were adapted from source projects
   without copying their `references/` subdirectories. These reference files contain the YAML
   command schemas and CLI reference docs that Claude needs to generate correct test artifacts.

2. **Skills generate but don't execute** — qa-api generates tests but never runs them. qa-ui builds
   a YAML that is missing `report` and `close` steps (so no report is produced). qa-a11y builds an
   incomplete YAML. Step 4 of qa-ui calls `npx playwright show-report` which opens an existing
   report rather than running tests.

3. **qa-plan.md not consulted** — qa-api, qa-perf, and qa-codegen never read `qa-plan.md` for
   test scope. Only qa-ui and qa-a11y checked it.

---

## Revised Skill Lifecycle

```
qa-setup      (once per machine)
qa-onboard    (once per project → dq-qa.config.json)
      │
      ▼
qa-plan       (per release — orchestrator: collects requirements, dispatches domain planning)
      │
      ├── [parallel] qa-api   → api-test-plan.md
      ├── [parallel] qa-perf  → dq-nbomber.yaml + .env.example
      └── [sequential] qa-ui  → ui-test.yaml
                    → qa-a11y adds scan steps to same YAML (if A11y enabled)
      │
      ▼
qa-exec       (new — executes domains in order: API → UI+A11y → Perf)
      │
      ▼
qa-triage / qa-coverage  (as before)
      │
      ▼
qa-report     (redesigned — reads domain execution summaries, produces qa-summary.md)
```

---

## Skill Changes

### 1. qa-plan — redesigned as orchestrator

**Responsibilities:**
1. Read `dq-qa.config.json` — determine which domains are enabled
2. Warn if UI/A11y planning requires the app to be running (it does — live browser exploration)
3. Collect requirements upfront per domain (in conversation, not via subagents):
   - For UI/A11y: *"What user flows should I test? List 3–5 critical paths (e.g. login → dashboard → checkout)"*
   - For API: *"Which test categories? functional / security / error-handling / edge-cases"*
   - For Perf: *"What load profile? (e.g. 10 rps for 60s)" and "Which flows to load test?"*
4. **Ask the user** how they want to run domain planning:
   > "I'm ready to create test artifacts for each domain. I can run the planning in parallel
   > using subagents (recommended — faster) or guide you to run each domain skill manually.
   > Which do you prefer?"
5. **Option A — Parallel subagents (if user chooses):** Dispatch via `superpowers:dispatching-parallel-agents`:
   - Track 1 (parallel): qa-api → api-test-plan.md
   - Track 2 (parallel): qa-perf → dq-nbomber.yaml
   - Track 3 (sequential): qa-ui → ui-test.yaml → qa-a11y adds scan steps
6. **Option B — Manual (if user chooses):** Produce a numbered run-order guide:
   > 1. Run `/qa-api` → api-test-plan.md
   > 2. Run `/qa-perf` → dq-nbomber.yaml
   > 3. Run `/qa-ui` → ui-test.yaml
   > 4. Run `/qa-a11y` → adds scan steps to ui-test.yaml (if A11y enabled)
7. After all domain plans are ready, write `qa-plan.md` with:
   - Flows covered per domain
   - Entry/exit criteria
   - Recommended execution order
   - Links to artifact files

**Key change:** qa-plan is now an orchestrator. It no longer writes a risk assessment itself —
the risk content comes from the domain artifacts (api-test-plan.md, ui-test.yaml, dq-nbomber.yaml).

---

### 2. qa-ui — planning-only YAML builder

**Purpose:** Explore the live application and build a complete, runnable `ui-test.yaml`.

**What changes from Phase 1:**
- Remove Step 4 entirely (`npx playwright show-report` was wrong — opens existing reports, not run tests)
- YAML being built MUST end with `report` + `close` steps (these were missing)
- Reads `skills/qa-ui/references/` for correct a11y-cli command syntax
- Output: saves `ui-test.yaml` at project root (or `domains.ui.reportDir/../`)
- Final message: *"YAML saved at `ui-test.yaml`. Run `/qa-exec` when ready to execute."*
- Reads `qa-plan.md` in Step 1 for the flows to cover

**What stays the same:**
- Steps 0, 1, 2, 3 (read config → identify flows → explore live → build YAML incrementally)
- Consultant tone, failure protocol

**YAML template structure (must include):**
```yaml
version: '1.0'
name: <project> UI Test
config:
  session: <project-slug>
  output_dir: <domains.ui.reportDir>
  wcag_level: AA
  format: html

steps:
  - command: open
    url: <domains.ui.baseUrl>
    headed: true
  # ... interaction steps built during live exploration ...
  - command: report
    format: html
    include_screenshots: true
  - command: close
```

---

### 3. qa-a11y — YAML scan-step enhancer

**Purpose:** Layer accessibility scanning onto the UI test YAML (or create a standalone audit YAML).

**What changes from Phase 1:**
- **Primary mode (when UI YAML exists):** Reads `ui-test.yaml`, inserts `scan` steps after each
  `open` command and after each `click` that triggers a page navigation
- **Standalone mode (no UI YAML):** Builds a full audit YAML as before
- Reads `skills/qa-a11y/references/` for correct scan step syntax
- `scan` steps include `wcag_level` and `jurisdiction` from config
- Reads `qa-plan.md` for which pages to audit

**Where scan steps are inserted:**
```yaml
# After open:
- command: open
  url: https://example.com
  headed: true
- command: scan           # <-- inserted here
  page_name: Login
  level: AA
  jurisdiction: US

# After a click that changes page:
- command: click
  ref: '#login-button'
- command: scan           # <-- inserted here
  page_name: Dashboard
  level: AA
```

**Closing message:** *"Scan steps added to `ui-test.yaml`. WCAG <level> checks will run on:
<list of pages>. Run `/qa-exec` to execute both UI and accessibility tests together."*

---

### 4. qa-api — planning only

**Purpose:** Create `api-test-plan.md` using the democratize-quality MCP server.

**What changes from Phase 1:**
- Remove Phase 2 (test generation) — no longer in scope
- Remove Phase 3 (test healing) — no longer in scope
- Add qa-plan.md read at Step 0 (for test scope/categories)
- Rename output consistently to `api-test-plan.md`
- Closing message: *"Test plan at `api-test-plan.md`. Run `/qa-exec` to execute the API tests."*

**What stays the same:**
- Phase 1: `api_planner` call and interpretation

---

### 5. qa-perf — YAML creation with all 5 gaps

**Purpose:** Generate and validate `dq-nbomber.yaml` from the API schema.

**What changes from Phase 1:**
- Add `skills/qa-perf/references/` (5 files from nbomber-cli source)
- References used: consult `config-schema.json` for correct YAML keys; use `yaml-examples.yaml` for patterns
- Add qa-plan.md read at Step 0 (for load profile and which flows to test)
- Rewrite gap-fixing to cover all 5 gaps (currently missing Gap 2, Gap 3, Gap 4):

| Gap | Description | Phase 1 status | Phase 2 |
|-----|------------|----------------|---------|
| Gap 1 | Fake credentials in users.csv | Covered | Keep |
| Gap 2 | Body encoding for non-string fields (number/boolean become strings in YAML block mappings) | **Missing** | Add |
| Gap 3 | Capture JSONPath may be wrong (guessed paths don't match real response shape) | **Missing** | Add |
| Gap 4 | GraphQL selection sets use `{ __typename }` placeholder | **Missing** | Add |
| Gap 5 | Load simulation shape + thresholds from config | Partial | Improve |

- After all 5 gaps are fixed, run `dq-nbomber validate ./load-tests/dq-nbomber.yaml`. If validation fails, fix errors and re-validate before proceeding. Never hand an invalid config to the user.
- Closing message: *"dq-nbomber.yaml validated. Run `/qa-exec` to see how to run the load test."*

---

### 6. qa-exec — new execution orchestrator

**Purpose:** Guide and execute all domain tests in recommended order.

**Flow:**

#### Step 0 — Show execution plan
Display what will be run, in what order, and where reports will be written. Confirm with user.

#### Step 1 — API execution (automatic)
```
"Running API tests from api-test-plan.md…"
```
- Uses `test-execution` SKILL (from democratize-quality MCP):
  - Calls `api_request` for each section of api-test-plan.md
  - Chains requests (extracts tokens, IDs)
  - Calls `api_session_report` with `outputPath: <domains.api.reportDir>/api-execution-report.html` → produces HTML report
- Shows pass/fail summary inline

#### Step 2 — UI + A11y execution (automatic after API passes)
```
"API tests complete. Running UI and accessibility tests…"
```
- Runs: `a11y-cli script ui-test.yaml`
- Reads output: scan violation counts per page, interaction failures
- Calls `a11y-cli report` if not already in YAML
- Shows summary: flows tested, violations found, report path

#### Step 3 — Performance (user-run, qa-exec coaches)
```
"UI and accessibility tests complete. Ready for load testing."
```
- Shows the exact run command, emphasising that `cp .env.example .env` is a **required** step (not optional) — `dq-nbomber run` reads `BASE_URL` from `.env`:
  ```bash
  cd ./load-tests
  cp .env.example .env   # REQUIRED: sets BASE_URL for the run
  # Edit .env and set BASE_URL to your target environment
  dq-nbomber run dq-nbomber.yaml --display-console-metrics
  ```
- Asks user to fill real credentials in `data/users.csv` first
- Waits for user to share results
- Interprets p99 latency, error rate, threshold pass/fail

---

### 7. qa-report — summary consolidator

**Purpose:** Read domain execution summaries and produce `qa-summary.md`.

**What changes from Phase 1:**
- Instead of just listing file paths, reads domain report content:
  - API: reads `api_session_report` HTML or session status for pass/fail stats
  - UI/A11y: reads `<reportDir>/report.json` for violation counts per severity
  - Perf: reads dq-nbomber run output (user provides path or pastes console output)
- Consolidates into `qa-summary.md` with:
  - Executive summary (overall PASS/FAIL/WARN)
  - What was tested per domain (flows, endpoints, scenarios)
  - Key findings per domain (top violations, failures, threshold breaches)
  - Links to full HTML reports

---

## Reference Files to Add

| Skill | Source | Files |
|-------|--------|-------|
| `skills/qa-ui/references/` | accessibility-cli `skills/accessibility-cli/references/` | `audit-flows.md`, `keyboard-testing.md`, `report-generation.md`, `wcag-scanning.md` |
| `skills/qa-a11y/references/` | Same source | Same 4 files |
| `skills/qa-perf/references/` | nbomber-cli `Assets/skill/references/` | `cli-reference.md`, `config-schema.json`, `data-review.instructions.md`, `using-the-skill.md`, `yaml-examples.yaml` |

Each SKILL.md for these skills must include a line instructing Claude to read the reference files
when generating YAML:
> *"Before generating any YAML, read `references/audit-flows.md` for command syntax."*
> *"Always consult `references/config-schema.json` and `references/yaml-examples.yaml` before writing YAML."*

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `skills/qa-plan/SKILL.md` | Complete rewrite |
| `skills/qa-ui/SKILL.md` | Remove Step 4, fix YAML template, add reference reads |
| `skills/qa-a11y/SKILL.md` | Add YAML enhancer mode, add reference reads |
| `skills/qa-api/SKILL.md` | Remove Phase 2 + 3, add qa-plan.md read |
| `skills/qa-perf/SKILL.md` | Add all 5 gaps, add reference reads, add qa-plan.md read |
| `skills/qa-exec/SKILL.md` | New file — skills are auto-discovered from `skills/` dir |
| `skills/qa-report/SKILL.md` | Rewrite as summary consolidator |
| `skills/qa-ui/references/` | 4 new files (copy from accessibility-cli) |
| `skills/qa-a11y/references/` | 4 new files (copy from accessibility-cli) |
| `skills/qa-perf/references/` | 5 new files (copy from nbomber-cli) |
| `hooks/session-start` | Add qa-exec to skill index |

**No changes:** qa-setup, qa-onboard, qa-triage, qa-coverage, qa-codegen, qa-impact

---

## Progress Checklist Pattern

All skills in Phase 2 show the user a markdown checklist at the start of execution and update it
(checked vs unchecked) as steps complete. This gives users visibility into progress without requiring
them to follow along with every tool call.

### Domain skill pattern (e.g. qa-api, qa-perf, qa-ui)

At the start of each skill, output the full checklist with all items unchecked:

```
**qa-perf — progress**
- [ ] Read config (dq-qa.config.json)
- [ ] Read qa-plan.md for load profile
- [ ] Generate scaffold (dq-nbomber generate)
- [ ] Fix Gap 1 — credentials placeholder
- [ ] Fix Gap 2 — body encoding
- [ ] Fix Gap 3 — capture JSONPaths
- [ ] Fix Gap 4 — GraphQL selection sets
- [ ] Fix Gap 5 — load simulation + thresholds
- [ ] Validate YAML (dq-nbomber validate)
- [ ] Hand off to user
```

After completing each step, output an updated checklist with that item checked:

```
- [x] Read config (dq-qa.config.json)
- [x] Read qa-plan.md for load profile
- [ ] Generate scaffold (dq-nbomber generate)
...
```

### Orchestrator pattern (qa-plan, qa-exec)

Orchestrators show a domain-level checklist. Each domain item expands to show its sub-steps
once that domain starts:

```
**qa-plan — progress**
- [x] Read config
- [x] Collect requirements from user
- [ ] API planning (qa-api)
- [ ] Performance planning (qa-perf)
- [ ] UI planning (qa-ui)
- [ ] A11y scan-step enhancement (qa-a11y)
- [ ] Write qa-plan.md
```

**Implementation note for SKILL.md authors:** Instruct Claude to output the checklist as a fenced
code block or plain markdown list at each transition point. Claude cannot truly "update" previous
output — instead, output the current checklist state after each completed step so the user sees the
most recent progress.

---

## Out of Scope (Phase 2)

- qa-codegen changes
- Test code generation (Playwright/Jest files from api_generator)
- Test healing (api_healer)
- CI/CD pipeline integration
