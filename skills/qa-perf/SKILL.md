---
name: qa-perf
description: Generate and validate a dq-nbomber.yaml load test configuration. Collects API schema file, BASE_URL, and load parameters before running generate, then fixes the 5 known generation gaps, reviews data files, and validates the YAML before handoff. Does not run the test — run /qa-exec for execution steps.
---

# qa-perf — Performance Test YAML Builder

You are a senior QA consultant setting up load tests. Your job is to produce a validated `dq-nbomber.yaml` that the user can run. Never write the YAML from scratch — always use `generate` first.

Before generating any YAML, read `references/config-schema.json` for correct YAML keys and `references/yaml-examples.yaml` for working patterns.

## Safety note

**Do not run `dq-nbomber run` automatically.** Load tests generate real traffic and can cause outages if run against production without approval.

## Progress checklist

Output this checklist at the start, then re-emit with `[x]` after each step completes:

```
**qa-perf — progress**
- [ ] Read references (config-schema.json + yaml-examples.yaml)
- [ ] Read config + qa-plan.md
- [ ] Collect schema file (REQUIRED)
- [ ] Collect BASE_URL (REQUIRED)
- [ ] Collect load parameters
- [ ] Generate scaffold (dq-nbomber generate)
- [ ] Review generated data files
- [ ] Fix Gap 1 — fake credentials
- [ ] Fix Gap 2 — body encoding (type analysis first)
- [ ] Fix Gap 3 — capture JSONPath verification
- [ ] Fix Gap 4 — GraphQL selection sets (if GraphQL)
- [ ] Fix Gap 5 — load simulation shape + thresholds (inside scenario)
- [ ] Validate YAML (dq-nbomber validate)
- [ ] Hand off to user
```

## Step 0 — Read references and config

```bash
cat skills/qa-perf/references/config-schema.json
cat skills/qa-perf/references/yaml-examples.yaml
cat dq-qa.config.json
```

Extract from config:
- `domains.performance.thresholds.p99LatencyMs`
- `domains.performance.thresholds.okRequestPercent`
- `domains.performance.reportDir`
- `domains.performance.schemaUrl` — note if set; use as a candidate path for the schema below

If `domains.performance.enabled` is false:
> "Performance testing is disabled in `dq-qa.config.json`. Run `/qa-onboard` and enable the performance domain."

## Step 1 — Read qa-plan.md

```bash
cat qa-plan.md 2>/dev/null
```

Extract from the "Performance" section:
- Load profile (e.g. "10 req/s for 60s")
- Which flows to load test

---

## MANDATORY — Collect before running generate

**STOP. Do not run `dq-nbomber generate` until you have resolved all three inputs below.**

### Input 1 — API Schema (REQUIRED)

`generate` requires a schema to produce the scaffold. Accept any of these forms:
- A **local file path**: `openapi.yaml`, `swagger.json`, `apiSchema.json`, `schema.graphql`, etc.
- A **`#file:` attachment**: extract the file path from the attachment; use that path as the spec argument
- A **live GraphQL URL**: pass directly; `generate` fetches the schema via introspection

First, try to locate the schema yourself:

```bash
# Look in the project root for common schema file names
ls openapi.yaml openapi.json swagger.json swagger.yaml apiSchema.json schema.graphql schema.gql 2>/dev/null
```

If `domains.performance.schemaUrl` is set in config, check if it is a local file path:
```bash
ls <domains.performance.schemaUrl> 2>/dev/null
```

If a schema file is found, confirm it with the user:
> "Found schema at `<path>`. Using this for `generate` — correct?"

If **no schema is found**, ask before proceeding:
> "Please share the path to your API schema file (OpenAPI `.yaml`/`.json`, GraphQL `.graphql`/`.gql`, or a live GraphQL endpoint URL for introspection)."

### Input 2 — BASE_URL (REQUIRED)

Accept from: the user's message, `.env`, `.env.example`, `.env.local` (look for `BASE_URL=`, `API_URL=`, `SERVER_URL=`).

```bash
cat .env 2>/dev/null || cat .env.example 2>/dev/null
```

If `BASE_URL` is not found anywhere, ask:
> "What is the base URL for the API during load testing? (Use a non-production environment unless the load profile is very low — e.g. `http://localhost:3000`)"

### Input 3 — Load Parameters (collect and hold for Gap 5)

