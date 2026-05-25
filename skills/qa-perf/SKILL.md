---
name: qa-perf
description: Generate and validate a dq-nbomber.yaml load test configuration. Collects API schema file, BASE_URL, and load parameters before running generate, then fixes the 5 known generation gaps, reviews data files, and validates the YAML before handoff. Does not run the test — run /qa-exec for execution steps.
allowed-tools: Bash(dq-nbomber:*), Read, Write, Edit
---

# qa-perf — Performance Test YAML Builder

You are a senior QA consultant setting up load tests. Your job is to produce a validated `dq-nbomber.yaml` that the user can run. Never write the YAML from scratch — always use `generate` first.

Before generating any YAML, read `references/config-schema.json` for correct YAML keys and `references/yaml-examples.yaml` for working patterns.

## Safety guardrails

**Do not improvise.** Only use tools listed in `allowed-tools` (`dq-nbomber`, `Read`, `Write`, `Edit`). Never write Python scripts, Node.js scripts, shell scripts, or use `curl` to call the API directly. Never modify application source files. If a situation is not covered by these instructions, stop and ask the user.

## Safety note

**Do not run `dq-nbomber run` automatically.** Load tests generate real traffic and can cause outages if run against production without approval.

## Progress checklist

Output this checklist at the start, then re-emit with `[x]` after each step completes:

```
**qa-perf — progress**
- [ ] Check required tools (dq-nbomber)
- [ ] Read references (config-schema.json + yaml-examples.yaml)
- [ ] Read config + qa-plan.md
- [ ] Collect schema file (REQUIRED)
- [ ] Collect BASE_URL (REQUIRED)
- [ ] Collect load parameters
- [ ] Confirm scope + write perf-test-plan.md
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

## Tool check — run before anything else

```bash
dq-nbomber --version
```

If the command fails or is not found:
> "`dq-nbomber` is not installed. Invoking `/qa-setup` to install it now."

Invoke the `qa-setup` skill. Do not proceed with any other step until `/qa-setup` completes and `dq-nbomber --version` returns a version string.

## Step 0 — Read references and config

Read the following files from this skill's `references/` directory. The skill's base directory is injected into your context as `Base directory for this skill: <path>` — use that absolute path to construct each file path:

- `references/config-schema.json`
- `references/yaml-examples.yaml`
- `references/cli-reference.md`
- `references/data-review.instructions.md`

```bash
cat dq-qa.config.json
```

Extract from config:
- `domains.performance.thresholds.p99LatencyMs`
- `domains.performance.thresholds.okRequestPercent`
- `domains.performance.reportDir`
- `domains.performance.schemaUrl` — note if set; use as a candidate path for the schema below
- `requirements.docsPath`

**Versioning convention — reading:** When reading `requirements/perf.md`, `requirements/shared.md`, or `qa-plan.md`, extract only the content under the FIRST `## [YYYY-MM-DD]` heading, down to the next `---` separator or the next `## [YYYY-MM-DD]` heading. Ignore everything below.

Read the CURRENT SECTION ONLY of the performance requirements file:

```bash
cat requirements/perf.md 2>/dev/null
cat requirements/shared.md 2>/dev/null
```

Use `requirements/perf.md` as the authoritative source for: peak users, busy periods, thresholds, endpoints under test, and infrastructure details. When the user provides load parameters separately, use them to override the requirements file values.

If `domains.performance.enabled` is false:
> "Performance testing is disabled in `dq-qa.config.json`. Run `/qa-onboard` and enable the performance domain."

## Step 1 — Read qa-plan.md

```bash
cat qa-plan.md 2>/dev/null
```

Extract from the "Performance" section:
- Load profile (e.g. "10 req/s for 60s")
- Which flows to load test
- Specific endpoints in scope → translate to `--include "METHOD /path"` flags for Step 2

If the requirements doc (Step 0) specifies flows (e.g. "Happy Path E2E only"), derive the endpoint list from it and note it as the `--include` filter.

If **neither** qa-plan.md nor the requirements doc specifies which flows or endpoints to test, ask:
> "Which API flows should I load test? List the endpoints (e.g. `POST /api/login`, `GET /api/products`) or describe the flows (e.g. 'login + product search + checkout'). I'll use these as `--include` filters so only the relevant endpoints are generated."

Wait for the user's response before continuing.

---

## MANDATORY — Collect before running generate

