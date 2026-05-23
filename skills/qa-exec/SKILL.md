---
name: qa-exec
description: Execute all domain tests in recommended order — API → UI+Accessibility → Performance. Uses democratize-quality MCP for API execution and a11y-cli for UI/accessibility. Guides the user through performance test setup, credential requirements, and results interpretation.
---

# qa-exec — Test Execution Orchestrator

You are a senior QA consultant running a complete test cycle. Execute automated tests, interpret results, and guide the user through the manual steps that require human oversight.

## Progress checklist

Output this checklist at the start, then output the updated list (with items checked off) after each step completes:

```
**qa-exec — progress**
- [ ] Read config and qa-plan.md
- [ ] Check domain artifacts exist
- [ ] Show execution plan — confirm with user
- [ ] Step 2: Execute API tests
- [ ] Step 3: Execute UI + Accessibility tests
- [ ] Step 4: Guide Performance test run
```

## Step 0 — Read config and check artifacts

```bash
cat dq-qa.config.json
cat qa-plan.md 2>/dev/null
```

Check which artifacts are present:

```bash
ls api-test-plan.md 2>/dev/null && echo "API: ready" || echo "API: missing (run /qa-api)"
ls ui-test.yaml 2>/dev/null && echo "UI+A11y: ready" || echo "UI+A11y: missing (run /qa-ui, then optionally /qa-a11y)"
ls ./load-tests/dq-nbomber.yaml 2>/dev/null && echo "Perf: ready" || echo "Perf: missing (run /qa-perf)"
```

If any enabled domain is missing its artifact:
> "The <domain> artifact is missing. Run `/qa-<domain>` to create it before executing."

## Step 1 — Show execution plan and confirm

> **Execution plan:**
>
> 1. **API** — execute all sections from `api-test-plan.md` using the DQ MCP server → `<domains.api.reportDir>/api-execution-report.html`
> 2. **UI + Accessibility** — run `a11y-cli script ui-test.yaml` → `<domains.ui.reportDir>/report.html`
> 3. **Performance** — you will run `dq-nbomber run` (I'll give you the exact command and steps)
>
> Shall I proceed?

Wait for confirmation before executing anything.

## Step 2 — Execute API tests

Tell the user:
> "Running API tests from `api-test-plan.md`…"

Follow the test-execution skill pattern:

1. Read `api-test-plan.md` — parse all sections (each `##` header = one endpoint test group)
2. Create a unique session: `test-execution-api-<timestamp>`
3. For each section:
   - Extract the HTTP method, endpoint, expected status, request body, and headers
   - Execute via `api_request`:
     ```javascript
     await tools.api_request({
       sessionId: sessionId,
       method: "<method>",
       url: "<baseUrl><endpoint>",
       headers: { /* from test plan */ },
       data: { /* from test plan body */ },
       expect: { status: <expectedStatus> },
       extract: { /* chain token/ID to next request if needed */ }
     })
     ```
   - Chain extracted variables (tokens, IDs) into subsequent requests using `{{variableName}}`
4. After all sections, generate the HTML report:
   ```javascript
   await tools.api_session_report({
     sessionId: sessionId,
     outputPath: "<domains.api.reportDir>/api-execution-report.html"
   })
   ```

Show inline summary:
> "API tests complete: <N> passed, <N> failed. Report at `<reportDir>/api-execution-report.html`."

If tests fail:
> "⚠️ <N> API tests failed. Review the report before continuing. Proceed to UI tests anyway? (Yes/No)"

## Step 3 — Execute UI + Accessibility tests

Tell the user:
> "Running UI and accessibility tests…"

Check which test file is available before running:

If `ui-test.yaml` is present, run:
```bash
a11y-cli script ui-test.yaml
```

If `ui-test.yaml` is not present, check for a standalone a11y audit file (produced by `/qa-a11y` when UI is disabled):
```bash
ls <domains.accessibility.reportDir>/audit.yaml 2>/dev/null
```
- If found, run: `a11y-cli script <domains.accessibility.reportDir>/audit.yaml`
- If not found, report: "No UI or A11y test file found. Run `/qa-ui` or `/qa-a11y` to create the test script."

Read the command output and report:
- How many interaction steps completed
- How many failed (with step name and reason)
- Accessibility violation counts by severity (from scan step output)

Show summary:
> "UI + Accessibility complete:
> - Interactions: <N>/<N> steps passed
> - A11y violations: <N> critical, <N> serious, <N> moderate, <N> minor
> - Report: `<domains.ui.reportDir>/report.html`"

If there are failures:
- Describe each: step name, what failed, likely cause
- Recommend: run `/qa-triage` to categorize and assign failures

## Step 4 — Guide Performance test run

Tell the user:
> "UI and accessibility tests complete. Ready for load testing."

> **⚠️ Load tests generate real traffic. Run against a non-production environment only.**
>
> **Step 1 — Add real credentials:**
> Edit `./load-tests/data/users.csv` — replace placeholder rows with real test accounts (5–10 rows minimum).
>
> **Step 2 — Run the load test:**
> ```bash
> cd ./load-tests
> cp .env.example .env    # REQUIRED: this creates the .env file that dq-nbomber reads for BASE_URL
> # Now edit .env and set BASE_URL=<your target environment URL>
> dq-nbomber run dq-nbomber.yaml --display-console-metrics
> ```
>
> Share the console output or the report path when done and I'll interpret the results.

When the user shares results, interpret:
- Did all thresholds pass or fail? (compare p99 and ok% against config thresholds)
- Which steps had the worst p99 latency and why?
- What is the error rate and what error types appeared?
- What does this mean for the system's capacity?
- Recommended action: scale, optimize query, or acceptable?

## Closing

> **Test execution complete.**
>
> Run `/qa-report` to consolidate all domain results into a unified `qa-summary.md`.
> Run `/qa-triage` if there are failures to categorize and assign.

## Failure protocol

| What failed | What to do |
|-------------|-----------|
| `api_request` returns 401 | Check auth section in `api-test-plan.md`; verify credentials |
| `a11y-cli` not found | Tell user to run `/qa-setup` |
| `a11y-cli script` fails on step N | Report step name and reason; suggest running with `--headed` for visual debugging |
| `dq-nbomber validate` error on run | Tell user to run `/qa-perf` to fix YAML before executing |
| MCP server not found | Tell user to run `/qa-setup` to register the democratize-quality MCP server |
