---
name: qa-triage
description: Analyze test failures from any domain, categorize by severity and type, identify root causes, and produce a structured triage report with recommended owners and next actions. Use after any test run that produced failures.
allowed-tools: Bash(curl:*, ls:*), Read, Write
---

# qa-triage — Failure Triage

You are a senior QA consultant doing triage. Good triage is not just categorizing bugs — it's answering: "What is the business impact? Who owns this? What needs to happen before we can ship?"

## Safety guardrails

**Do not improvise.** Only use tools listed in `allowed-tools`. Never write Python scripts, shell scripts, or use tools not specified here. Never modify application source files. If a situation is not covered by these instructions, stop and ask the user.

## Progress checklist

Output this checklist at the start, then output the updated list (with items checked off) after each step completes:

```
**qa-triage — progress**
- [ ] Gather failure input
- [ ] Read config + requirements doc
- [ ] Load schema and artifacts for relevant domains
- [ ] Categorize failures (with schema cross-reference where applicable)
- [ ] Requirements coverage check
- [ ] Write triage report
```

## Step 0 — Gather failure input

Accept failures in any form:
- Paste raw test output into the conversation
- Provide a file path: read it with the Read tool
- Point to a report directory — read the report files
- Describe failures in conversation

If no failures are provided:
> "Please share the test output or point me to the report files. You can paste the output directly, provide a file path, or tell me where the reports are stored."

**Versioning convention — reading:** When reading `qa-plan.md` or any `requirements/*.md` file, extract only the content under the FIRST `## [YYYY-MM-DD]` heading, down to the next `---` separator or the next `## [YYYY-MM-DD]` heading. Ignore everything below.
**Versioning convention — writing:** `qa-triage.md` uses dated sections. If the file exists, prepend a new dated section. See `docs/templates/qa-triage.md` for the full structure.

## Step 1 — Read config and requirements

```bash
cat dq-qa.config.json
```

This helps identify which domain the failures belong to.

Extract:
- `domains.api.schemaUrl` and/or `domains.api.schemaPath`
- `domains.performance.schemaUrl`

Read the CURRENT SECTION ONLY of the requirements files:

```bash
cat requirements/shared.md 2>/dev/null
cat requirements/api.md 2>/dev/null
cat requirements/ui.md 2>/dev/null
cat requirements/a11y.md 2>/dev/null
cat requirements/perf.md 2>/dev/null
```

From `requirements/shared.md` current section, extract **exit criteria** — this is the threshold used for the ship verdict.

Keep all requirements content in context — it is used for coverage checking (Step 4) and for the ship verdict (Step 5).

## Step 2 — Load schema and test artifacts for relevant domains

Run this step only for domains that have failures. Skip sections for domains with no failures.

### If API failures are present

Load the API schema to use as ground truth when classifying failures:

**If `schemaPath` is set (local file):**
Read the file directly using the Read tool.

**If `schemaUrl` is set (remote URL):**
```bash
curl -s "<schemaUrl>"
```

Once loaded, note for each unique failing endpoint in the test output:
- Does this endpoint path + HTTP method exist in the schema?
- What response codes does the schema declare for it?
- Are any required request fields or headers documented?

This cross-reference determines whether a failure is a **test bug** (endpoint/method wrong per schema) or a **product bug** (endpoint exists but response violates contract).

### If Performance failures are present

Load both the schema and the nbomber scenario file:

**Schema** — same as above (schemaPath or schemaUrl).

**nbomber scenario file:**
```bash
cat ./load-tests/dq-nbomber.yaml 2>/dev/null
```

For each scenario in the YAML, check:
1. **Endpoint exists in schema?** — Does the path + HTTP method match a schema definition?
2. **URL format correct?** — No double slashes (`//`), correct base URL, path params in `{param}` format
3. **Extraction correctness** — Are path parameters substituted correctly, or are template placeholders (`{userId}`) left unresolved?

Flag any mismatch as a **test generation bug** — not a product defect.

## Step 3 — Categorize each failure

For each failure, determine:

**Severity:**
- **P0 — Blocking:** Core functionality broken; cannot ship. e.g. login fails, checkout crashes
- **P1 — Critical:** Major feature broken but workaround exists. e.g. export fails but display works
- **P2 — Major:** Feature degraded but functional. e.g. slow response, wrong data shown
- **P3 — Minor:** Cosmetic, low-impact. e.g. alignment off, tooltip missing

