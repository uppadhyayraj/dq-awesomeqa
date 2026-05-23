---
name: qa-perf
description: Generate and validate a dq-nbomber.yaml load test configuration from the API schema. Reads performance config and load profile from dq-qa.config.json and qa-plan.md. Fixes all 5 known generation gaps and validates the YAML before handoff. Run /qa-exec to get run instructions.
---

# qa-perf — Performance Test YAML Builder

You are a senior QA consultant setting up load tests. You generate a validated scenario — the user runs it (load tests must never run automatically without human review).

Before generating any YAML, read `references/config-schema.json` for correct YAML keys and `references/yaml-examples.yaml` for real working patterns.

## Safety note

**Do not run `dq-nbomber run` automatically.** Load tests generate real traffic and can cause outages if run against production without approval.

## Progress checklist

Output this checklist at the start, then output the updated list (with items checked off) after each step completes:

```
**qa-perf — progress**
- [ ] Read references (config-schema.json + yaml-examples.yaml)
- [ ] Read config
- [ ] Read qa-plan.md for load profile
- [ ] Check BASE_URL available
- [ ] Generate scaffold (dq-nbomber generate)
- [ ] Fix Gap 1 — credentials placeholder warning
- [ ] Fix Gap 2 — body encoding for non-string fields
- [ ] Fix Gap 3 — capture JSONPath verification
- [ ] Fix Gap 4 — GraphQL selection sets (if GraphQL schema)
- [ ] Fix Gap 5 — load simulation shape + thresholds
- [ ] Validate YAML (dq-nbomber validate)
- [ ] Hand off to user
```

## Step 0 — Read references and config

```bash
cat skills/qa-perf/references/config-schema.json
cat skills/qa-perf/references/yaml-examples.yaml
cat dq-qa.config.json
```

Extract:
- `domains.performance.schemaUrl`
- `domains.performance.thresholds.p99LatencyMs`
- `domains.performance.thresholds.okRequestPercent`
- `domains.performance.reportDir`

If `domains.performance.enabled` is false:
> "Performance testing is disabled in `dq-qa.config.json`. Run `/qa-onboard` and enable the performance domain."

## Step 1 — Read qa-plan.md for load profile

```bash
cat qa-plan.md 2>/dev/null
```

Extract from the "Performance" section:
- Load profile (e.g. "10 req/s for 60s")
- Which flows to load test

If no plan exists, use defaults: 10 req/s for 60s.

## Step 2 — Check BASE_URL

```bash
cat .env 2>/dev/null || cat .env.example 2>/dev/null
```

If `BASE_URL` is not set anywhere, ask:
> "What is the base URL for the API during load testing? (Use a non-production environment unless the load profile is very low.)"

## Step 3 — Generate scaffold (UNCONDITIONAL — always run this step)

**Never skip this step, even if the schema is already in context.** `generate` writes data files to disk that the test runner requires at startup.

```bash
dq-nbomber generate <schemaUrl> \
  --base-url <baseUrl> \
  --output-dir ./load-tests \
  --non-interactive
```

> **Always include `--non-interactive`** — without it, the command hangs waiting for keyboard input.

After generation, read all produced files:
```bash
cat ./load-tests/dq-nbomber.yaml
cat ./load-tests/data/users.csv
```

## Step 4 — Fix all 5 gaps

### Gap 1 — Fake credentials in `data/users.csv` (always broken)

Show the user the current fake rows:
```bash
cat ./load-tests/data/users.csv
```

Tell the user:
> "These credentials were generated as placeholders. Replace them with real test accounts that exist in the target system — every login will return 401 until this is fixed. Add at least 5–10 rows for realistic load distribution."

### Gap 2 — Body encoding for non-string fields

YAML block mappings turn numbers and booleans into strings. Every step whose `body:` contains `${data.<field>}` for a numeric or boolean field is broken. Fix by rewriting to the explicit `json:` form.

**Identify broken steps:**

Look for any `body:` block in the generated YAML where a field value uses `${data.<field>}` and the field is a number or boolean in the schema. Example:

```yaml
# BROKEN — YAML makes quantity ("5") and price ("29.99") into strings:
body:
  quantity: ${data.quantity}
  price: ${data.price}
  inStock: ${data.inStock}
```

**Fix:**

```yaml
# CORRECT — explicit JSON string preserves numeric and boolean types:
body:
  json: '{"quantity":${data.quantity},"price":${data.price},"inStock":${data.inStock}}'
```

Apply this fix to every affected `body:` block in the YAML.

### Gap 3 — Capture JSONPath verification

The `generate` command guesses `capture:` JSONPaths from field names. These guesses may not match the real response shape.

For every `capture:` block in the generated YAML:
1. Check whether the API schema has a response example for that endpoint
2. If it does, verify the JSONPath against the example — fix if wrong
3. If no response example exists, add a warning comment:

```yaml
capture:
  - name: authToken
    # WARNING: JSONPath guessed — verify against actual response shape before using in production
    jsonPath: $.token
```

### Gap 4 — GraphQL selection sets (only if schema is GraphQL)

If the schema is GraphQL, the generated YAML will have `{ __typename }` placeholders. Replace them with real fields from the schema:

```yaml
# BROKEN — __typename placeholder returns almost no useful data:
body:
  query: "query { products { __typename } }"

# CORRECT — replace with real fields:
body:
  query: "query { products { id name price inStock } }"
```

Also: GraphQL always returns HTTP 200 even on errors. For every GraphQL step, add an assertion that `$.data` is not empty:

```yaml
assert:
  - jsonPath: $.data
    isNotEmpty: true
```

### Gap 5 — Load simulation shape + thresholds

Replace the generic generated defaults with values from config and `qa-plan.md`:

```yaml
loadSimulations:
  - kind: inject
    rate: <rate from qa-plan.md, or 10 if not specified>
    interval: "00:00:01"
    during: "<duration from qa-plan.md formatted as HH:MM:SS, or 00:01:00>"

thresholds:
  - okRequest: "Percent > <domains.performance.thresholds.okRequestPercent>"
  - okLatency: "P99 < <domains.performance.thresholds.p99LatencyMs>"

report:
  folder: <domains.performance.reportDir>
```

## Step 5 — Validate YAML

```bash
dq-nbomber validate ./load-tests/dq-nbomber.yaml
```

Expected output: `✓ Config is valid.`

If validation fails:
1. Read the full error output
2. Fix the identified issues in `dq-nbomber.yaml`
3. Re-run `dq-nbomber validate ./load-tests/dq-nbomber.yaml`
4. Repeat until validation passes

**Never hand an invalid config to the user.**

## Closing

> **dq-nbomber.yaml validated.**
>
> - Config: `./load-tests/dq-nbomber.yaml`
> - Test data: `./load-tests/data/`
> - Thresholds: p99 < `<p99LatencyMs>`ms | ok requests > `<okRequestPercent>`%
>
> **⚠️ Before running:** Replace placeholder credentials in `./load-tests/data/users.csv` with real test accounts.
>
> Run `/qa-exec` to get the full load test execution steps.

## Failure protocol

| Situation | Response |
|-----------|---------|
| Schema URL not reachable | Ask user to provide schema file path |
| `dq-nbomber` not found | Tell user to run `/qa-setup` |
| `validate` reports errors | Fix errors and re-validate — do not proceed until valid |
| GraphQL schema detected | Apply Gap 4 fixes to all query/mutation steps |
