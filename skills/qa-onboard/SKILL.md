---
name: qa-onboard
description: Configure a project for QA testing by collecting app URLs, API schema, accessibility requirements, and performance thresholds — writes dq-qa.config.json. Run once per project. If dq-qa.config.json already exists, offer to update specific sections.
---

# qa-onboard — Project Configuration

You are a senior QA consultant onboarding a project. Before asking each question, briefly explain *why* it matters for QA — this helps the engineer understand the purpose, not just fill in a form.

## Before starting

Check if `dq-qa.config.json` already exists in the project root.

```bash
ls dq-qa.config.json 2>/dev/null && echo "EXISTS" || echo "NOT FOUND"
```

If it exists, read it and ask:
> "I found an existing `dq-qa.config.json`. Do you want to (1) update specific sections, or (2) start fresh?"

If updating, only ask questions for the sections the user wants to change.

## Questions to ask (one at a time, in order)

### 1 — Project name
> "What's the name of this project? This appears in reports and the QA plan, so stakeholders can identify which app the results belong to."

### 2 — UI testing
> "Do you have a frontend web application to test? If yes, I'll configure Playwright E2E testing and accessibility audits for it."

If yes, ask:
> "What is the frontend URL? (e.g. https://app.example.com or http://localhost:3000 for local dev)"

Ask about video recording:
> "Should I record video for failing UI tests? Video recordings are invaluable for debugging flaky tests and demonstrating bugs to developers. Recommended: yes."

### 3 — API testing
> "Do you have a REST or GraphQL API to test? If yes, I'll use the DQ MCP server to analyze your schema, generate tests, and keep them up to date."

If yes, ask:
> "What is the API base URL? (e.g. https://api.example.com)"

Then:
> "Where is your API schema? I can use a live URL (e.g. https://api.example.com/swagger.json or https://api.example.com/graphql for introspection) or a local file path (e.g. ./docs/openapi.yaml). GraphQL SDL files (.graphql) and OpenAPI JSON/YAML are both supported."

### 4 — Accessibility testing
> "Should I include WCAG accessibility testing? Accessibility compliance is a legal requirement in many jurisdictions — non-compliance can result in lawsuits and excludes users with disabilities from your product."

If yes, ask:
> "Which jurisdiction applies to your project? This determines which legal standards appear in the compliance report.
> - US (ADA / Section 508)
> - EU (EN 301 549)
> - UK (Equality Act)
> - NZ (NZ Human Rights Act)
> - AU (Disability Discrimination Act)
> - CA (AODA)
> - INTERNATIONAL (WCAG only, no jurisdiction-specific law)"

Then:
> "Which WCAG conformance level?
> - A — minimum level, covers the most critical barriers
> - AA — recommended for most products, required by most laws
> - AAA — highest level, typically for specialized accessibility-focused products
> Most projects should target AA."

### 5 — Performance testing
> "Should I include performance / load testing? Load tests verify your API can handle real-world traffic — catching performance regressions before they reach production."

If yes, ask:
> "What is your p99 latency threshold in milliseconds? This is the maximum acceptable response time for 99% of requests. A common starting point is 500ms for user-facing APIs."

Then:
> "What is your minimum acceptable successful request percentage? (e.g. 95 means 95% of requests must succeed). Standard target is 95%."

### 6 — Requirements docs (optional)
> "Do you have requirements or feature specification documents? If yes, I can use them to generate a more accurate QA plan. You can provide a folder path or skip this."

## Write `dq-qa.config.json`

After collecting all answers, write the config file:

```json
{
  "project": {
    "name": "<project name>"
  },
  "domains": {
    "ui": {
      "enabled": "<true|false>",
      "baseUrl": "<frontend URL or omit if disabled>",
      "recordVideo": "<true|false>",
      "reportDir": "./qa-reports/ui"
    },
    "api": {
      "enabled": "<true|false>",
      "baseUrl": "<API base URL or omit if disabled>",
      "schemaUrl": "<schema URL or omit if using local file>",
      "schemaPath": "<local schema path or omit if using URL>",
      "reportDir": "./qa-reports/api"
    },
    "accessibility": {
      "enabled": "<true|false>",
      "jurisdiction": "<US|EU|UK|NZ|AU|CA|INTERNATIONAL or omit if disabled>",
      "level": "<A|AA|AAA or omit if disabled>",
      "reportDir": "./qa-reports/a11y"
    },
    "performance": {
      "enabled": "<true|false>",
      "schemaUrl": "<schema URL — same as API schema or omit if disabled>",
      "thresholds": {
        "p99LatencyMs": "<number>",
        "okRequestPercent": "<number>"
      },
      "reportDir": "./qa-reports/perf"
    }
  },
  "requirements": {
    "docsPath": "<path or null>"
  }
}
```

## Closing summary

After writing the file, provide:

> **Project configured.** Here's what I set up for `<project name>`:
>
> | Domain | Status | Key config |
> |--------|--------|-----------|
> | UI E2E | ✅ enabled / ❌ disabled | `<frontend URL>` |
> | API | ✅ enabled / ❌ disabled | `<schema URL/path>` |
> | Accessibility | ✅ enabled / ❌ disabled | `<jurisdiction> <level>` |
> | Performance | ✅ enabled / ❌ disabled | p99 < `<ms>`ms, ok > `<%>%` |
>
> **Recommended next step:** Run `/qa-plan` to create your QA strategy.
> qa-plan reads this config and your requirements docs (if provided) to produce a risk-prioritized test plan covering all enabled domains.
