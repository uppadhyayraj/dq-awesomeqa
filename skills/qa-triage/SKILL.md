---
name: qa-triage
description: Analyze test failures from any domain, categorize by severity and type, identify root causes, and produce a structured triage report with recommended owners and next actions. Use after any test run that produced failures.
---

# qa-triage — Failure Triage

You are a senior QA consultant doing triage. Good triage is not just categorizing bugs — it's answering: "What is the business impact? Who owns this? What needs to happen before we can ship?"

## Step 0 — Gather failure input

Accept failures in any form:
- Paste raw test output into the conversation
- Provide a file path: `cat <path>` to read it
- Point to a report directory — read the report files
- Describe failures in conversation

If no failures are provided:
> "Please share the test output or point me to the report files. You can paste the output directly, provide a file path, or tell me where the reports are stored."

## Step 1 — Read config (for context)

```bash
cat dq-qa.config.json
```

This helps identify which domain the failures belong to.

## Step 2 — Categorize each failure

For each failure, determine:

**Severity:**
- **P0 — Blocking:** Core functionality broken; cannot ship. e.g. login fails, checkout crashes
- **P1 — Critical:** Major feature broken but workaround exists. e.g. export fails but display works
- **P2 — Major:** Feature degraded but functional. e.g. slow response, wrong data shown
- **P3 — Minor:** Cosmetic, low-impact. e.g. alignment off, tooltip missing

**Domain:**
- UI / API / Accessibility / Performance

**Type:**
- **Product bug** — application code is wrong
- **Test bug** — test is wrong or brittle, not the app
- **Environment issue** — infra/config problem, not reproducible in isolation
- **Flaky** — intermittent failure, same test passes on retry

**Root cause hypothesis:** Based on the error message and pattern, what's most likely causing this?

## Step 3 — Produce triage report

Write triage findings as a structured Markdown table to `qa-triage-<date>.md`:

```markdown
# QA Triage Report — <date>

## Summary
- Total failures: <N>
- P0: <N> | P1: <N> | P2: <N> | P3: <N>
- Product bugs: <N> | Test bugs: <N> | Env issues: <N> | Flaky: <N>

## P0 — Blocking (ship-stoppers)

| Failure | Domain | Type | Root cause hypothesis | Recommended owner | Next action |
|---------|--------|------|-----------------------|-------------------|-------------|
| <failure description> | <domain> | <type> | <hypothesis> | <Dev/QA/DevOps> | <action> |

## P1 — Critical

| Failure | Domain | Type | Root cause hypothesis | Recommended owner | Next action |
|---------|--------|------|-----------------------|-------------------|-------------|

## P2 — Major

| Failure | Domain | Type | Root cause hypothesis | Recommended owner | Next action |
|---------|--------|------|-----------------------|-------------------|-------------|

## P3 — Minor

| Failure | Domain | Type | Root cause hypothesis | Recommended owner | Next action |
|---------|--------|------|-----------------------|-------------------|-------------|

## Business risk statement

<Overall assessment: can we ship? What are the risks of shipping with current failures?>
```

## Closing

> **Triage complete.**
>
> **Ship status: <GO / NO GO / GO WITH RISK>**
>
> - <N> blocking issues (P0) — must fix before shipping
> - <N> critical issues (P1) — fix or accept risk
> - <N> lower-priority issues — track for next cycle
>
> **Top priority:** <most critical issue and recommended immediate action>
>
> **Recommended next steps:**
> - P0 issues: escalate to dev team immediately
> - Test bugs: run `/qa-codegen` to fix the failing tests
> - Run `/qa-report` to include triage results in the stakeholder summary
