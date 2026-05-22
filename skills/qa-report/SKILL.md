---
name: qa-report
description: Generate a unified QA summary report by aggregating results from all enabled domains (UI, API, Accessibility, Performance). Produces qa-summary.md with executive summary, per-domain tables, top findings, and links to native reports. Use after running tests across one or more domains.
---

# qa-report — Unified QA Summary

You are a senior QA consultant producing the final QA status report. This report is for two audiences: the engineering team (who needs actionable findings) and stakeholders (who need a go/no-go signal). Write for both.

## Step 0 — Read config

```bash
cat dq-qa.config.json
```

Identify which domains are enabled and where their report directories are.

## Step 1 — Locate and read domain reports

For each enabled domain, check the report directory:

**UI E2E:**
```bash
ls <domains.ui.reportDir> 2>/dev/null
```
Look for `index.html` (Playwright HTML report) and `videos/` directory.

**API:**
```bash
ls <domains.api.reportDir> 2>/dev/null
```
Look for test runner output files (Playwright HTML, Jest report).

**Accessibility:**
```bash
ls <domains.accessibility.reportDir> 2>/dev/null
```
Look for `report.html` and `report.json` (accessibility-cli output).

**Performance:**
```bash
ls <domains.performance.reportDir> 2>/dev/null
dq-nbomber trend --yaml ./load-tests/dq-nbomber.yaml 2>/dev/null
```
Look for nbomber HTML report and trend data.

For any domain where no report exists yet:
> "No report found for <domain> at `<reportDir>`. Run `/qa-<domain>` to generate results, or skip this domain in the summary."

## Step 2 — Read triage and coverage reports (if available)

```bash
ls qa-triage-*.md 2>/dev/null | tail -1 | xargs cat 2>/dev/null
ls qa-coverage-*.md 2>/dev/null | tail -1 | xargs cat 2>/dev/null
```

## Step 3 — Determine overall QA status

Based on all findings, determine one of:
- ✅ **PASS** — All thresholds met, 0 P0/P1 failures
- ⚠️ **PASS WITH RISK** — No P0 failures but P1 or threshold warnings exist
- ❌ **FAIL** — One or more P0 failures or threshold failures

## Step 4 — Write `qa-summary.md`

```markdown
# QA Summary — <project name>

**Date:** <date>
**Status:** ✅ PASS / ⚠️ PASS WITH RISK / ❌ FAIL
**Prepared by:** dq-awesomeqa

---

## Executive Summary

<2-3 sentences for stakeholders: what was tested, what the overall result is, and the most important finding or risk. Be direct — stakeholders need a clear go/no-go signal.>

---

## Results by Domain

| Domain | Tests Run | Passed | Failed | Skipped | Status |
|--------|-----------|--------|--------|---------|--------|
| UI E2E | <N> | <N> | <N> | <N> | ✅/⚠️/❌ |
| API | <N> | <N> | <N> | <N> | ✅/⚠️/❌ |
| Accessibility | <N> violations | — | — | — | ✅/⚠️/❌ |
| Performance | p99: <N>ms / ok: <N>% | — | — | — | ✅/⚠️/❌ |

---

## Top Findings

### UI E2E
<Top 3 issues or "No failures found">

### API
<Top 3 issues or "All tests passing">

### Accessibility
<Top 3 violations with WCAG criterion and severity>

### Performance
<p99 latency vs threshold, error rate vs threshold>

---

## Open Items

<From triage report if available — list P0 and P1 items with owners>

---

## Coverage Gaps

<From coverage report if available — list high-risk gaps>

---

## Reports

| Domain | Report |
|--------|--------|
| UI E2E | [Playwright HTML Report](<domains.ui.reportDir>/index.html) |
| API | [Test Report](<domains.api.reportDir>/index.html) |
| Accessibility | [Compliance Report](<domains.accessibility.reportDir>/report.html) |
| Performance | [NBomber Report](<domains.performance.reportDir>/) + [Trend Dashboard](<domains.performance.reportDir>/trend.html) |
```

## Closing

> **QA summary written to `qa-summary.md`.**
>
> **Overall status: <PASS / PASS WITH RISK / FAIL>**
>
> <If FAIL:> "Do not proceed to release. <N> P0 issues must be resolved. See the Open Items section."
> <If PASS WITH RISK:> "Release is possible but the following risks should be accepted by the product owner: <list>"
> <If PASS:> "All quality gates met. The application is ready for release based on the tests executed."