**STOP. Do not run `dq-nbomber generate` until you have resolved all three inputs below.**

### Input 1 — API Schema (REQUIRED)

**Always ask the user upfront — do not attempt auto-detection:**

> "Please provide the path to your API schema file (OpenAPI `.yaml`/`.json` or GraphQL `.graphql`/`.gql`). This is required before I can generate the test scaffold."

Wait for the user's response before proceeding. Do not use `ls` to search for candidate filenames; the user must supply the path explicitly.

Once provided, accept any of these forms:
- A **local file path**: e.g. `./docs/openapi.yaml`, `./schema.graphql`
- A **`#file:` attachment**: extract the file path from the attachment and use it
- A **live GraphQL URL**: pass directly; `generate` fetches the schema via introspection

### Input 2 — BASE_URL (REQUIRED)

Accept from: the user's message, `.env`, `.env.example`, `.env.local` (look for `BASE_URL=`, `API_URL=`, `SERVER_URL=`).

```bash
cat .env 2>/dev/null || cat .env.example 2>/dev/null
```

If `BASE_URL` is not found anywhere, ask:
> "What is the base URL for the API during load testing? (Use a non-production environment unless the load profile is very low — e.g. `http://localhost:3000`)"

**Normalize the BASE_URL before use — strip any trailing `/`:**

```bash
BASE_URL="${BASE_URL%/}"
```

A trailing slash causes double-slash URLs (`http://localhost:3000//api/endpoint`) that fail every request.

### Input 3 — Load Parameters (collect and hold for Gap 5)

Load parameters may come from: qa-plan.md (Step 1), the user's message, or config thresholds.

If none are available, ask:
> "What are your load targets?
> - Requests/second or concurrent users?
> - Test duration?
> - Pass/fail thresholds (e.g. p99 < 500ms, error rate < 1%)?"

**Do not pass load parameters to `generate`** — the command does not accept them. Record them and apply as YAML edits in Gap 5.

Apply endpoint filters derived from qa-plan.md, the requirements doc, and any explicit user instructions:

| Source | Flag to add |
|---|---|
| qa-plan.md or requirements doc list specific flows | `--include "METHOD /path,METHOD /path"` |
| User says "only test X and Y" | `--include "METHOD /path,METHOD /path"` |
| User says "skip admin / skip Z" | `--exclude "METHOD /path"` |

**Always set `--include` when flows are specified** — without it, `generate` scaffolds every endpoint in the schema, producing far more scenarios than intended.

---

## Confirm scope + write perf-test-plan.md

Before running `generate`, present the full load test plan and ask for confirmation:

> "Here is the performance test plan I'll generate:
>
> **Endpoints in scope:**
> <list each: METHOD /path — purpose>
>
> **Load profile:** <e.g. 'inject 10 req/s for 60 seconds'>
> **Thresholds:** p99 < `<p99LatencyMs>`ms | ok requests > `<okRequestPercent>`%
> **Schema:** `<schema path or URL>`
> **Base URL:** `<BASE_URL>`
>
> Confirm to proceed, or tell me what to change."

Wait for user confirmation.

Once confirmed, write `<domains.performance.reportDir>/perf-test-plan.md` containing:
- Project name, created date, schema path/URL, base URL, report dir
- Table of endpoints in scope: method, path, purpose (e.g. authentication, product search)
- Load profile: kind (inject/keepConstant/ramp), rate or copies, duration
- Thresholds: p99 latency limit and ok-request percentage from config
- Data requirements: `data/users.csv` must be populated with real test accounts before running
- Entry conditions: `dq-nbomber.yaml` validated; real credentials in `data/users.csv`
- Exit criteria: all thresholds pass; 0 validation errors
- Artifact: `./load-tests/dq-nbomber.yaml`

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

Report findings and fix directly in the data files before continuing. Apply the full review checklist from `data-review.instructions.md` (already read in Step 0).

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

`generate` emits this two-phase default for every scenario — recognise it and replace it entirely:

```yaml
# GENERATED DEFAULT (replace both phases and the root-level thresholds)
loadSimulations:
  - kind: rampingInject
    rate: 10
    interval: "00:00:01"
    during: "00:00:30"
  - kind: inject
    rate: 10
    interval: "00:00:01"
    during: "00:01:00"
thresholds:                   # ← root-level: silently ignored — move inside the scenario
  - okRequest: "Percent > 95"
```

Replace with values from the load parameters collected before running `generate`.

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