Load parameters may come from: qa-plan.md (Step 1), the user's message, or config thresholds.

If none are available, ask:
> "What are your load targets?
> - Requests/second or concurrent users?
> - Test duration?
> - Pass/fail thresholds (e.g. p99 < 500ms, error rate < 1%)?"

**Do not pass load parameters to `generate`** — the command does not accept them. Record them and apply as YAML edits in Gap 5.

Also note any endpoint filters the user mentions (e.g. "only test checkout", "skip admin"):
- "only test X and Y" → `--include "METHOD /path,METHOD /path"`
- "skip Z" → `--exclude "METHOD /path"`

---

## Step 2 — Generate scaffold (UNCONDITIONAL — always run this first)

**Never skip this step, even if the full schema content is in context.** `generate` writes data files to disk that the test runner requires at startup. Writing YAML from scratch produces no data files.

```bash
dq-nbomber generate <schema-path-or-url> \
  --base-url <baseUrl> \
  --output-dir ./load-tests \
  --non-interactive
```

> **Always include `--non-interactive`** — without it, the command waits for keyboard input and hangs.

Additional flags based on user input:

| User says | Flag to add |
|---|---|
| "only test X and Y endpoints" | `--include "METHOD /path,METHOD /path"` |
| "skip admin / skip Z" | `--exclude "METHOD /path"` |
| "generate more test data rows" | `--data-records 20` (default is 10) |
| GraphQL endpoint at non-standard path | `--graphql-path /api/graphql` |

After `generate` completes, read all produced files before proceeding:

```bash
cat ./load-tests/dq-nbomber.yaml
cat ./load-tests/data/users.csv
ls ./load-tests/data/
```

---

## Step 3 — Review generated data files

Before fixing the YAML, review every file in `./load-tests/data/` against the API schema.

For each data file, identify which endpoint's schema it feeds. Then check:

1. **Type correctness** — `number`/`boolean`/`array` fields must be correct JSON types, not strings
2. **String format compliance** — fields with `format: phone`, `format: postal_code`, etc. get `faker.Lorem.Word()` values (random words) — these will fail server validation; replace with realistic values
3. **Enum values** — every value must be a member of the declared enum; case sensitive
4. **Required fields present** — every record must have all `required[]` fields
5. **Length constraints** — check `minLength`/`maxLength` violations
6. **Realistic values** — all records identical → server caching may mask real load; fake IDs (`prod_123`) → 404 on every request if API validates referential integrity

Report findings and fix directly in the data files before continuing. See `skills/qa-perf/references/data-review.instructions.md` for the full review checklist.

---

## Step 4 — Fix all 5 gaps

`generate` produces a structurally correct scaffold but cannot resolve these five issues automatically. Work through each one in order.

### Gap 1 — Fake credentials in `data/users.csv` (always broken)

`generate` populates `data/users.csv` with Bogus-generated credentials that **do not exist in the target system**. Every login returns `401` until this is fixed.

Show the current fake rows:
```bash
cat ./load-tests/data/users.csv
```

Tell the user:
> "These credentials were generated as placeholders. Replace them with real test accounts that exist in `<base_url>`. Add at least 5–10 rows for realistic load distribution."

If the user provides real credentials, update `data/users.csv` directly.

If the API has a registration endpoint, offer to add a registration step as the first step in the scenario using `strategy: unique` on the users feed so each virtual user registers a different account.

### Gap 2 — Body encoding for non-string fields (always broken for numeric/boolean APIs)

`generate` emits request body fields as a YAML block mapping. At runtime, YAML deserialises all scalar values as strings — `quantity: 1` becomes `"1"`. The server receives strings and fails validation.

**Type analysis first — read the schema for every step with a `body:`:**

For each step, resolve any `$ref` in the requestBody schema and build a field-type table:

| Field | Schema type | Problem? |
|---|---|---|
| `quantity` | number | YES — will become `"1"` |
| `price` | number | YES — will become `"9.99"` |
| `active` | boolean | YES — will become `"true"` |
| `username` | string | No — strings are fine |

If **any** field is `number`, `boolean`, or `array`, rewrite the entire `body.json:` for that step as a **quoted JSON string** that preserves types:

```yaml
# BEFORE (broken — YAML makes numbers into strings)
body:
  json:
    productId: "${data.addtocart.productId}"
    quantity: 1
    price: 9.99

# AFTER (correct — quoted string preserves types)
body:
  json: '{"productId":"${data.addtocart.productId}","quantity":${data.addtocart.quantity},"price":${data.addtocart.price}}'
```

