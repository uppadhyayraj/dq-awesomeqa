#!/usr/bin/env node
/**
 * dq-awesomeqa PreToolUse safety hook.
 *
 * Blocks destructive, out-of-scope, or dangerous operations during QA sessions.
 * QA role: read-only observation and testing. Never modifies application code.
 *
 * Coverage:
 *   1. Privilege escalation (sudo, su, doas, pkexec, runas)
 *   2. System package installs outside /qa-setup (npm install -g, brew, apt)
 *   3. Recursive deletes outside /tmp
 *   4. Dangerous system commands (chmod +s, chown root, launchctl, systemctl)
 *   5. Dangerous curl (DELETE/PATCH/PUT to non-test URLs, pipe-to-shell)
 *   6. Process termination (kill -9, pkill, killall on non-test processes)
 *   7. Editing application source files (.ts, .js, .py, …)
 *   8. Writing files outside the project root
 *   9. Secret patterns in Write/Edit content (AWS keys, PEM private key headers)
 *  10. Global pip installs
 *
 * Exit codes:
 *   0 = allow
 *   2 = BLOCK (stdout shown to agent as the block reason)
 */

'use strict';

const { readFileSync } = require('fs');

let raw = '';
try { raw = readFileSync(0, 'utf-8').trim(); } catch { process.exit(0); }

let toolCall;
try { toolCall = JSON.parse(raw); } catch { process.exit(0); }

const toolName = String(toolCall.tool_name ?? '').trim();
const toolInput = toolCall.tool_input ?? {};

// ── Helpers ───────────────────────────────────────────────────────────────────

function block(reason) {
  console.log(
    '\n[dq-awesomeqa-safety] BLOCKED\n' +
    '─'.repeat(60) + '\n' +
    reason + '\n' +
    '─'.repeat(60) + '\n'
  );
  process.exit(2);
}

// ── Bash checks ───────────────────────────────────────────────────────────────

