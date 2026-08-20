# dq-awesomeqa — Local Testing Guide

This guide covers how to validate, install, and test the plugin on your local machine before publishing it anywhere.

---

## Prerequisites

- Claude Code CLI installed (`claude --version`)
- Node.js ≥ 18 (for the safety hook)
- `jq` recommended for richer hook output (`brew install jq`)

---

## Step 1 — Validate the plugin manifest

Run this from the repo root. It checks that `plugin.json` is well-formed and all referenced files exist.

```bash
cd /path/to/dq-awesomeqa
claude plugin validate .
```

Expected output:
```
Validating plugin manifest: ./.claude-plugin/plugin.json
✔ Validation passed
```

Run with `--strict` to catch warnings too (recommended before publishing):

```bash
claude plugin validate --strict .
```

---

## Step 2 — Test hooks in isolation (no Claude session needed)

Hook tests pipe JSON payloads directly to the scripts and check the exit code and output. No Claude session is needed for this step.

### 2a — Safety hook (PreToolUse)

The hook exits **0** (allow) or **2** (block). Test both cases.

**Should ALLOW — safe YAML file write:**
```bash
echo '{
  "tool_name": "Write",
  "tool_input": {
    "file_path": "./load-tests/dq-nbomber.yaml",
    "content": "version: 1"
  }
}' | node hooks/qa-safety.js
echo "Exit code: $?"   # expect: 0
```

**Should ALLOW — write inside /tmp:**
```bash
echo '{
  "tool_name": "Bash",
  "tool_input": { "command": "rm -rf /tmp/test-run" }
}' | node hooks/qa-safety.js
echo "Exit code: $?"   # expect: 0
```

**Should BLOCK — editing a TypeScript source file:**
```bash
echo '{
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "./src/app/auth.ts",
    "old_string": "foo",
    "new_string": "bar"
  }
}' | node hooks/qa-safety.js
echo "Exit code: $?"   # expect: 2 (BLOCKED)
```

**Should BLOCK — sudo:**
```bash
echo '{
  "tool_name": "Bash",
  "tool_input": { "command": "sudo rm -rf /etc" }
}' | node hooks/qa-safety.js
echo "Exit code: $?"   # expect: 2 (BLOCKED)
```

**Should BLOCK — npm install during QA run:**
```bash
echo '{
  "tool_name": "Bash",
  "tool_input": { "command": "npm install lodash" }
}' | node hooks/qa-safety.js
echo "Exit code: $?"   # expect: 2 (BLOCKED)
```

**Should ALLOW — npm install is allowed in qa-setup context (npx):**
```bash
echo '{
  "tool_name": "Bash",
  "tool_input": { "command": "npx playwright show-report ./qa-reports/ui" }
}' | node hooks/qa-safety.js
echo "Exit code: $?"   # expect: 0
```

### 2b — SessionStart hook

```bash
CLAUDE_PLUGIN_ROOT=/path/to/dq-awesomeqa \
  bash hooks/session-start
```

Expected output: JSON with `hookSpecificOutput.additionalContext` containing the skill index — lifecycle order, config contract, all 9 skill entries.

Verify:
```bash
CLAUDE_PLUGIN_ROOT=/path/to/dq-awesomeqa \
  bash hooks/session-start | python3 -m json.tool
```

Should parse as valid JSON without errors.

### 2c — Stop hook

```bash
echo '{"usage": {"input_tokens": 2100}}' | \
  CLAUDE_PLUGIN_ROOT=/path/to/dq-awesomeqa \
  bash hooks/stop
```

Expected output:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "Stop",
    "additionalContext": "[dq-awesomeqa] Turn complete | tokens this turn: 2100"
  }
}
```

Test fallback (no jq / no token data):
```bash
echo '{}' | CLAUDE_PLUGIN_ROOT=/path/to/dq-awesomeqa bash hooks/stop
```

Expected: falls back to `"use /status to check token usage"` message.

---

## Step 3 — Create a local marketplace and install

Claude Code's `plugin install` command works from marketplaces (not raw paths). Set up a local marketplace once, then install from it.

### 3a — Create the local marketplace

```bash
mkdir -p ~/claude-local-plugins/.claude-plugin
mkdir -p ~/claude-local-plugins/plugins

# Create marketplace manifest
cat > ~/claude-local-plugins/.claude-plugin/marketplace.json << 'EOF'
{
  "name": "local-dev",
  "description": "Local plugin development marketplace",
  "plugins": [
    {
      "name": "dq-awesomeqa",
      "description": "Full QA lifecycle plugin for UI, API, Accessibility, and Performance testing",
      "source": "./plugins/dq-awesomeqa"
    }
  ]
}
EOF