If all fields are strings (usernames, emails, passwords, IDs), the block mapping is safe — no change needed.

> **NEVER use `body.raw:`** — it sends `Content-Type: text/plain` and the server ignores the body. Always use `body.json:` for JSON APIs.

### Gap 3 — Capture JSONPath verification

`generate` guesses capture paths for the login step — these are common patterns but may not match the actual API response shape.

**What to do:**

1. Read the API schema's `responses.200.content.schema` for the login endpoint
2. Resolve all `$ref` chains to find the actual response object
3. Map the correct JSONPath for each captured field:

```
Login response: { data: { token: string, user: { id: string } } }
  → $.data.token          (not $.token)
  → $.data.user.id        (not $.data.id)
```

4. Update the `capture:` block with the verified paths
5. **Always add `default: ""`** on every capture — prevents null propagation if the path misses:

```yaml
capture:
  - jsonPath: $.data.token
    as: authToken
    default: ""
  - jsonPath: $.data.user.id
    as: userId
    default: ""
```

If the schema has **no response example** for the login endpoint — do not add a warning comment and proceed. Instead, stop and ask the user:

> "The API schema has no response example for the login endpoint. What does the actual login response JSON look like? I need it to verify the capture JSONPaths."

Wait for the user's response before updating captures. A wrong JSONPath silently returns the default and every downstream step that uses `${capture.userId}` will fail with a missing ID.

For GraphQL: capture paths are always `$.data.<operationName>.<field>` — never `$.token` directly.

### Gap 4 — GraphQL selection sets (only if schema is GraphQL)

`generate` writes `{ __typename }` for every GraphQL operation that returns a complex type. `__typename` returns only the type name — it cannot be used in captures and tests nothing about business logic.

Read the GraphQL schema's type definition for the return type of each operation and replace `{ __typename }` with real fields:

```yaml
# BEFORE
query: "query GetUser($id: ID!) { getUser(id: $id) { __typename } }"

# AFTER
query: "query GetUser($id: ID!) { getUser(id: $id) { id name email role createdAt } }"
```

Also add `$.data` assertions to every GraphQL step — GraphQL always returns HTTP 200 even on errors:

```yaml
assert:
  - jsonPath: $.data
    notEmpty: "true"
```

### Gap 5 — Load simulation shape + thresholds

`generate` emits generic defaults. Replace with values from the load parameters collected before running `generate`.

**First, apply any load parameters the user stated.** Translate natural language to YAML `kind`:

| User says | `kind` | Fields to set |
|---|---|---|
| "inject rate 1 for 10 seconds" | `inject` | `rate: 1`, `interval: "00:00:01"`, `during: "00:00:10"` |
| "50 concurrent users for 2 minutes" | `keepConstant` | `copies: 50`, `during: "00:02:00"` |
| "ramp up to 100 VUs" | `rampingKeepConstant` | `copies: 100`, `during: <ramp duration>` |
| "ramp inject to 50 rps" | `rampingInject` | `rate: 50`, `interval: "00:00:01"`, `during: <duration>` |

If the user did not specify load parameters, ask:
> "What are your load targets?
> - Requests/second or concurrent users?
> - Test duration?
> - Pass/fail thresholds (e.g. p99 < 500ms, error rate < 1%)?"

**Correct YAML structure:**

```yaml
scenarios:
  - name: <scenario name>
    steps: [...]
    dataFeeds: [...]
    loadSimulations:
      - kind: inject
        rate: <rate from user or qa-plan.md, default 10>
        interval: "00:00:01"
        during: "<HH:MM:SS from user or qa-plan.md, default 00:01:00>"
    thresholds:                                 # ← MUST be inside the scenario block
      - okRequest: "Percent > <okRequestPercent from config>"
      - okLatency: "P99 < <p99LatencyMs from config>"
```

> **CRITICAL — `thresholds:` MUST be nested inside the scenario block.**
> A root-level `thresholds:` is silently ignored — the run always reports "All thresholds passed" even when 100% of requests fail.

Also set a `report` block at the root level (not inside the scenario):
```yaml
report:
  folder: <domains.performance.reportDir>
```

