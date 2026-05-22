---
name: qa-setup
description: Install and configure all tools required by dq-awesomeqa — a11y-cli, dq-nbomber CLI, and the democratize-quality MCP server. Run once per developer machine before using any other skill.
---

# qa-setup — Environment Setup

You are acting as a senior QA consultant helping a QA engineer set up their machine for the first time. Explain each tool's purpose before installing it — the engineer should understand *why* each tool exists, not just that it's being installed.

## What gets installed

| Tool | Purpose | Install command |
|------|---------|----------------|
| `a11y-cli` | WCAG accessibility audits + Playwright browser automation for UI testing | `npm install -g @democratize-quality/accessibility-cli` |
| `dq-nbomber` | Load test scenario generation, validation, and execution | `dotnet tool install -g dq-nbomber-cli` |
| DQ MCP server | AI-powered API test planning, code generation, and test healing | `claude mcp add democratize-quality npx @democratize-quality/mcp-server` |

## Step-by-step workflow

### Step 1 — Check what's already installed

Run these checks before installing anything:

```bash
which a11y-cli && a11y-cli --version
which dq-nbomber && dq-nbomber --version
claude mcp list
```

Report what's found vs. missing. Do not reinstall tools that are already working.

### Step 2 — Install missing tools (explain each before running)

**a11y-cli** — Before installing, tell the user:
> "a11y-cli is the accessibility testing engine. It runs WCAG audits using axe-core and drives a Playwright browser for UI E2E tests. We'll use it for both accessibility and UI testing domains."

```bash
npm install -g @democratize-quality/accessibility-cli
```

Validate: `a11y-cli --version` should return a version string.

**dq-nbomber** — Before installing, tell the user:
> "dq-nbomber is a .NET load testing CLI. It generates performance test scenarios from your OpenAPI or GraphQL schema and runs them with NBomber. You'll need .NET 8 SDK or higher installed."

Check .NET first: `dotnet --version`. If not installed, stop and tell the user to install .NET SDK from https://dotnet.microsoft.com/download before continuing.

```bash
dotnet tool install -g dq-nbomber-cli
```

Validate: `dq-nbomber --version` should return a version string.

**DQ MCP server** — Before installing, tell the user:
> "The democratize-quality MCP server gives Claude access to API testing tools — it can analyze your OpenAPI or GraphQL schema, generate Playwright/Jest/Postman tests, and automatically heal failing tests. It runs as a background process managed by Claude Code."

```bash
claude mcp add democratize-quality npx @democratize-quality/mcp-server
```

Validate: `claude mcp list` should show `democratize-quality` in the list.

### Step 3 — Final validation

Run a quick smoke test for each tool:

```bash
a11y-cli --version
dq-nbomber --version
claude mcp list | grep democratize-quality
```

### Step 4 — Closing summary

After all tools are confirmed working, provide this summary:

> **Setup complete.** Here's what's installed:
> - ✅ a11y-cli [version] — accessibility audits + UI automation
> - ✅ dq-nbomber [version] — load testing
> - ✅ democratize-quality MCP server — API testing
>
> **Recommended next step:** Run `/qa-onboard` to configure this project for QA testing.
> qa-onboard will ask for your app URLs, API schema, accessibility requirements, and performance thresholds — it takes about 5 minutes and creates a `dq-qa.config.json` that all other skills will use.

## Failure protocol

| What failed | What to do |
|-------------|-----------|
| `npm install -g` fails with permission error | Tell user to run with `sudo` or configure npm global prefix without sudo |
| `dotnet --version` not found | Stop. Tell user to install .NET 8 SDK from https://dotnet.microsoft.com/download |
| `dotnet tool install` fails | Check if tool is already installed: `dotnet tool list -g \| grep dq-nbomber` |
| `claude mcp add` fails | Tell user to ensure Claude Code CLI is installed and authenticated |
