# dq-awesomeqa

A Claude Code plugin that guides QA engineers through the full testing lifecycle — UI, API, Accessibility, and Performance — with the expertise of a senior QA consultant.

## Prerequisites

Run `qa-setup` once per machine before using any other skill.

## Skills

| Skill | When to use |
|-------|------------|
| `/qa-setup` | Once per machine — installs CLIs and registers MCP server |
| `/qa-onboard` | Once per project — collects URLs, schema, a11y level, perf thresholds |
| `/qa-plan` | Per release — creates unified QA strategy across all domains |
| `/qa-impact` | When requirements change — adjusts the existing plan |
| `/qa-ui` | Run Playwright E2E + visual tests, generate HTML reports |
| `/qa-api` | Plan → generate → heal API tests via DQ MCP server |
| `/qa-a11y` | WCAG accessibility audit via accessibility-cli |
| `/qa-perf` | Load test scenario generation + analysis via nbomber-cli |
| `/qa-triage` | Categorize failures by severity, domain, and root cause |
| `/qa-coverage` | Find coverage gaps across all domains |
| `/qa-codegen` | Generate test code using the right tool per domain |
| `/qa-report` | Unified QA summary linking all domain reports |

## Lifecycle Flow

```
qa-setup → qa-onboard → qa-plan → [qa-ui | qa-api | qa-a11y | qa-perf]
                                         ↓
                              qa-triage / qa-coverage
                                         ↓
                                    qa-codegen
                                         ↓
                                    qa-report
```

## Phase 2 (coming)

`qa-security`, `qa-ci`, `qa-regression`, `qa-flaky`, `qa-metrics`, `qa-matrix`