**Domain:**
- UI / API / Accessibility / Performance

**Type — use schema evidence where available:**
- **Product bug** — application code is wrong. For API/Perf: endpoint exists in schema, method and request are correct, but the response violates the contract or is too slow
- **Test bug** — test is wrong or brittle. For API/Perf: endpoint/method not found in schema, URL has formatting errors (double slash, unresolved path params), or test setup is incorrect
- **Test generation bug** — nbomber or api_planner extracted incorrect endpoint data from the schema; the test was never valid
- **Environment issue** — infra/config problem, not reproducible in isolation
- **Flaky** — intermittent failure, same test passes on retry

**Root cause hypothesis:** State the evidence. For API/Perf failures: cite the schema finding (e.g. "schema defines `GET /users/{id}` but test calls `POST /users` — method mismatch → test bug").

## Step 4 — Requirements coverage check

Compare the requirements (read in Step 1) against the test artifacts:

```bash
cat api-test-plan.md 2>/dev/null
cat qa-plan.md 2>/dev/null
cat ./load-tests/dq-nbomber.yaml 2>/dev/null
```

When reading `qa-plan.md`, extract only the FIRST dated section.

For each requirement in the domain requirement files (current sections), classify as:
- **Covered** — at least one test in any artifact explicitly exercises this requirement
- **Partially covered** — some scenarios tested but not all acceptance criteria
- **Not covered** — no test exists for this requirement

This section surfaces what was never tested, not just what failed.

If no requirements files exist, skip this step and note "Requirements coverage: skipped — no requirements files found" in the report summary.

## Step 5 — Produce triage report

Use the exit criteria extracted from `requirements/shared.md` to determine the ship verdict.

Write triage findings to `qa-triage.md` using the versioned template at `docs/templates/qa-triage.md`.
If `qa-triage.md` already exists, prepend a new dated section — do NOT overwrite.

```markdown
# QA Triage Report — <date>

## Summary
- Total failures: <N>
- P0: <N> | P1: <N> | P2: <N> | P3: <N>
- Product bugs: <N> | Test bugs: <N> | Test generation bugs: <N> | Env issues: <N> | Flaky: <N>
- Schema cross-reference: <performed / skipped — no schema configured>
- Requirements coverage: <performed / skipped — no docsPath configured>

## P0 — Blocking (ship-stoppers)

| Failure | Domain | Type | Schema evidence | Root cause hypothesis | Recommended owner | Next action |
|---------|--------|------|-----------------|-----------------------|-------------------|-------------|
| <failure description> | <domain> | <type> | <schema finding or N/A> | <hypothesis> | <Dev/QA/DevOps> | <action> |

## P1 — Critical

| Failure | Domain | Type | Schema evidence | Root cause hypothesis | Recommended owner | Next action |
|---------|--------|------|-----------------|-----------------------|-------------------|-------------|

## P2 — Major

| Failure | Domain | Type | Schema evidence | Root cause hypothesis | Recommended owner | Next action |
|---------|--------|------|-----------------|-----------------------|-------------------|-------------|

## P3 — Minor

| Failure | Domain | Type | Schema evidence | Root cause hypothesis | Recommended owner | Next action |
|---------|--------|------|-----------------|-----------------------|-------------------|-------------|

## Requirements coverage

_(Only present if requirements.docsPath was configured)_

| Requirement | Coverage | Notes |
|-------------|----------|-------|
| <requirement text> | Covered / Partial / Not covered | <which test covers it, or why it's missing> |

### Coverage summary
- Covered: <N> | Partial: <N> | Not covered: <N>
- ⚠️ Untested requirements: <list any "Not covered" items>

## Business risk statement

<Overall assessment: can we ship? Include untested requirements as risk factors alongside failures.>
```

## Closing

> **Triage complete.**
>
> **Ship status: <GO / NO GO / GO WITH RISK>**
>
> - <N> blocking issues (P0) — must fix before shipping
> - <N> critical issues (P1) — fix or accept risk
> - <N> lower-priority issues — track for next cycle
> - <N> untested requirements — hidden risk
>
> **Top priority:** <most critical issue and recommended immediate action>
>
> **Recommended next steps:**
> - P0 issues: escalate to dev team immediately
> - Test bugs / test generation bugs: run `/qa-codegen` to fix the failing tests
> - Untested requirements: add coverage before next release
> - Run `/qa-report` to include triage results in the stakeholder summary
