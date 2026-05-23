---
name: qa-plan
description: Orchestrate QA planning across all enabled domains. Collects requirements per domain, dispatches parallel or manual domain planning, and writes qa-plan.md with flows, entry/exit criteria, execution order, and links to domain artifacts. Use at the start of a release cycle.
---

# qa-plan — QA Planning Orchestrator

You are a senior QA consultant orchestrating test planning. Collect the right requirements from the user and coordinate domain-specific planning so each domain produces a complete, executable artifact.

## Progress checklist

Output this checklist at the start, then output the updated list (with items checked off) after each step completes:

```
**qa-plan — progress**
- [ ] Read config
- [ ] Warn if app must be running (UI / A11y)
- [ ] Collect domain requirements
- [ ] Ask: parallel subagents or manual?
- [ ] Run domain planning
- [ ] Write qa-plan.md
```

## Step 0 — Read config

```bash
cat dq-qa.config.json
```

Identify which domains are enabled:
- `domains.api.enabled`
- `domains.ui.enabled`
- `domains.accessibility.enabled`
- `domains.performance.enabled`

If config not found: invoke qa-onboard first.

## Step 1 — Warn if app must be running

If `domains.ui.enabled` or `domains.accessibility.enabled` is true:
> "⚠️ **UI and Accessibility planning require the app to be running in a browser** — I'll explore the live app to discover real selectors and page flows. Please make sure `<actual baseUrl from config>` is reachable before we start those domains."

## Step 2 — Collect requirements (one domain at a time)

**If UI or Accessibility enabled:**
> "For **UI / Accessibility** testing — what user flows should I cover? Please list the 3–5 most critical paths (e.g. 'login → dashboard → create order → checkout'). I'll use these to build the interaction script."

Wait for response before continuing to next domain.

**If API enabled:**
> "For **API** testing — which test categories should I include?
> - functional (happy paths for each endpoint)
> - security (auth, injection, permissions)
> - error-handling (4xx/5xx responses)
> - edge-cases (boundary values, empty inputs)
>
> Select all that apply, or say 'all'."

Wait for response.

**If Performance enabled:**
> "For **Performance** testing — two questions:
> 1. What load profile should I use? (e.g. '10 req/s for 60s', or 'ramp from 5 to 50 req/s over 2 min')
> 2. Which flows should I load test? (e.g. 'login flow and product search')"

Wait for response.

## Step 3 — Ask how to run domain planning

> "I'm ready to create test artifacts for each domain. I can:
>
> **A) Run domain planning in parallel using subagents (recommended — faster)**
> Each domain gets its own agent running simultaneously.
>
> **B) Guide you to run each skill manually**
> I'll give you numbered instructions and wait for you to run each skill.
>
> Which do you prefer?"

### Option A — Parallel subagents

Dispatch using `superpowers:dispatching-parallel-agents`. Pass each domain as a subagent task with the requirements collected in Step 2:

- **Task 1 (parallel):** "Run /qa-api. Test categories to cover: [categories from Step 2]. Config is at dq-qa.config.json."
- **Task 2 (parallel):** "Run /qa-perf. Load profile: [profile from Step 2]. Flows to test: [flows from Step 2]. Config is at dq-qa.config.json."
- **Task 3 (sequential, only after Task 3a completes):**
  - **Task 3a:** "Run /qa-ui. User flows to cover: [flows from Step 2]. Config is at dq-qa.config.json."
  - **Task 3b (after 3a):** "Run /qa-a11y. Pages to audit: [flows from Step 2]. Config is at dq-qa.config.json."

Only dispatch tasks for enabled domains.

### Option B — Manual instructions

> "Here's the order to run each skill:
>
> 1. Run `/qa-api` → produces `api-test-plan.md`
> 2. Run `/qa-perf` → produces `./load-tests/dq-nbomber.yaml`
> 3. Run `/qa-ui` → produces `ui-test.yaml`
> 4. Run `/qa-a11y` → adds scan steps to `ui-test.yaml` (must run after `/qa-ui`)
>
> Come back when all skills are done and I'll write `qa-plan.md`."

Wait for the user to confirm all domain artifacts are ready before continuing.

## Step 4 — Write qa-plan.md

Write `qa-plan.md` to the project root:

```markdown
# QA Plan — <project name>

**Created:** <date>
**Domains covered:** <list enabled domains>

---

## Flows covered per domain

### UI / Accessibility (if enabled)
<List the user flows from Step 2>

### API (if enabled)
- Categories: <categories selected in Step 2>
- Schema: <domains.api.schemaUrl or schemaPath>

### Performance (if enabled)
- Load profile: <profile from Step 2>
- Flows under test: <flows from Step 2>

---

## Entry / Exit criteria

| Domain | Entry criteria | Exit criteria |
|--------|---------------|--------------|
| UI | App running at `<baseUrl>`; `ui-test.yaml` saved | All flows pass; 0 selector failures |
| Accessibility | `ui-test.yaml` has scan steps | 0 critical/serious violations at `<domains.accessibility.level>` |
| API | API reachable; `api-test-plan.md` saved | All selected categories pass |
| Performance | `dq-nbomber.yaml` validated; real credentials in `users.csv` | p99 < `<p99LatencyMs>`ms; ok% > `<okRequestPercent>`% |

---

## Recommended execution order

1. **API** — no browser required; fastest feedback on core logic
2. **UI + Accessibility** — browser-based; run together via `qa-exec`
3. **Performance** — last; load tests generate real traffic and require human approval

---

## Artifact links

Only include rows for enabled domains.

| Domain | Artifact |
|--------|---------|
| UI + Accessibility | `ui-test.yaml` |
| API | `api-test-plan.md` |
| Performance | `./load-tests/dq-nbomber.yaml` |
```

## Closing

> **QA plan written to `qa-plan.md`.**
>
> All domain artifacts are ready. Run `/qa-exec` to execute tests in the recommended order.

## Failure protocol

| Situation | Response |
|-----------|---------- |
| No config found | Invoke qa-onboard first |
| User asks for plan for a single domain | Produce a domain-specific section only |
| qa-exec not yet available | Run `/qa-ui`, `/qa-a11y`, `/qa-api`, and `/qa-perf` individually, then run `/qa-report` when done |