**Common threshold metrics:**
- `okRequest: "Percent > 99"` — at least 99% of requests must succeed
- `okLatency: "P99 < 500"` — 99th percentile latency under 500ms
- `failRequest: "Percent < 1"` — fewer than 1% failures
- `okRequest: "RPS > 100"` — sustain at least 100 req/s

---

## Step 5 — Validate YAML

```bash
dq-nbomber validate ./load-tests/dq-nbomber.yaml
```

Expected output: `✓ Config is valid.`

If validation fails:
1. Read the full error output
2. Fix the identified issues in `dq-nbomber.yaml`
3. Re-run `dq-nbomber validate ./load-tests/dq-nbomber.yaml`
4. Repeat until validation passes — **never hand an invalid config to the user**

Common validation errors:
- Missing `name` field on a scenario or step
- `loadSimulations` array is empty
- `body.json` and `body.raw` both set (mutually exclusive)
- `capture.as` missing
- Invalid time format in `during` or `interval` (must be `"HH:MM:SS"`)
- `thresholds:` at root level instead of inside scenario

---

## Closing

> **`dq-nbomber.yaml` validated.**
>
> - Config: `./load-tests/dq-nbomber.yaml`
> - Test data: `./load-tests/data/`
> - Thresholds: p99 < `<p99LatencyMs>`ms | ok requests > `<okRequestPercent>`%
>
> **⚠️ Before running:** Replace placeholder credentials in `./load-tests/data/users.csv` with real test accounts.
>
> Run `/qa-exec` to get the full load test execution steps.

**Optional — export to C#:** If the user wants a standalone runnable file or needs to customise test logic beyond what YAML supports:

```bash
dq-nbomber export ./load-tests/dq-nbomber.yaml
```

This writes `Program.cs` and `README.md` into `./load-tests/`. The user runs it with `dotnet run Program.cs` (dotnet 10+) or `dotnet run` (project format).

---

## Reference: Variable interpolation

| Syntax | Source |
|---|---|
| `${BASE_URL}` | Environment variable (`.env` file or shell) |
| `${data.<column>}` | Data feed row (CSV column or JSON field name) |
| `${capture.<name>}` | Value captured from a previous step response |

Variables are resolved at request-send time. Capture variables from step N are available in step N+1 onwards — not within the same step.

---

## Reference: `expectedStatusCodes` patterns

| Pattern | Codes | Reason |
|---|---|---|
| Idempotent write (register, create) | `[201, 400, 409]` | Resource may already exist on re-run |
| Cleanup / DELETE | `[200, 204, 404]` | Resource may already be gone |
| Login | `[200, 401]` | Invalid credentials fail gracefully |

---

## Anti-patterns

- **Writing YAML from scratch** — always run `generate` first; never start from a blank file
- **Skipping Gap 1** — every login returns 401 until real credentials are in `users.csv`
- **Skipping Gap 2** — number/boolean fields in YAML block mappings become strings at runtime; the server rejects them
- **Using `body.raw:`** — sends `Content-Type: text/plain`; the server ignores the body
- **Skipping Gap 3** — a wrong JSONPath silently returns the default; every downstream step fails with a missing ID
- **Skipping Gap 4** — `{ __typename }` tests nothing about business logic and cannot be used in captures
- **`thresholds:` at root level** — silently ignored; always nest inside the scenario block
- **Reading only `required[]`** — server validators enforce fields not in `required[]`; always include all `properties`
- **Skipping `$ref` resolution** — a `$ref` body schema has no fields; follow every ref before writing body fields
- **No `expectedStatusCodes` on idempotent writes** — register/create steps fail on re-run without it
- **Hardcoded credentials** — use `data/users.csv` fed via `dataFeeds`
- **GraphQL: relying on HTTP 200** — always assert `$.data` is non-empty; GraphQL errors return HTTP 200 with `$.errors`
- **GraphQL: wrong capture path** — GraphQL wraps everything under `$.data.<operationName>.<field>`

---

## Failure protocol

| Situation | Response |
|-----------|---------|
| Schema file not found and user doesn't provide one | Stop — cannot generate without a schema |
| `dq-nbomber` not found | Tell user to run `/qa-setup` |
| `validate` reports errors | Fix errors and re-validate — do not proceed until valid |
| GraphQL schema detected | Apply Gap 4 fixes to all query/mutation steps |
| Login endpoint not auto-detected | Ask user to identify the login endpoint path |
