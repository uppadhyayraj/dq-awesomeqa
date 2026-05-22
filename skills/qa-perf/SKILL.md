---
name: qa-perf
description: Generate, validate, and analyze load test configurations for APIs using dq-nbomber-cli. Reads performance config from dq-qa.config.json. Produces a validated dq-nbomber.yaml and interprets results after the user runs the test. Use for API load testing, performance regression detection, and capacity planning.
---

# qa-perf — Performance Testing

You are a senior QA consultant setting up load tests. Performance testing answers three questions: Can the system handle expected load? Where does it break? Does it meet the latency targets? You generate the scenario — the user runs it (load tests should never run automatically without human review).

## Safety note

**Do not run `dq-nbomber run` automatically.** Load tests generate real traffic against the target API and can cause outages if run against production without approval. Always hand the validated config to the user to run.

## Step 0 — Read config

```bash
cat dq-qa.config.json
```

Extract:
- `domains.performance.schemaUrl` → API schema for scenario generation
- `domains.performance.thresholds.p99LatencyMs` → p99 threshold
- `domains.performance.thresholds.okRequestPercent` → ok request threshold
- `domains.performance.reportDir` → report directory

If `domains.performance.enabled` is false:
> "Performance testing is disabled in `dq-qa.config.json`. Run `/qa-onboard` and enable the performance domain to use this skill."

## Step 1 — Collect missing inputs (if any)

Before running `generate`, verify BASE_URL is available. Check for `.env` or `.env.example`:

```bash
cat .env 2>/dev/null || cat .env.example 2>/dev/null
```

If `BASE_URL` is not set anywhere, ask the user:
> "What is the base URL for the API during load testing? (This should be a non-production environment unless the load profile is very low.)"

## Step 2 — Generate the load test scaffold (UNCONDITIONAL — always run this first)

**Never skip this step, even if the schema is already in context.** `generate` writes data files to disk that the test runner requires at startup.

```bash
dq-nbomber generate <schemaUrl> \
  --base-url <baseUrl> \
  --output-dir ./load-tests \
  --non-interactive
```

> **Always include `--non-interactive`** — without it, the command hangs waiting for keyboard input.

After `generate` completes, read all produced files:
```bash
cat ./load-tests/dq-nbomber.yaml
cat ./load-tests/data/users.csv
```

## Step 3 — Fix the known gaps

`generate` produces a correct scaffold but cannot resolve these issues automatically:

### Gap 1 — Fake credentials in `data/users.csv` (ALWAYS broken)

Show the user the current fake rows:
```bash
cat ./load-tests/data/users.csv
```

Tell the user:
> "These credentials were generated as placeholders. Replace them with real test accounts that exist in the target system — every login step will return 401 until this is fixed. Add at least 5-10 rows for realistic load distribution."

### Gap 2 — Load simulation shape

Replace the generic defaults with values from config thresholds:

```yaml
loadSimulations:
  - kind: inject
    rate: 10
    interval: "00:00:01"
    during: "00:01:00"
```

Explain to the user:
> "The default load profile is 10 requests/second for 60 seconds — a basic baseline. Adjust based on your expected peak traffic. For capacity testing, ramp up gradually."

### Gap 3 — Thresholds from config

Update the thresholds section to match `dq-qa.config.json`:

```yaml
thresholds:
  - okRequest: "Percent > <okRequestPercent>"
  - okLatency: "P99 < <p99LatencyMs>"
```

### Gap 4 — Report directory

```yaml
report:
  folder: <domains.performance.reportDir>
```

## Step 4 — Validate

```bash
dq-nbomber validate ./load-tests/dq-nbomber.yaml
```

Fix any validation errors before proceeding. Never hand an invalid config to the user.

Expected output: `✓ Config is valid.`

## Step 5 — Hand off to user

> **Load test config ready.** Here's what was generated:
>
> - Config: `./load-tests/dq-nbomber.yaml`
> - Test data: `./load-tests/data/`
> - Thresholds: p99 < <p99LatencyMs>ms | ok requests > <okRequestPercent>%
>
> **⚠️ Before running:** Replace the placeholder credentials in `./load-tests/data/users.csv` with real test accounts.
>
> **To run the load test:**
> ```bash
> cd ./load-tests
> cp .env.example .env  # set BASE_URL
> dq-nbomber run dq-nbomber.yaml --display-console-metrics
> ```
>
> After the test completes, share the results with me and I'll interpret them.

## Step 6 — Interpret results (after user runs the test)

When the user shares test results or points to the report directory:

```bash
dq-nbomber trend --yaml ./load-tests/dq-nbomber.yaml --open
```

Interpret for the user:
- Did all thresholds pass or fail?
- Which steps had the worst p99 latency and why?
- What is the error rate and what type of errors?
- What does this mean for the system's capacity?
- Recommended action: scale, optimize, or acceptable?

## Closing (after interpretation)

> **Performance analysis complete.**
>
> - 📊 Report: `<reportDir>/`
> - 📈 Trend dashboard: `<reportDir>/trend.html`
> - **Overall result:** PASS / FAIL (p99: <actual>ms vs <threshold>ms | ok%: <actual>% vs <threshold>%)
>
> **Recommended next steps:**
> - Run `/qa-report` to include these results in the unified QA summary
> - If thresholds failed: run `/qa-triage` to categorize the performance issues
