# dq-nbomber CLI Reference

## Global

```
dq-nbomber [--debug] [command] [options]
```

| Global option | Description |
|---|---|
| `--debug` | Enable per-request/response HTTP trace output. Prints each request line (`→ METHOD URL`), response status (`✓/✗ ← STATUS`), headers, body excerpt (500 chars), and captured variable values. Output goes directly to stdout — no `--log-level` change needed. |

---

## Commands

### `init`

Scaffold a new dq-nbomber project.

```
dq-nbomber init [path] [--template <http|empty>]
```

| Argument / Option | Default | Description |
|---|---|---|
| `path` | `.` (current dir) | Directory to create the project in. |
| `--template` | `http` | Starter template: `http` (full example) or `empty` (minimal). |

**Creates:**
- `dq-nbomber.yaml` — starter config
- `data/` — empty data directory
- `.env.example` — environment variable template

---

### `validate`

Parse and validate a `dq-nbomber.yaml` file without running the test.

```
dq-nbomber validate <config-file>
```

| Argument | Description |
|---|---|
| `config-file` | Path to the YAML config (e.g. `./my-loadtest/dq-nbomber.yaml`). |

**Use this after authoring or editing the YAML to catch errors before running.**

Exit codes:
- `0` — valid
- `1` — validation errors (printed to stdout)

---

### `generate`

