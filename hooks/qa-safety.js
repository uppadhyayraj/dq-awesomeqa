#!/usr/bin/env node
/**
 * dq-awesomeqa PreToolUse safety hook.
 *
 * Blocks destructive or out-of-scope operations during QA sessions.
 * QA role: read-only observation and testing. Never modifies application code.
 *
 * Exit codes:
 *   0 = allow
 *   2 = BLOCK (stdout shown to agent as reason)
 */

const { readFileSync } = require('fs');

let input = '';
try {
  input = readFileSync(0, 'utf-8').trim();
} catch {
  process.exit(0);
}

let toolCall;
try {
  toolCall = JSON.parse(input);
} catch {
  process.exit(0);
}

const toolName = (toolCall.tool_name ?? '').trim();
const toolInput = toolCall.tool_input ?? {};

// ── Bash checks ───────────────────────────────────────────────────────────────

if (toolName === 'Bash') {
  const cmd = (toolInput.command ?? '').trim();

  if (/^sudo\s/i.test(cmd) || /^runas\s/i.test(cmd)) {
    block(
      'Privilege escalation (sudo / runas) is not allowed during QA sessions.\n' +
      'Report the permission issue to the user and ask them to resolve it manually.'
    );
  }

  // Block package installs during active QA runs (qa-setup is the only install skill)
  if (/\bnpm\s+(install|i\b|update|uninstall|ci\b|add\b)/i.test(cmd) &&
      !/\bnpm\s+run\b/i.test(cmd) &&
      !/\bnpx\s/i.test(cmd)) {
    block(
      'npm package installation is not allowed during QA test runs.\n' +
      'Use /qa-setup to install required tools.'
    );
  }

  if (/\b(brew\s+install|apt(-get)?\s+install|yum\s+install|dnf\s+install)\b/i.test(cmd)) {
    block(
      'System package manager installs are not allowed during QA test runs.\n' +
      'Use /qa-setup to install required tools.'
    );
  }

  // Destructive filesystem operations
  if (/\brm\b.*\s-[^\s]*[rR]/.test(cmd)) {
    if (!/\brm\b.*\/tmp\//.test(cmd) && !/\brm\b.*%TEMP%/i.test(cmd)) {
      block(
        'Recursive delete (rm -rf) outside /tmp is not allowed during QA sessions.\n' +
        'Ask the user if cleanup is needed.'
      );
    }
  }

  if (/\brd\s+\/s\b/i.test(cmd) || /Remove-Item\b.*(-Recurse|-Force)/i.test(cmd)) {
    block(
      'Recursive delete is not allowed during QA sessions.\n' +
      'Ask the user if cleanup is needed.'
    );
  }
}

// ── Edit / Write checks ───────────────────────────────────────────────────────

if (toolName === 'Edit' || toolName === 'Write') {
  const filePath = (toolInput.file_path ?? '').replace(/\\/g, '/');

  // Always allow: tmp, qa-reports, YAML scripts, JSON/HTML/MD/CSV
  if (/^\/tmp\//i.test(filePath) || /^\/var\/folders\//i.test(filePath)) process.exit(0);
  if (/qa-reports/i.test(filePath) || /a11y-artifacts/i.test(filePath)) process.exit(0);
  if (/dq-qa\.config\.json$/i.test(filePath)) process.exit(0);
  if (/qa-(plan|summary|triage|coverage).*\.(md|json)$/i.test(filePath)) process.exit(0);
  if (/\.(yaml|yml|json|html|md|txt|csv)$/i.test(filePath)) process.exit(0);

  // Block application source code
  if (/\.(ts|tsx|js|mjs|cjs|jsx|py|java|go|rb|php|cs|cpp|cc|c|h|hpp|rs|swift|kt|vue|svelte)$/i.test(filePath)) {
    block(
      `Editing application source files is not allowed during QA sessions.\n` +
      `File: ${filePath}\n\n` +
      `QA role is read-only observation and testing. Report issues to the developer.`
    );
  }
}

process.exit(0);

function block(reason) {
  console.log(
    `\n[dq-awesomeqa-safety] BLOCKED\n` +
    `${'─'.repeat(60)}\n` +
    `${reason}\n` +
    `${'─'.repeat(60)}\n`
  );
  process.exit(2);
}