# Symlink the plugin into the marketplace (edits to the plugin are reflected immediately)
ln -sf /path/to/dq-awesomeqa ~/claude-local-plugins/plugins/dq-awesomeqa
```

### 3b — Register the marketplace with Claude Code

```bash
claude plugin marketplace add ~/claude-local-plugins --scope user
```

Verify it was added:
```bash
claude plugin marketplace list
```

You should see `local-dev` in the list alongside `claude-plugins-official`.

### 3c — Install the plugin

```bash
claude plugin install dq-awesomeqa@local-dev --scope user
```

Verify it installed:
```bash
claude plugin list
```

You should see `dq-awesomeqa` in the list with scope `user`.

---

## Step 4 — Smoke test skills in a Claude Code session

Open a new Claude Code session in any directory. The session-start hook should have injected the skill index — check the first response for the lifecycle list.

### Test skill discovery

In the Claude Code session, type:
```
/qa-setup
```

Claude should respond in consultant tone, explaining each tool before offering to check or install it.

### Minimal smoke test per skill

| Skill | What to type | What to look for |
|-------|-------------|-----------------|
| `/qa-setup` | `/qa-setup` | Checks for `a11y-cli`, `dq-nbomber`, MCP server; explains each tool |
| `/qa-onboard` | `/qa-onboard` | Asks "What's the name of this project?" with explanation |
| `/qa-plan` | `/qa-plan` | Looks for `dq-qa.config.json`; if missing, offers to run qa-onboard |
| `/qa-impact` | `/qa-impact` | Asks for changed requirements or reads from a path |
| `/qa-ui` | `/qa-ui` | Reads config, asks for flows if no `qa-plan.md` found |
| `/qa-api` | `/qa-api` | Reads config; if API disabled, says so clearly |
| `/qa-a11y` | `/qa-a11y` | Reads config; if a11y disabled, says so clearly |
| `/qa-perf` | `/qa-perf` | Reads config; if perf disabled, says so clearly |
| `/qa-triage` | `/qa-triage` | Asks for failure output; accepts paste, file path, or description |
| `/qa-coverage` | `/qa-coverage` | Reads `dq-qa.config.json` and `qa-plan.md`; reports plan needed if missing |
| `/qa-codegen` | `/qa-codegen` | Asks which domain needs code generation |
| `/qa-report` | `/qa-report` | Reads config and scans all reportDir paths |

---

## Step 5 — Full lifecycle integration test

Run this in a scratch directory to test the whole flow end to end.

```bash
mkdir -p /tmp/dq-test-project && cd /tmp/dq-test-project
claude  # start a new session here
```

In the session:

1. `/qa-onboard` — answer the questions:
   - Project name: `test-app`
   - Frontend URL: `http://localhost:3000`
   - API base URL: `http://localhost:8080`
   - Schema URL: skip (say "no schema yet")
   - Accessibility: yes, US, AA
   - Performance: yes, 500ms, 95%
   - Requirements docs: skip

   Verify: `dq-qa.config.json` is created in `/tmp/dq-test-project/`

2. `/qa-plan` — verify it reads the config and produces `qa-plan.md` with all 4 domain sections.

3. `/qa-api` — verify it recognizes the API domain is enabled and explains Phase 1 (Test Planning).

4. `/qa-report` — verify it scans all `reportDir` paths and reports "no report found" for each domain (since we haven't run any tests).

---

## Step 6 — Test the safety hook fires during a session

In the Claude Code session (with the plugin installed), ask Claude to do something that should be blocked:

```
Please edit the file /tmp/dq-test-project/src/app.ts to add a console.log
```

The safety hook should fire and Claude should receive the block message. Claude should respond by explaining it cannot modify application source files during a QA session.

To confirm the hook ran, check:
```bash
# The hook outputs its BLOCKED message to stdout, which Claude Code captures
# Claude's response should mention the QA read-only role
```

---

## Step 7 — Iterate on skill content

Because the plugin is symlinked into the marketplace, changes to SKILL.md files take effect in the next Claude Code session automatically — no reinstall needed.

```bash
# Edit a skill
vim /path/to/dq-awesomeqa/skills/qa-setup/SKILL.md

# Start a new Claude Code session — the updated skill is available immediately
claude
```

For hook changes, the hook runs live from the filesystem. No restart is needed for hook scripts.

For `plugin.json` changes (name, description), reinstall:
```bash
claude plugin uninstall dq-awesomeqa
claude plugin install dq-awesomeqa@local-dev --scope user
```

---

## Step 8 — Clean up

```bash
# Uninstall the plugin
claude plugin uninstall dq-awesomeqa

# Remove the local marketplace
claude plugin marketplace remove local-dev

# Remove the marketplace directory (optional)
rm -rf ~/claude-local-plugins
```

---

## Quick reference

| Task | Command |
|------|---------|
| Validate manifest | `claude plugin validate .` |
| Validate (strict) | `claude plugin validate --strict .` |
| Test safety hook (allow) | `echo '{"tool_name":"Bash","tool_input":{"command":"ls"}}' \| node hooks/qa-safety.js` |
| Test safety hook (block) | `echo '{"tool_name":"Edit","tool_input":{"file_path":"app.ts"}}' \| node hooks/qa-safety.js` |
| Test session-start hook | `CLAUDE_PLUGIN_ROOT=$(pwd) bash hooks/session-start` |
| Test stop hook | `echo '{"usage":{"input_tokens":1234}}' \| CLAUDE_PLUGIN_ROOT=$(pwd) bash hooks/stop` |
| Install from local marketplace | `claude plugin install dq-awesomeqa@local-dev` |
| List installed plugins | `claude plugin list` |
| Uninstall | `claude plugin uninstall dq-awesomeqa` |
