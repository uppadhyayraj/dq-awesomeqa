#!/usr/bin/env node
/**
 * dq-awesomeqa audit log hook.
 *
 * Appends a JSONL entry to .claude/logs/session-<date>-<short-id>.jsonl for
 * every hookable event: user prompt, pre-tool, post-tool, and turn end.
 *
 * Event shapes:
 *   user_prompt  — { ts, session, event, chars, preview }
 *   tool_attempt — { ts, session, event, tool, input }
 *   tool_result  — { ts, session, event, tool, length, preview }
 *   turn_end     — { ts, session, event }
 *
 * This hook never blocks the agent (always exits 0).
 */

'use strict';

const { readFileSync, appendFileSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');
const { createHash } = require('crypto');

let raw = '';
try { raw = readFileSync(0, 'utf-8').trim(); } catch { process.exit(0); }

let payload;
try { payload = JSON.parse(raw); } catch { process.exit(0); }

const projectRoot = process.cwd();
const logDir = join(projectRoot, '.claude', 'logs');
try {
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
} catch { process.exit(0); }

const rawId = String(payload.session_id ?? process.pid);
const sessionShort = createHash('sha256').update(rawId).digest('hex').slice(0, 8);
const dateStr = new Date().toISOString().slice(0, 10);
const logFile = join(logDir, `session-${dateStr}-${sessionShort}.jsonl`);

const ts = new Date().toISOString();
const base = { ts, session: sessionShort };
let record;

if ('user_prompt' in payload) {
  const text = String(payload.user_prompt ?? '');
  record = {
    ...base,
    event: 'user_prompt',
    chars: text.length,
    preview: text.slice(0, 120).replace(/[\n\r\t]/g, ' ')
  };
} else if ('tool_name' in payload && !('tool_response' in payload)) {
  record = {
    ...base,
    event: 'tool_attempt',
    tool: payload.tool_name ?? '',
    input: redactSecrets(payload.tool_input ?? {})
  };
} else if ('tool_name' in payload && 'tool_response' in payload) {
  const resp = String(payload.tool_response ?? '');
  record = {
    ...base,
    event: 'tool_result',
    tool: payload.tool_name ?? '',
    length: resp.length,
    preview: resp.slice(0, 200).replace(/[\n\r\t]/g, ' ')
  };
} else {
  record = { ...base, event: 'turn_end' };
}

try {
  appendFileSync(logFile, JSON.stringify(record) + '\n', { encoding: 'utf-8' });
} catch {
  // Never block over a logging failure
}

process.exit(0);

function redactSecrets(input) {
  if (typeof input !== 'object' || input === null) {
    return String(input).slice(0, 500);
  }
  const safe = {};
  for (const [k, v] of Object.entries(input)) {
    const str = String(v);
    if (isSecretKey(k) || isSecretValue(str)) {
      safe[k] = '<redacted>';
    } else {
      safe[k] = str.slice(0, 500);
    }
  }
  return safe;
}

function isSecretKey(key) {
  return /password|secret|token|key|credential|auth|api[_-]?key/i.test(key);
}

function isSecretValue(value) {
  if (/AKIA[0-9A-Z]{16}/.test(value)) return true;
  if (/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/.test(value)) return true;
  if (/ghp_[A-Za-z0-9]{36}|npm_[A-Za-z0-9]{36}/.test(value)) return true;
  return false;
}
