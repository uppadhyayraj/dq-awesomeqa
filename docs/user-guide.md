# dq-awesomeqa — User Guide

This guide walks QA engineers through using the dq-awesomeqa Claude Code plugin to run a complete test cycle — from first install to a signed-off QA summary.

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Install the plugin](#2-install-the-plugin)
3. [First-time machine setup](#3-first-time-machine-setup)
4. [Configure your project](#4-configure-your-project)
5. [Gather requirements](#5-gather-requirements)
6. [Build the test plan](#6-build-the-test-plan)
7. [Design tests per domain](#7-design-tests-per-domain)
8. [Execute tests](#8-execute-tests)
9. [Close the cycle](#9-close-the-cycle)
10. [Subsequent cycles](#10-subsequent-cycles)
11. [Running a single domain](#11-running-a-single-domain)
12. [Command reference](#12-command-reference)
13. [Config reference](#13-config-reference)
14. [Frequently asked questions](#14-frequently-asked-questions)

---

## 1. Prerequisites

Before installing the plugin, confirm you have:

| Requirement | Check | Notes |
|-------------|-------|-------|
| Claude Code CLI | `claude --version` | Install from https://claude.ai/code |
| Node.js ≥ 18 | `node --version` | Required for the a11y-cli tool |
| .NET 8 SDK | `dotnet --version` | Required for dq-nbomber (performance testing only) |

---

## 2. Install the plugin

Install from the Claude Code plugin marketplace:

```bash
claude plugin install dq-awesomeqa
```

Verify the install:

```bash
claude plugin list
```

You should see `dq-awesomeqa` in the list. The democratize-quality MCP server is bundled in the plugin and activates automatically — no extra `claude mcp add` command is needed.

---

## 3. First-time machine setup

Run this once per developer machine. Skip if tools are already installed.

**In any Claude Code session, type:**

```
/qa-setup
```

Claude will check which tools are installed and install any that are missing:

- **a11y-cli** — WCAG accessibility audits and Playwright browser automation
- **dq-nbomber** — Load test scenario generation and execution
- **democratize-quality MCP server** — API test planning and execution (bundled — no action needed)

After setup, Claude reports which versions are active and recommends running `/qa-onboard` next.

---

## 4. Configure your project

Run this once per project. It creates `dq-qa.config.json` which every other skill reads.

```
/qa-onboard
```

Claude asks one question at a time and explains why each answer matters:

1. **Project name** — appears in reports and the QA plan
2. **UI testing** — frontend URL, video recording preference
3. **API testing** — API base URL, schema URL or local schema file path
4. **Accessibility testing** — jurisdiction (US/EU/UK/AU/NZ/CA/INTERNATIONAL) and WCAG conformance level (A/AA/AAA)
5. **Performance testing** — p99 latency threshold (ms) and minimum ok-request percentage

**Example answers:**

```
Project name:      my-app
Frontend URL:      http://localhost:3000
API base URL:      http://localhost:8080
Schema URL:        http://localhost:8080/swagger.json
Accessibility:     yes, US, AA
Performance:       yes, p99 = 500ms, ok = 95%
```

The resulting `dq-qa.config.json` is committed to your project repo so the whole team shares the same QA configuration.

---

## 5. Gather requirements

At the start of each test cycle, capture what is being tested and why.

```
/qa-requirement
```

Claude accepts requirements in three ways — choose what works best:

- **Jira** — provide a ticket number; Claude fetches it via MCP
- **Paste** — paste a requirements doc, PRD, or release notes directly into the conversation
- **Describe** — answer Claude's guided questions about what changed and who is affected

Claude writes per-domain requirement files to the `requirements/` folder:

| File | Contents |
|------|----------|
| `requirements/shared.md` | Project context, cycle goals, team contacts |
| `requirements/api.md` | Endpoints in scope, auth scheme, categories to test |
| `requirements/ui.md` | User flows to cover, browser/OS targets, credentials needed |
| `requirements/a11y.md` | WCAG requirements, pages to audit, compliance baseline |
| `requirements/perf.md` | Load profile, endpoints to load test, performance expectations |

Only files for enabled domains are written.

---

## 6. Build the test plan

```
/qa-plan
```

Claude reads `dq-qa.config.json` and the `requirements/` folder and:

1. Identifies which domains are in scope
2. Warns if UI/Accessibility planning requires the app to be running in a browser
3. Collects any missing details from you (flows to cover, API categories, load profile)
4. Asks whether to dispatch domain planning via **parallel subagents** (faster) or guide you to run each skill manually
5. Writes `qa-plan.md` to the project root with flows, entry/exit criteria, and the recommended execution order

**`qa-plan.md` is the single source of truth** for the current cycle. All design and execution skills read it before doing anything.

---

## 7. Design tests per domain

Domain design skills build test artifacts that `/qa-exec` will run. They do **not** execute tests themselves.

### API — `api-test-plan.md`

```
/qa-api
```

Reads `qa-plan.md` for test scope and calls the DQ MCP server's `api_planner` tool against your schema. Produces `api-test-plan.md` with test scenarios grouped by endpoint.

**Requires:** API schema reachable at the URL or path in `dq-qa.config.json`.

### UI — `ui-test.yaml`

```
/qa-ui
```

Opens your app in a headed browser, explores each flow from `qa-plan.md`, and resolves real selectors by interacting with the live app. Writes a `ui-test.yaml` with every interaction step plus mandatory `report` and `close` steps.

**Requires:** App running at `domains.ui.baseUrl`.

### Accessibility — adds scan steps to `ui-test.yaml`

```
/qa-a11y
```

Run **after** `/qa-ui`. Reads `ui-test.yaml` and inserts WCAG `scan` steps after every `open` command and every navigating click. This means accessibility audits run as part of the same browser session as UI tests — no separate browser launch needed.

If no `ui-test.yaml` exists, `/qa-a11y` falls back to building a standalone audit YAML.

**Requires:** `ui-test.yaml` present (primary mode) or app running (standalone mode).

### Performance — `./load-tests/dq-nbomber.yaml`

```
/qa-perf
```

Generates a load test YAML from the API schema, applies five common generation fixes (body encoding, capture JSONPaths, GraphQL selection sets, load shape, thresholds), and validates the YAML before handing it to you.

**⚠️ Load tests must be run manually** — Claude produces the config and instructions, but never runs `dq-nbomber run` automatically because load tests generate real traffic.

**Requires:** Schema URL reachable; `dq-nbomber` installed.

### Design gap check

After design is complete for all domains:

```
/qa-coverage
```

Verifies that every domain in `qa-plan.md` has a matching test artifact. Reports gaps before you commit to execution.

---

## 8. Execute tests

```
/qa-exec
```

`qa-exec` runs all enabled domains in the recommended order and guides you through any steps requiring human involvement.

### Execution order

1. **API** — runs `api-test-plan.md` through the DQ MCP server (`api_request` calls) and generates `api-execution-report.html`
2. **UI + Accessibility** — runs `ui-test.yaml` through `a11y-cli script` — UI interactions and WCAG scans execute in the same browser session
3. **Performance** — gives you the exact `dq-nbomber run` command plus a checklist (replace placeholder credentials first); interprets results when you share the output

### Before execution starts

Claude checks that all enabled domains have their artifacts ready:

```
API: ready          ← api-test-plan.md found
UI+A11y: ready      ← ui-test.yaml found
Perf: ready         ← load-tests/dq-nbomber.yaml found
```

If any artifact is missing, Claude tells you which design skill to run first.

### Confirming execution

Claude shows the full execution plan and waits for your **"yes"** before running anything.

### Performance test — required manual steps

Before the load test runs, you must:

1. Replace placeholder credentials in `./load-tests/data/users.csv` with real test accounts (at least 5–10 rows)
2. Create `.env` from the example and set `BASE_URL`:
   ```bash
   cd ./load-tests
   cp .env.example .env
   # Edit .env: set BASE_URL=<your target environment>
   dq-nbomber run dq-nbomber.yaml --display-console-metrics
   ```
3. Share the console output with Claude — it interprets p99 latency, ok-request percentage, and error patterns against your config thresholds

---

## 9. Close the cycle

### Triage failures (if any)

```
/qa-triage
```

Share test output (paste, file path, or describe failures). Claude categorizes each failure P0–P3:

| Priority | Meaning |
|----------|---------|
| P0 | Blocks release — data loss, security issue, complete feature broken |
| P1 | Must fix soon — major feature impaired, significant user impact |
| P2 | Should fix — minor feature issue, workaround available |
| P3 | Low priority — cosmetic, edge case |

Claude cross-references failures against your API schema and requirements, identifies root causes, and writes `qa-triage.md` with recommended owners and next actions.

### Release readiness gate

```
/qa-coverage
```

Run again after execution to verify the release readiness gate:

- All planned domains were executed
- No P0 or P1 blockers remain open
- Accessibility threshold met

### QA summary

```
/qa-report
```

Consolidates all domain results into `qa-summary.md`:

- **Executive summary** — 2–3 sentences with a clear ✅ PASS / ⚠️ PASS WITH RISK / ❌ FAIL verdict
- **What was tested** — domains, flows, scenarios, load profile
- **Results by domain** — pass/fail counts, violation severities, performance thresholds
- **Key findings** — top issues per domain
- **Open items** — P0/P1 items with owners (from triage report)
- **Coverage gaps** — high-risk areas not covered this cycle
- **Report links** — links to each domain's full HTML report

Share `qa-summary.md` with stakeholders.

---

## 10. Subsequent cycles

When requirements change between cycles (new features, bug fixes, regression scope):

```
/qa-impact
```

Instead of re-running `/qa-requirement` from scratch, `/qa-impact` records **what changed** and updates the existing requirements and plan:

- Prepends a new dated section to affected `requirements/*.md` files
- Updates `qa-plan.md` with the new scope
- Flags which domains need to re-run (changed requirements → re-design → re-execute)

Then run `/qa-plan`, re-run the affected design skills, and re-run `/qa-exec`.

---

## 11. Running a single domain

You do not have to run all domains every cycle. At `/qa-plan` time, specify which domains are in scope. Design and execution skills respect that scope automatically.

**Example — API-only cycle:**

```
/qa-onboard  ← ensure API is enabled, disable UI/A11y/Perf
/qa-requirement
/qa-plan     ← tell Claude: API only this cycle
/qa-api
/qa-exec     ← only runs API domain
/qa-report
```

**Example — Accessibility audit only:**

```
/qa-plan     ← A11y only
/qa-ui       ← build the interaction script
/qa-a11y     ← add scan steps
/qa-exec     ← runs UI+A11y
/qa-triage   ← if violations found
/qa-report
```

---

## 12. Command reference

### Main STLC path

| Command | Phase | What it does | Output |
|---------|-------|-------------|--------|
| `/qa-init` | Entry | Guided STLC walkthrough with enforced phase gates | (orchestrator) |
| `/qa-setup` | Setup | Install a11y-cli, dq-nbomber; verify MCP server | — |
| `/qa-onboard` | Setup | Collect project config | `dq-qa.config.json` |
| `/qa-requirement` | Planning | Gather cycle requirements (first cycle) | `requirements/*.md` |
| `/qa-impact` | Planning | Record requirement changes (subsequent cycles) | updates `requirements/` + `qa-plan.md` |
| `/qa-plan` | Planning | Derive test strategy, dispatch domain planning | `qa-plan.md` |
| `/qa-api` | Design | Generate API test plan from schema | `api-test-plan.md` |
| `/qa-ui` | Design | Build UI interaction script via live browser | `ui-test.yaml` |
| `/qa-a11y` | Design | Add WCAG scan steps to `ui-test.yaml` | updates `ui-test.yaml` |
| `/qa-perf` | Design | Generate and validate load test config | `./load-tests/dq-nbomber.yaml` |
| `/qa-coverage` | Design / Closure | Verify design coverage or release readiness | report in conversation |
| `/qa-exec` | Execution | Execute all domains in order: API → UI+A11y → Perf | `qa-reports/` |
| `/qa-triage` | Closure | Categorize failures P0–P3, issue ship/no-ship verdict | `qa-triage.md` |
| `/qa-report` | Closure | Consolidate all results into executive summary | `qa-summary.md` |
| `/qa-codegen` | Advanced | Generate runnable test code for any domain | framework files |

### Entry point

Use `/qa-init` if you prefer a fully guided journey with enforced phase gates. It walks you through every phase, checks prerequisites at each gate, and won't let you skip steps without explicit confirmation.

Use individual skills directly if you are experienced with the lifecycle and want to move faster.

---

## 13. Config reference

`dq-qa.config.json` lives in the project root and is committed to version control.

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
      "jurisdiction": "US",
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
    "docsPath": "./requirements"
  }
}
```

**Jurisdiction values:** `US` · `EU` · `UK` · `NZ` · `AU` · `CA` · `INTERNATIONAL`

**WCAG level values:** `A` · `AA` · `AAA` (AA recommended for most projects)

---

## 14. Frequently asked questions

### Do I have to run all four domains every cycle?

No. Tell Claude at `/qa-plan` time which domains are in scope. Skills automatically skip disabled domains.

### Can I use a local schema file instead of a URL?

Yes. In `/qa-onboard`, enter a local file path (e.g. `./docs/openapi.yaml`) for the schema. Both `schemaUrl` and `schemaPath` are supported; skills prefer whichever is present.

### What schema formats are supported?

- OpenAPI 3.x (JSON or YAML)
- Swagger 2.0 (JSON or YAML)
- GraphQL (introspection endpoint or `.graphql` SDL file)

### The app isn't running yet — can I still plan?

Yes for API and Performance. No for UI and Accessibility — those skills explore the live app to discover real selectors and page flows. Wait until the app is running before invoking `/qa-ui` or `/qa-a11y`.

### Can I run `/qa-a11y` without running `/qa-ui` first?

Yes. If `ui-test.yaml` does not exist, `/qa-a11y` switches to standalone mode and builds a full audit YAML from scratch. You lose the benefit of accessibility scans embedded in real user flows, but the audit still runs.

### My load test YAML has validation errors — what do I do?

Run `/qa-perf` again. It reads the existing YAML, fixes the errors, and re-validates. The five gap fixes it applies cover the most common generation mistakes.

### Can I re-run a single domain without re-running everything?

Yes. Run the relevant design skill to refresh the artifact, then run `/qa-exec`. If only one domain changed, Claude shows an execution plan with only that domain. Confirm and proceed.

### How do I update requirements for a new feature mid-cycle?

Use `/qa-impact`. It prepends a new dated section to the affected `requirements/*.md` files, updates `qa-plan.md`, and tells you which domains need to be re-designed and re-executed.

### Where are test reports stored?

By default under `./qa-reports/`:

| Domain | Report location |
|--------|----------------|
| API | `./qa-reports/api/api-execution-report.html` |
| UI | `./qa-reports/ui/report.html` |
| Accessibility | `./qa-reports/a11y/report.html` |
| Performance | `./qa-reports/perf/` (NBomber HTML report) |
| Summary | `./qa-summary.md` (project root) |

Report directories are configured in `dq-qa.config.json` and can be changed via `/qa-onboard`.

### Can I use this plugin with CI?

The plugin runs inside Claude Code sessions, which are interactive. For CI integration, use the underlying tools directly:

- API: the democratize-quality MCP server CLI
- UI + A11y: `a11y-cli script ui-test.yaml`
- Performance: `dq-nbomber run dq-nbomber.yaml`

The YAML artifacts produced by the design skills are fully runnable without Claude Code.

### Something went wrong mid-skill — how do I restart?

Just invoke the skill again. All skills read their inputs fresh each time (config, `qa-plan.md`, existing artifacts) and pick up where the data left off. There is no persistent session state to reset.
