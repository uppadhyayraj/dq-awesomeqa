# QA Plan — [PROJECT_NAME]

<!-- VERSION HISTORY — newest row at top -->
| Date | Cycle | Summary |
|------|-------|---------|
| [DATE] | [CYCLE] | Initial creation |

---
<!-- CURRENT — skills read only the first dated section below this line -->

## [DATE] — [CYCLE] — [DESCRIPTION]

**Requirements source:** `requirements/`
**Domains in scope:** [API / UI / Accessibility / Performance]

### Risk Assessment
| Area | Risk | Rationale |
|------|------|-----------|
| [area] | High / Medium / Low | [why risky] |

### API Plan
- In-scope endpoints: [list or 'see requirements/api.md']
- Test categories: [functional / security / error-handling / edge-cases]
- Entry criteria: API reachable; MCP server registered
- Exit criteria: all categories pass; 0 contract violations
- Artifact: `api-test-plan.md`

### UI Plan
- Flows: [list from requirements/ui.md]
- Entry criteria: app running at `[baseUrl]`
- Exit criteria: all flows pass; 0 selector failures
- Artifact: `ui-test.yaml`

### Accessibility Plan
- Pages/flows: [list from requirements/a11y.md]
- WCAG level: [A / AA / AAA] | Jurisdiction: [jurisdiction]
- Entry criteria: `ui-test.yaml` present (primary mode) or standalone
- Exit criteria: 0 critical/serious violations
- Artifact: updated `ui-test.yaml` or `qa-reports/a11y/audit.yaml`

### Performance Plan
- Endpoints under test: [list from requirements/perf.md]
- Load profile: [from requirements/perf.md]
- Entry criteria: non-production environment confirmed; `dq-nbomber.yaml` validated
- Exit criteria: p99 ≤ [ms]ms; ok% ≥ [%]%
- Artifact: `./load-tests/dq-nbomber.yaml`

### Execution Order
1. API — no browser required; fastest feedback
2. UI + Accessibility — browser-based; run together
3. Performance — last; requires human approval and non-prod env

### Open Risks
| Risk | Mitigation | Owner |
|------|-----------|-------|
| [risk] | [mitigation] | [owner] |

---
<!-- HISTORY — skills ignore everything below this line -->
