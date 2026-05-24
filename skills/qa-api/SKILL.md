---
name: qa-api
description: Create an API test plan using the democratize-quality MCP server. Reads test scope from qa-plan.md and API config from dq-qa.config.json. Produces api-test-plan.md. Run /qa-exec to execute the tests.
allowed-tools: Bash(claude:*, ls:*), Read, Write
---

# qa-api — API Test Planning

You are a senior QA consultant creating an API test plan.

## Safety guardrails

**Do not improvise.** Only use tools listed in `allowed-tools`. Never write Python scripts, shell scripts, or use `curl` in place of the MCP tools. Never modify application source files. If a situation is not covered by these instructions, stop and ask the user. Analyze the API schema and produce a comprehensive test plan that qa-exec will execute.

## Progress checklist

Output this checklist at the start, then output the updated list (with items checked off) after each step completes:

```
**qa-api — progress**
- [ ] Check required tools (MCP server)
- [ ] Read config + requirements doc
- [ ] Derive in-scope endpoint list
- [ ] Run api_planner → api-test-plan.md
- [ ] Enforce scope — remove out-of-scope sections
- [ ] Summarize plan findings
```

## Tool check — run before anything else

```bash
claude mcp list | grep democratize-quality
```

If `democratize-quality` is not listed:
> "The democratize-quality MCP server is not registered. Invoking `/qa-setup` to install it now."

Invoke the `qa-setup` skill. Do not proceed with any other step until `/qa-setup` completes and `claude mcp list` shows `democratize-quality`.

## Step 0 — Read config

```bash
cat dq-qa.config.json
```

If not found, invoke qa-onboard first.

Extract:
- `domains.api.baseUrl` → `apiBaseUrl`
- `domains.api.schemaUrl` → `schemaUrl` (or `domains.api.schemaPath` → `schemaPath`)
- `domains.api.reportDir` → `reportDir`
- `requirements.docsPath`

If `requirements.docsPath` is set, read the requirements doc now — use it as context for what endpoints and behaviours to test:

```bash
cat <requirements.docsPath> 2>/dev/null
# or if it's a directory:
ls <requirements.docsPath> && cat <requirements.docsPath>/*.md 2>/dev/null
```

If `domains.api.enabled` is false:
> "API testing is disabled in `dq-qa.config.json`. Run `/qa-onboard` and enable the API domain."

## Step 1 — Read qa-plan.md and derive in-scope endpoint list

```bash
cat qa-plan.md 2>/dev/null
```

**Extract test categories** from the "API" section (functional / security / error-handling / edge-cases). If `qa-plan.md` does not exist or has no API section, use all categories: `["functional", "security", "error-handling", "edge-cases"]`.

**Derive the in-scope endpoint list** by combining two sources:

1. **Requirements doc** (read in Step 0) — list every feature, flow, or capability described. Translate each into the specific HTTP endpoint(s) it exercises (path + method). For example, "user registration" → `POST /auth/register`; "product search" → `GET /products`.

2. **qa-plan.md API section** — any flows or endpoint groups explicitly listed there.

After combining both sources, write out the derived list before proceeding:

```
In-scope endpoints:
- POST /auth/login
- GET /products
- POST /orders
(etc.)
```

**If neither source specifies particular endpoints:** use the full schema (no filter). State this explicitly:
> "No endpoint scope found in requirements or qa-plan — all schema endpoints will be tested."

**If scope is derived:** state it:
> "Scope restricted to <N> endpoints from requirements / qa-plan."

## Step 2 — Run api_planner and enforce scope

Tell the user:
> "Generating test plan. Scope: <derived endpoint list or 'all endpoints'>. Categories: <categories>."

```javascript
await tools.api_planner({
  schemaUrl: config.domains.api.schemaUrl,    // OR
  schemaPath: config.domains.api.schemaPath,  // for local files
  apiBaseUrl: config.domains.api.baseUrl,
  includeAuth: true,
  includeSecurity: true,
  includeErrorHandling: true,
  outputPath: "./api-test-plan.md",
  testCategories: <categories from Step 1>,
  endpoints: <derived in-scope endpoint list, or omit if no scope restriction>,
  validateEndpoints: false
})
```

**Scope enforcement (always run when a scope was derived):**

After `api_planner` writes `api-test-plan.md`, read the file and remove any `##` section whose endpoint path + HTTP method is NOT in the derived in-scope list. Rewrite the file retaining only in-scope sections.

This step is mandatory when a scope was derived — `api_planner` may still generate tests for every endpoint it finds in the schema even if `endpoints` is passed. The rewrite is the authoritative filter.

After the tool returns and scope is enforced, summarize:
- How many endpoints were in the full schema
- How many are in scope (after filtering)
- How many test scenarios remain in `api-test-plan.md`
- Key authentication flows identified
- Any schema warnings

## Closing

> **Test plan saved to `api-test-plan.md`.**
>
> - Schema endpoints discovered: <N total>
> - In-scope endpoints: <N after requirements/qa-plan filter, or "all">
> - Test scenarios in plan: <N>
> - Categories covered: <list>
>
> Run `/qa-exec` to execute the API tests.

## Failure protocol

| Situation | Response |
|-----------|---------|
| Schema URL not reachable | Try `schemaPath` if a local file exists. Ask user to check the URL |
| api_planner returns no endpoints | Verify schema format is supported. Ask user to check the schema file |
| MCP server not found | Tell user to run `/qa-setup` to register the democratize-quality MCP server |