if (toolName === 'Bash') {
  // Only inspect the first line of multi-line / heredoc commands to avoid false positives
  // on file content being written via cat << EOF ... EOF constructs.
  const fullCmd = String(toolInput.command ?? '').trim();
  const firstLine = fullCmd.split('\n')[0].trim();

  // For single-line commands use the full string; for heredocs use only the first line.
  const isHeredoc = /<<\s*['"]?[A-Z_]+['"]?/.test(firstLine);
  const cmd = isHeredoc ? firstLine : fullCmd;

  // 1. Privilege escalation
  if (/\bsudo\s/i.test(cmd) || /\bsu\s+-/i.test(cmd) ||
      /\bdoas\s/i.test(cmd) || /\bpkexec\s/i.test(cmd) ||
      /^runas\s/i.test(cmd)) {
    block(
      'Privilege escalation (sudo/su/doas/pkexec/runas) is not allowed during QA sessions.\n' +
      'Report the permission issue to the user and ask them to resolve it manually.'
    );
  }

  // 2. Package installs — allow npm run / npx, block install/update
  if (/\bnpm\s+(install|update|uninstall|ci\b|add\b)/i.test(cmd) &&
      !/\bnpm\s+run\b/i.test(cmd) && !/\bnpx\s/i.test(cmd)) {
    block(
      'npm package installation is not allowed during QA test runs.\n' +
      'Use /qa-setup to install required tools.'
    );
  }

  if (/\b(brew\s+install|apt(-get)?\s+install|yum\s+install|dnf\s+install|apk\s+add)\b/i.test(cmd)) {
    block(
      'System package manager installs are not allowed during QA test runs.\n' +
      'Use /qa-setup to install required tools.'
    );
  }

  // 3. Recursive deletes outside /tmp
  if (/\brm\b.*-[^\s]*[rR]/.test(cmd) || /\brm\b.*--recursive/.test(cmd)) {
    if (!/\brm\b.*\/tmp\//.test(cmd) && !/\brm\b.*%TEMP%/i.test(cmd)) {
      block(
        'Recursive delete outside /tmp is not allowed during QA sessions.\n' +
        'Ask the user if cleanup is needed.'
      );
    }
  }

  if (/\brd\s+\/s\b/i.test(cmd) || /Remove-Item\b.*-Recurse/i.test(cmd)) {
    block(
      'Recursive directory delete is not allowed during QA sessions.\n' +
      'Ask the user if cleanup is needed.'
    );
  }

  // 4. Elevated system commands
  if (/\bchmod\s+[+]s\b/.test(cmd)) {
    block('Setting setuid/setgid bits (chmod +s) is not allowed during QA sessions.');
  }

  if (/\bchown\s+root\b/i.test(cmd)) {
    block('Changing ownership to root is not allowed during QA sessions.');
  }

  if (/\b(launchctl|systemctl)\s+(start|stop|restart|enable|disable|load|unload)\b/i.test(cmd)) {
    block(
      'System service management (launchctl/systemctl) is not allowed during QA sessions.\n' +
      'Ask the user to manage system services manually.'
    );
  }

  // 5. Dangerous curl
  if (/\bcurl\b/i.test(cmd)) {
    if (/\bcurl\b.*-X\s+(DELETE|PATCH|PUT)\b/i.test(cmd) ||
        /\bcurl\b.*--request\s+(DELETE|PATCH|PUT)\b/i.test(cmd)) {
      block(
        'curl DELETE/PATCH/PUT is not allowed during QA sessions.\n' +
        'Use the democratize-quality MCP server for API testing.'
      );
    }
    if (/curl\b[^|]*\|\s*(sh|bash|zsh|node|python|ruby|perl)\b/i.test(cmd)) {
      block(
        'Piping curl to a shell interpreter is not allowed.\n' +
        'Download the file first, review it, then execute explicitly.'
      );
    }
  }

  // 6. Process termination — allow only known test tool targets
  const SAFE_KILL = /playwright|a11y-cli|nbomber|dq-nbomber|node.*test/i;

  if ((/\bkill\s+-9\b/.test(cmd) || /\bkill\s+-SIGKILL\b/.test(cmd)) && !SAFE_KILL.test(cmd)) {
    block(
      'Force-killing processes (kill -9) is not allowed during QA sessions except on known test processes.\n' +
      'Ask the user to stop the process manually.'
    );
  }

  if (/\b(pkill|killall)\b/.test(cmd) && !SAFE_KILL.test(cmd)) {
    block(
      'pkill/killall is not allowed during QA sessions except on known test processes.\n' +
      'Ask the user to stop the process manually.'
    );
  }

  // 10. Global pip installs
  if (/\bpip\s+install\b/i.test(cmd) && !/\.venv|venv\/|virtualenv/.test(cmd)) {
    block(
      'pip install outside a virtualenv is not allowed during QA sessions.\n' +
      'Use /qa-setup to install required tools, or activate a virtualenv first.'
    );
  }
}

// ── Edit / Write checks ───────────────────────────────────────────────────────

if (toolName === 'Edit' || toolName === 'Write') {
  const filePath = String(toolInput.file_path ?? '').replace(/\\/g, '/');
  const newContent = String(toolInput.new_string ?? toolInput.content ?? '');

  // Always allow: system tmp dirs
  if (/^\/tmp\//i.test(filePath) || /^\/var\/folders\//i.test(filePath)) process.exit(0);

  // Always allow: this plugin's own files (hooks/, skills/, .claude/, docs/)
  if (/\/(hooks|skills|\.claude|docs)\//.test(filePath)) process.exit(0);

  // Always allow: QA output artifacts and config
  if (/qa-reports/i.test(filePath) || /a11y-artifacts/i.test(filePath)) process.exit(0);
  if (/dq-qa\.config\.json$/i.test(filePath)) process.exit(0);
  if (/qa-(plan|summary|triage|coverage|exec).*\.(md|json)$/i.test(filePath)) process.exit(0);
  if (/\.(yaml|yml|json|html|md|txt|csv|log)$/i.test(filePath)) process.exit(0);

  // 7. Block application source code edits
  const appExtensions = /\.(ts|tsx|mjs|cjs|jsx|py|java|go|rb|php|cs|cpp|cc|c|h|hpp|rs|swift|kt|vue|svelte)$/i;
  if (appExtensions.test(filePath)) {
    block(
      'Editing application source files is not allowed during QA sessions.\n' +
      `File: ${filePath}\n\n` +
      'QA role is read-only observation and testing. Report issues to the developer.'
    );
  }

  // Block bare .js writes outside hooks/ or skills/ (those are already allowed above)
  if (/\.js$/i.test(filePath)) {
    block(
      'Editing JavaScript source files outside the plugin directory is not allowed during QA sessions.\n' +
      `File: ${filePath}\n\n` +
      'QA role is read-only observation and testing. Report issues to the developer.'
    );
  }

  // 8. Block writes outside project root (excluding /tmp)
  const projectRoot = process.cwd().replace(/\\/g, '/');
  if (!filePath.startsWith(projectRoot) && !filePath.startsWith('/tmp/')) {
    block(
      'Writing files outside the project root is not allowed during QA sessions.\n' +
      `Attempted: ${filePath}\n` +
      `Project root: ${projectRoot}`
    );
  }

  // 9. Secret scanning on write content
  const secretIssue = detectSecrets(newContent);
  if (secretIssue) {
    block(
      'Potential secret detected in content before writing.\n' +
      `Issue: ${secretIssue}\n` +
      `File: ${filePath}\n\n` +
      'Use ${ENV_VAR} tokens in scripts — never hardcode credentials.'
    );
  }
}

process.exit(0);

// ── Secret detection ──────────────────────────────────────────────────────────

function detectSecrets(content) {
  if (/AKIA[0-9A-Z]{16}/.test(content)) {
    return 'AWS access key pattern (AKIA…)';
  }
  if (/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/.test(content)) {
    return 'PEM private key header';
  }
  if (/ghp_[A-Za-z0-9]{36}/.test(content)) {
    return 'GitHub personal access token (ghp_…)';
  }
  if (/npm_[A-Za-z0-9]{36}/.test(content)) {
    return 'npm token (npm_…)';
  }
  if (/(?:password|token|secret|api_key)\s*=\s*['"][^$\s'"]{8,}['"]/i.test(content)) {
    return 'Hardcoded credential assignment (literal value in password=/token=/secret=)';
  }
  return null;
}
