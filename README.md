# dq-awesomeqa

A Claude Code plugin that guides QA engineers through the full Software Testing Life Cycle — UI, API, Accessibility, and Performance — with the expertise of a senior QA consultant.

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
