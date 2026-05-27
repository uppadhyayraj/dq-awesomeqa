# dq-awesomeqa — Installation for OpenCode

## Prerequisites

- OpenCode installed on your machine
- Node.js (required for hooks)
- For UI/A11y testing: `a11y-cli` installed
- For Performance testing: `dq-nbomber` installed
- For API testing: the `democratize-quality` MCP server (run `/qa-setup` after install)

## Installation

Add dq-awesomeqa to your `opencode.json` configuration file:

```json
{
  "plugin": ["dq-awesomeqa@git+https://github.com/uppadhyayraj/dq-awesomeqa.git"]
}
```

Restart OpenCode — it will automatically install the plugin and register all `/qa-*` skills.

To pin a specific version, append the tag:

```json
{
  "plugin": ["dq-awesomeqa@git+https://github.com/uppadhyayraj/dq-awesomeqa.git#v1.0.0"]
}
```

## Verify

In an OpenCode session, type `/qa-init` — if the skill loads, installation is working.

## Using the Skills

All `/qa-*` skills are available once installed. Start with `/qa-init` for a guided STLC journey.

```
/qa-init          → guided STLC journey (start here)
/qa-setup         → install required tools
/qa-onboard       → configure project
/qa-requirement   → gather requirements
/qa-plan          → derive test strategy
/qa-api           → build API test plan
/qa-ui            → build UI interaction script
/qa-a11y          → add accessibility scan steps
/qa-perf          → generate load test config
/qa-exec          → execute all tests
/qa-triage        → categorise failures
/qa-coverage      → release readiness check
/qa-report        → consolidated QA summary
```

## Troubleshooting

**Skills don't appear after restart**
Check `opencode run --print-logs` for plugin loading errors. Verify your `opencode.json` has the correct plugin entry and that the git URL is reachable.

**Hooks not firing**
Confirm Node.js is on your PATH — the hooks require Node to run.

**MCP server not found during API tests**
Run `/qa-setup` first to register the `democratize-quality` MCP server.
