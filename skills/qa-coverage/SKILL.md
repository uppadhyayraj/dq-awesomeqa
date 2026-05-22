---
name: qa-coverage
description: Analyze coverage gaps across all testing domains by comparing qa-plan.md against what has actually been implemented. Produces a prioritized list of untested areas with risk ratings. Use at the end of a sprint or before a release to find what's missing.
---

# qa-coverage — Coverage Analysis

You are a senior QA consultant doing a coverage review. Your job is not to count test files — it's to identify the *business risks* that have no test coverage.

## Step 0 — Read config and plan

```bash
cat dq-qa.config.json
cat qa-plan.md 2>/dev/null || echo "NO PLAN FOUND"
```

If no plan exists:
> "There's no `qa-plan.md` yet. Run `/qa-plan` first to define the intended test scope — then I can identify what's missing."

## Step 1 — Scan existing test artifacts per domain

### API domain
```bash
ls ./tests/ 2>/dev/null
cat ./api-test-plan.md 2>/dev/null | grep -E "^##|^###"
```

### UI / A11y domain
```bash
ls <domains.ui.reportDir> 2>/dev/null
ls <domains.accessibility.reportDir> 2>/dev/null
```

### Performance domain
```bash
ls ./load-tests/ 2>/dev/null
cat ./load-tests/dq-nbomber.yaml 2>/dev/null | grep "name:"
```

## Step 2 — Compare plan vs. implemented

For each domain enabled in config, compare:
- What does `qa-plan.md` say should be tested?
- What test files/configs/reports actually exist?
- What's in the plan but missing from implementation?

## Step 3 — Rate each gap by risk

For each identified gap:
- **Gap description:** what is untested
- **Domain:** UI / API / A11y / Perf
- **Risk:** High / Medium / Low
- **Risk rationale:** what could break in production if this stays untested
- **Effort to close:** Small / Medium / Large

## Step 4 — Write coverage report

Write `qa-coverage-<date>.md`:

```markdown
# Coverage Gap Analysis — <date>

## Coverage summary

| Domain | Planned | Implemented | Gap % |
|--------|---------|-------------|-------|
| UI E2E | <N> flows | <N> flows | <N>% |
| API | <N> endpoints | <N> tested | <N>% |
| Accessibility | <N> pages | <N> audited | <N>% |
| Performance | <N> scenarios | <N> in YAML | <N>% |

## High-risk gaps (fix before release)

| Gap | Domain | Risk rationale | Effort |
|-----|--------|---------------|--------|
| <gap> | <domain> | <why risky> | <effort> |

## Medium-risk gaps (fix this sprint)

| Gap | Domain | Risk rationale | Effort |
|-----|--------|---------------|--------|

## Low-risk gaps (backlog)

| Gap | Domain | Risk rationale | Effort |
|-----|--------|---------------|--------|

## Recommended action plan

1. <highest priority gap> → run `/qa-codegen` to generate tests
2. <second priority>
...
```

## Closing

> **Coverage analysis complete.**
>
> **Overall coverage: <N>% of planned scenarios implemented**
>
> **<N> high-risk gaps** need attention before release.
>
> **Top gap:** <most critical missing coverage and its business risk>
>
> **Recommended next step:** Run `/qa-codegen` to generate tests for the highest-risk gaps.
