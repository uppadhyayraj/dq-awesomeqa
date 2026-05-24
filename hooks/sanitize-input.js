#!/usr/bin/env node
/**
 * dq-awesomeqa UserPromptSubmit injection guard.
 *
 * Scans the user prompt for prompt-injection patterns before the model sees it.
 *
 * Exit codes:
 *   0 = allow
 *   2 = BLOCK — hard injection pattern detected; stdout explains why
 *
 * Non-zero-but-not-2 (exit 1) produces a non-blocking warning in Claude Code.
 */

'use strict';

const { readFileSync } = require('fs');

let raw = '';
try { raw = readFileSync(0, 'utf-8').trim(); } catch { process.exit(0); }

let payload;
try { payload = JSON.parse(raw); } catch { process.exit(0); }

const prompt = String(payload.user_prompt ?? '');

// ── Hard block patterns — unambiguous override/injection attempts ─────────────

const HARD_BLOCK = [
  /ignore\s+(all\s+)?(previous|prior|above|system)\s+instructions?/i,
  /disregard\s+(all\s+)?(previous|prior|above|system)\s+instructions?/i,
  /forget\s+(all\s+)?(previous|prior|above|system)\s+instructions?/i,
  /you\s+are\s+now\s+(a\s+|an\s+)?(different|new|unrestricted|uncensored)/i,
  /\[system\]\s*:/i,
  /<\/?system\s*>/i,
  /act\s+as\s+(a\s+|an\s+)?(jailbreak|DAN|unrestricted|uncensored|evil\s+AI)/i,
  /pretend\s+(you\s+are|to\s+be)\s+(a\s+|an\s+)?(unrestricted|evil|hacker)/i,
  /override\s+(safety|security|guardrails|rules|restrictions)/i,
  /new\s+system\s+prompt\s*:/i,
  /\[\[INSTRUCTIONS\]\]/i,
];

// ── Soft warning patterns — suspicious phrasing, could be legitimate ──────────

const SOFT_WARN = [
  /^(new|updated)\s+instructions?:/im,
  /you\s+must\s+now\s+(ignore|forget|disregard)/i,
  /from\s+now\s+on\s+(you|ignore|forget)/i,
  /your\s+new\s+role\s+is/i,
];

const hardMatch = HARD_BLOCK.find(p => p.test(prompt));
if (hardMatch) {
  console.log(
    '\n[dq-awesomeqa-safety] BLOCKED — Prompt injection attempt detected\n' +
    '─'.repeat(60) + '\n' +
    'The prompt contains language that attempts to override model instructions.\n' +
    'If this is a legitimate QA question, rephrase it without instruction-override language.\n' +
    '─'.repeat(60) + '\n'
  );
  process.exit(2);
}

const softMatch = SOFT_WARN.find(p => p.test(prompt));
if (softMatch) {
  // Exit 1: non-blocking, produces a warning in the UI but does not stop the prompt
  console.log(
    '[dq-awesomeqa-safety] WARNING: Prompt contains phrasing that appears in injection attacks.\n' +
    'Proceeding. If this content came from an untrusted source, treat it with caution.'
  );
  process.exit(1);
}

process.exit(0);