Generate a starter `dq-nbomber.yaml` (or C# scaffold) from an OpenAPI spec or GraphQL schema.

```
dq-nbomber generate <spec-file> [options]
```

| Argument / Option | Default | Description |
|---|---|---|
| `spec-file` | required | Path to an OpenAPI file (`openapi.yaml`, `openapi.json`, `swagger.json`) **or** a GraphQL SDL file (`.graphql`, `.gql`) **or** an HTTP URL. A URL containing `graphql` triggers a live introspection query; any other HTTP URL is treated as OpenAPI. |
| `--output-dir` | `.` | Directory to write the generated config and data files. |
| `--output-format` | `yaml` | `yaml` — emit `dq-nbomber.yaml`; `code` — emit C# NBomber scenario files. |
| `--base-url` | `http://localhost:5000` | Base URL written into `.env.example` and used as the default for `${BASE_URL}`. |
| `--data-records` | `10` | Number of fake data rows to generate in each data feed file. |
| `--include` | — | Comma-separated filter to include only matching endpoints/operations (see filter syntax below). |
| `--exclude` | — | Comma-separated filter to exclude matching endpoints/operations (see filter syntax below). |
| `--non-interactive` | `false` | Skip the interactive numbered picker; use `--include`/`--exclude` for selection. |
| `--graphql-path` | `/graphql` | GraphQL endpoint path appended to `${BASE_URL}` in the generated config. Only used when the spec is a GraphQL source. |

**Filter syntax:**

| Source | Pattern examples | Matches |
|---|---|---|
| OpenAPI | `GET /pets` | Exact method + path |
| OpenAPI | `POST /orders` | Exact method + path |
| OpenAPI | `DELETE *` | Any DELETE endpoint |
| GraphQL | `Query.getUsers` | Specific operation by kind + name |
| GraphQL | `Mutation.*` | All mutations |
| GraphQL | `login` | Any operation whose name is `login` |
| GraphQL | `Query` | All query operations |

**Generates (OpenAPI):**
- `dq-nbomber.yaml` — one scenario with a login step (auto-detected) and one step per selected endpoint.
- `data/users.csv` — fake credentials for authenticated flows.
- `data/<operationId>.json` — fake request body rows for POST/PUT endpoints.
- `.env.example` — environment variable template.

**Generates (GraphQL):**
- `dq-nbomber.yaml` — two scenarios: `graphql_queries` (Query operations) and `graphql_mutations` (Mutation operations). Login mutation is auto-detected and placed first in the mutations scenario with token capture.
- `data/<operationName>.json` — fake variable rows for operations with arguments; input-type fields are flattened as `argName.fieldName` keys.
- `data/users.csv` — when a login mutation is detected.
- `.env.example` — environment variable template.

**Interactive picker:** When run without `--non-interactive`, the command shows a numbered list of all endpoints/operations and prompts for a comma-separated selection. Press Enter to include all.

---

### `export`

Export a validated `dq-nbomber.yaml` to a runnable NBomber C# program.

```
dq-nbomber export [config] [--target <target>] [--format <format>] [--readme]
```

| Argument / Option | Default | Description |
|---|---|---|
| `config` | `dq-nbomber.yaml` | Path to a validated dq-nbomber YAML config. |
| `--target` | `nbomber` | Export target. Currently only `nbomber` is supported. |
| `--format` | `file` | `file` — single `Program.cs` with `#:package` directives (dotnet 10+, no `.csproj` needed); `project` — `Program.cs` + `LoadTest.csproj` (dotnet 8/9 compatible). |
| `--readme` | `true` | Write a `README.md` alongside `Program.cs` with run instructions. |

**What it writes** (into the same directory as the YAML):

| File | Condition | Description |
|---|---|---|
| `Program.cs` | always | Runnable NBomber 6.x C# top-level program |
| `LoadTest.csproj` | `--format project` only | NuGet package references for dotnet 8/9 |
| `README.md` | `--readme true` (default) | Run instructions |

**Generated `Program.cs` structure:**

- `#:package` directives for `NBomber`, `NBomber.Http`, `NBomber.Data` (file format only)
- `.env` loader at startup — reads `BASE_URL` and secrets without any extra package
- Typed `record` classes per data feed (e.g. `record UserRow(string token);`) — properties must match CSV column headers / JSON field names; declared at the bottom of the file after all top-level statements
- `IDataFeed<T>` fields per feed, initialised in `.WithInit()` using `Data.LoadCsv<T>()` / `Data.LoadJson<T[]>()` + `DataFeed.Circular()` / `DataFeed.Random()`
- Per-iteration: `feed.GetNextItem(ctx.ScenarioInfo)` returns a typed row; fields accessed as `row.fieldName`
- Per-step: `HttpClientArgs.Create(logger: ctx.Logger)` + `Http.Send(httpClient, clientArgs, request)`
- Response body read via `response.Payload.Value.Content.ReadAsStringAsync()` (NBomber 6.x API)
- Report formats from `NBomber.Contracts.Stats.ReportFormat`

**Run the exported program:**

```bash
cd ./my-loadtest      # directory containing Program.cs, .env, data/
# edit .env — set BASE_URL and any auth secrets
# fill data/users.csv with real credentials

# dotnet 10+ (file format, no .csproj needed)
dotnet run Program.cs

# dotnet 8/9 (project format)
dotnet run
```

---

### `run`

Execute a load test.

```
dq-nbomber [--debug] run <config-file> [options]
```

| Argument / Option | Default | Description |
|---|---|---|
| `config-file` | required | Path to the YAML config. |
| `--profile` | — | Overlay `config.<profile>.yaml` on top of the base config. |
| `--report-folder` | `reports/` | Write reports to a custom root folder. |
| `--display-console-metrics` | `false` | Show real-time per-second metrics in the terminal. |
| `--no-warmup` | `false` | Skip the warm-up phase for all scenarios. |
| `--target` | — | Run only the named scenario(s); repeat for multiple. |
| `--log-level` | `normal` | NBomber log verbosity: `quiet` (Fatal — suppress all output), `normal` (Information), `verbose` (Debug — full Serilog output). |
| `--env` | `.env` in config dir | Path to a `.env` file for variable substitution. |

**Global `--debug` flag** (place before `run`):

```bash
# See every HTTP request and response while the test runs
dq-nbomber --debug run dq-nbomber.yaml

# Suppress NBomber banner/progress (CI mode)
dq-nbomber run dq-nbomber.yaml --log-level quiet

# Full verbose Serilog output
dq-nbomber run dq-nbomber.yaml --log-level verbose
```

Exit codes:
- `0` — test passed (all thresholds met)
- `2` — one or more thresholds breached

---

### `thresholds`

Evaluate thresholds against a previously generated report without re-running the test.

```
dq-nbomber thresholds <config-file> [--report <report-dir>]
```

---

### `report`

Open or display a report from a previous run.

```
dq-nbomber report [--folder <reports-dir>]
```

---

### `trend`

Display a multi-run trend report across all historical runs stored in the reports folder.

```
dq-nbomber trend [options]
```

| Option | Default | Description |
|---|---|---|
| `--folder` | `reports` | Root folder containing timestamped run subfolders. |
| `--yaml` | — | Filter to runs generated from a specific YAML file (matched by base name). |
| `--last` | `20` | Maximum number of runs shown in the console table. |
| `--open` | `false` | Open the generated HTML report in the default browser after writing it. |
| `--out` | `reports/trend-{yaml}.html` | Custom output path for the HTML file. |

**What it does:**

1. Scans every immediate subdirectory of `--folder` for a `run-meta.json` snapshot file (written automatically by `dq-nbomber run`).
2. Optionally filters to runs from a specific YAML file via `--yaml`.
3. Prints a **console table** — per-step OK/Fail/RPS/P50/P95/P99 with colour-coded latency and ASCII sparklines for the last `--last` runs.
4. Writes a **self-contained interactive HTML dashboard** (`trend-{yaml}.html`) to the reports folder root.

**HTML dashboard features:**

| Feature | Description |
|---|---|---|
| KPI summary cards | Avg P95, Avg P50, Throughput, Error Rate, Total Requests — each with Δ% vs the previous run |
| Scenario tabs | One tab per scenario |
| Chart.js line charts | P95 · P50 · P99 · Mean · RPS · Failure Rate, one series per step |
| Inline sparklines | Per-row mini trend with the current run's position highlighted |
| Δ P95% column | Red/green regression indicator vs the previous run |
| Run / Step / Scenario filters | Multi-select dropdowns to slice the table |
| Column sort | Click any column header |
| Date range filter | 7 / 14 / 30 / 90 days or All time |
| Run comparison mode | Pick any two runs and diff metrics side-by-side |
| CSV export | Download all filtered rows |

**Example:**

```bash
# Console output + generate HTML
dq-nbomber trend --yaml dq-nbomber.yaml

# Open in browser immediately
dq-nbomber trend --yaml dq-nbomber.yaml --open

# Different folder, last 50 runs
dq-nbomber trend --folder ./perf-reports --yaml dq-nbomber.yaml --last 50

# Custom HTML output path (e.g. CI artefacts)
dq-nbomber trend --yaml dq-nbomber.yaml --out ./ci-output/trend.html
```

**Requires:** At least one prior `dq-nbomber run` execution so that `run-meta.json` snapshots exist.

---

### `cluster` (YAML-driven — via `run`)

Cluster mode is activated by adding a `cluster:` block to `dq-nbomber.yaml` and running the normal `run` command. There is no separate `cluster` subcommand for execution.

```
dq-nbomber run <config-file> [options] [-- <nbomber-cluster-args>]
```

**`cluster:` YAML block fields:**

| Field | Type | Description |
|---|---|---|
| `nodeType` | `coordinator` \| `agent` | Role this process plays in the cluster. |
| `natsUrl` | string | NATS server URL (e.g. `nats://nats-service:4222`). |
| `agentsCount` | int | Number of agent nodes the coordinator waits for before starting. |
| `clusterId` | string | Shared run ID — must be identical across all coordinator and agent pods. |
| `localDev` | bool | `true` = run coordinator + agents in a single process (no NATS needed). Useful for local minikube smoke tests. |
| `agentGroup` | string | Optional agent group name for ManualCluster mode. |
| `coordinatorTarget` | string[] | Scenario names assigned to the coordinator node. |
| `agentTarget` | string[] | Scenario names assigned to agent nodes. |

All fields map 1-to-1 to NBomber's `--cluster-*` CLI args and are merged into the args forwarded to `NBomberRunner.Run()`. CLI tokens passed after `--` always override YAML values.

**Coordinator example:**

```yaml
cluster:
  nodeType: coordinator
  natsUrl: nats://nats-service.load-tests.svc.cluster.local:4222
  agentsCount: 3
  clusterId: sprint-42-load

scenarios:
  - name: api_load
    steps: ...
```

```bash
dq-nbomber run dq-nbomber.yaml
# Console prints:
# Cluster mode: node=coordinator  nats=nats://nats-service...:4222  agents=3
```

**Agent pod (same YAML, override nodeType at runtime):**

```bash
dq-nbomber run dq-nbomber.yaml -- --cluster-node-type=agent
```

**Local dev / minikube (single-machine, no NATS):**

```yaml
cluster:
  localDev: true
  agentsCount: 2
```

```bash
dq-nbomber run dq-nbomber.yaml
```

**Precedence:**

| Source | Priority |
|---|---|
| `--` unparsed CLI tokens | Highest (override YAML) |
| `cluster:` YAML block | Applied when no matching CLI token |
| NBomber defaults | Lowest |

Exit codes are the same as `run`:
- `0` — test passed
- `1` — config/startup error
- `2` — threshold violation

---

### `install-skill`

Install the dq-nbomber VS Code agent skill into the current project.

```
dq-nbomber install-skill [--target-dir <path>]
```

| Option | Default | Description |
|---|---|---|
| `--target-dir` | `.` (current dir) | Root of the project to install the skill into. |

**Creates:**
- `.claude/skills/dq-nbomber/SKILL.md`
- `.claude/skills/dq-nbomber/references/config-schema.json`
- `.claude/skills/dq-nbomber/references/yaml-examples.yaml`
- `.claude/skills/dq-nbomber/references/cli-reference.md`

After installing, the agent skill is available in VS Code Copilot as `/dq-nbomber`.

---

## Variable Interpolation

Variables are resolved at request-send time using these sources (in precedence order):

1. **Capture variables** — `${capture.<name>}` — set by `capture` blocks in previous steps.
2. **Data feed variables** — `${data.<column>}` — current row from a data feed.
3. **Environment variables** — `${VAR_NAME}` — from `.env` file or shell environment.

---

## Data Feeds

```yaml
dataFeeds:
  - file: data/users.csv
    namespace: user          # variables accessed as ${user.email}, ${user.password}
    strategy: circular       # circular | random | unique
    partition: false         # true = slice rows by agent partition in cluster mode
```

| Field | Default | Description |
|---|---|---|
| `file` | required | Path to `.csv` or `.json` file, relative to the YAML config. |
| `namespace` | `data` | Variable prefix — `${namespace.column}` in steps. |
| `strategy` | `circular` | `circular` loops rows endlessly; `random` picks a random row; `unique` each row once (exhausts). |
| `partition` | `false` | When `true`, in cluster mode each agent automatically receives a distinct slice of the rows (based on `ScenarioPartition.Number / Count`). Single-node runs are unaffected. |

**Cluster data partitioning example:**

```yaml
cluster:
  nodeType: coordinator
  agentsCount: 3

scenarios:
  - name: checkout
    dataFeeds:
      - file: data/users.csv
        namespace: user
        strategy: unique
        partition: true    # agent 0 → rows 0-33, agent 1 → rows 34-66, agent 2 → rows 67-99
```

---

## Capture — JsonPath Syntax

The `jsonPath:` extractor uses **JsonPath.Net (RFC 9535)**. Key rules:

| Pattern | Example | Notes |
|---|---|---|
| Simple dot path | `$.data.token` | Standard |
| Array index | `$.results[0].id` | Supported |
| Filter expression | `$.items[?@.active==true && @.kind=='X'].id` | RFC 9535 — **no outer parens** |
| Regex match `=~` | *(not supported)* | Use `regex:` extractor instead |

```yaml
capture:
  - jsonPath: "$.data.token"                                      # simple
    as: authToken
  - jsonPath: "$.results[0].sku"                                   # array index
    as: firstSku
  - jsonPath: "$.items[?@.active==true && @.kind=='truck'].id"     # filter (RFC 9535)
    as: itemId
  - regex: '"token":"([^"]+)"'                                     # regex fallback
    as: tokenFromBody
```

> **Common mistake:** `[?(@.field==value)]` (Jayway/Goessner syntax with outer parens) throws `PathParseException`. Use `[?@.field==value]` instead.

---

## Data File Formats

### CSV

```csv
email,password,name
user1@example.com,secret1,Alice
user2@example.com,secret2,Bob
```

- First row: header (column names become variable names).
- Accessed as: `${data.email}`, `${data.password}`, `${data.name}`.

### JSON

```json
[
  { "productId": "p1", "quantity": 2 },
  { "productId": "p2", "quantity": 1 }
]
```

- Must be an **array** of objects — not a single object.
- Accessed as: `${data.productId}`, `${data.quantity}`.

---

## Threshold Expression Syntax

```
<metric> <operator> <value>
```

| Context | Available Metrics |
|---|---|
| `okRequest` | `RPS`, `Percent`, `Count` |
| `failRequest` | `Percent`, `Count` |
| `okLatency` | `P50`, `P75`, `P95`, `P99`, `Mean`, `StdDev` (milliseconds) |

**Operators**: `>`, `>=`, `<`, `<=`, `==`

**Examples:**
```yaml
thresholds:
  - okRequest: "Percent > 99"     # 99%+ of requests succeed
  - okLatency: "P99 < 500"        # 99th percentile under 500 ms
  - failRequest: "Percent < 1"    # fewer than 1% failures
  - okRequest: "RPS >= 50"        # at least 50 RPS throughput
```
