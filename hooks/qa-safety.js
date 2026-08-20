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

// ── Shared file classifiers ───────────────────────────────────────────────────
// Application source. Extended beyond the original list: shell, SQL, infra,
// JVM/BEAM/other languages were previously unprotected.
const SOURCE_EXT = /\.(ts|tsx|mjs|cjs|jsx|js|py|java|go|rb|php|cs|cpp|cc|c|h|hpp|rs|swift|kt|kts|vue|svelte|sh|bash|zsh|ps1|sql|tf|tfvars|gradle|groovy|scala|clj|cljs|ex|exs|erl|lua|dart|pl|r|vb|m|mm)$/i;

// Project / build files that carry a "safe" extension but are still source.
const PROJECT_FILE = /(^|\/)(Dockerfile|Makefile|Gemfile|Rakefile|Procfile|package\.json|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|tsconfig[^/]*\.json|jsconfig\.json|pom\.xml|build\.gradle[^/]*|[^/]+\.csproj|[^/]+\.sln|docker-compose[^/]*\.ya?ml|\.env[^/]*)$/i;

// CI / deployment pipeline definitions.
const CI_PATH = /(^|\/)(\.github\/workflows|\.gitlab-ci\.yml|\.circleci|azure-pipelines[^/]*\.ya?ml|Jenkinsfile)/i;

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

  // 11. Writing to source files via the shell (bypasses the Write/Edit checks)
  const redirect = cmd.match(/>>?\s*([^\s;|&<>]+)/);
  if (redirect && (SOURCE_EXT.test(redirect[1]) || PROJECT_FILE.test(redirect[1]) || CI_PATH.test(redirect[1]))) {
    block(
      'Redirecting shell output into an application source file is not allowed during QA sessions.\n' +
      `Target: ${redirect[1]}`
    );
  }

  const inPlace = cmd.match(/\b(?:sed|perl)\b[^;|&]*\s-i(?:\.\S+)?\b[^;|&]*?([^\s;|&]+)\s*$/);
  if (inPlace && (SOURCE_EXT.test(inPlace[1]) || PROJECT_FILE.test(inPlace[1]) || CI_PATH.test(inPlace[1]))) {
    block(
      'In-place editing (sed -i / perl -i) of application source files is not allowed during QA sessions.\n' +
      `Target: ${inPlace[1]}`
    );
  }

  const teeTarget = cmd.match(/\btee\b(?:\s+-a)?\s+([^\s;|&]+)/);
  if (teeTarget && (SOURCE_EXT.test(teeTarget[1]) || PROJECT_FILE.test(teeTarget[1]) || CI_PATH.test(teeTarget[1]))) {
    block(
      'Writing to an application source file via tee is not allowed during QA sessions.\n' +
      `Target: ${teeTarget[1]}`
    );
  }

  // 12. Destructive git operations against the working tree or history
  if (/\bgit\s+reset\s+--hard\b/i.test(cmd) ||
      /\bgit\s+clean\s+-[a-z]*[fd]/i.test(cmd) ||
      /\bgit\s+checkout\s+--\s/i.test(cmd) ||
      /\bgit\s+restore\b(?!.*--staged\s*$)/i.test(cmd) ||
      /\bgit\s+push\b.*(--force|-f\b)/i.test(cmd)) {
    block(
      'Destructive git operations are not allowed during QA sessions.\n' +
      'They can discard the developer\'s uncommitted work. Report the issue instead.'
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

  // Always allow: this plugin's own files — anchored to the plugin root, NOT a bare
  // path segment. Matching '/hooks/' anywhere let src/hooks/useAuth.ts through.
  const projectRoot = process.cwd().replace(/\\/g, '/');
  const pluginRoot = String(process.env.CLAUDE_PLUGIN_ROOT || '').replace(/\\/g, '/');
  // Only trust the plugin root when it lives OUTSIDE the project under test.
  // If the plugin is installed inside the project, this allow would disable
  // every source-code check below.
  if (pluginRoot && pluginRoot !== projectRoot &&
      !projectRoot.startsWith(pluginRoot + '/') &&
      filePath.startsWith(pluginRoot + '/')) process.exit(0);

  // Always allow: QA output artifacts and config
  if (/(^|\/)(qa-reports|a11y-artifacts)\//i.test(filePath)) process.exit(0);
  if (/dq-qa\.config\.json$/i.test(filePath)) process.exit(0);
  if (/qa-(plan|summary|triage|coverage|exec)[^/]*\.(md|json)$/i.test(filePath)) process.exit(0);

  // 7. Block application source code edits.
  // Runs BEFORE the data/config allow-list so package.json et al cannot slip through.
  if (SOURCE_EXT.test(filePath) || PROJECT_FILE.test(filePath) || CI_PATH.test(filePath)) {
    block(
      'Editing application source or project files is not allowed during QA sessions.\n' +
      `File: ${filePath}\n\n` +
      'QA role is read-only observation and testing. Report issues to the developer.'
    );
  }

  // Allow remaining data / documentation files
  if (/\.(yaml|yml|json|html|md|txt|csv|log)$/i.test(filePath)) process.exit(0);

  // 8. Block writes outside project root (excluding /tmp)
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
