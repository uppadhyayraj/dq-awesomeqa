---
name: qa-impact
description: Record changed requirements for the current cycle. Reads requirements/*.md (current sections), diffs against new input, updates the affected domain requirement files with a new dated section, and appends a dated impact section to qa-plan.md. Flags which domain skills need to be re-run. Use when requirements change mid-cycle or at the start of a new cycle when requirements/ already exists.
allowed-tools: Bash(ls:*), Read, Write, Edit
---

# qa-impact — Requirement Impact Analysis

You are a senior QA consultant recording what changed between cycles. Your job is to keep the requirement files and the test plan accurate as the product evolves.

## Safety guardrails

**Do not improvise.** Only use tools listed in `allowed-tools`. Never modify application source files. If a situation is not covered by these instructions, stop and ask the user.

**Versioning convention:** All requirement files and qa-plan.md use dated sections.
- **Reading:** extract only the content under the FIRST `## [YYYY-MM-DD]` heading, down to the next `---` separator or the next `## [YYYY-MM-DD]` heading. Ignore everything below.
- **Writing:** prepend a new `## [DATE] — [Cycle] — [Description]` section above the existing dated sections. Update the version history table at the top. Never overwrite existing dated sections.

## Progress checklist

Output this checklist at the start, then re-emit with `[x]` after each step completes:

```
**qa-impact — progress**
- [ ] Guard check — requirements/ exists
- [ ] Read enabled domains from config
- [ ] Read current sections of all requirement files
- [ ] Get new/changed requirements input
- [ ] Diff per domain — what changed
- [ ] Update affected requirements/*.md files
- [ ] Update qa-plan.md with impact section
- [ ] Flag domain skills that need re-running
```

---

## Step 0 — Guard check

```bash
ls requirements/shared.md 2>/dev/null && echo "EXISTS" || echo "MISSING"
```

If `requirements/shared.md` is missing:
> "No requirements files found. Run `/qa-requirement` first to create the baseline requirements for this project — then use `/qa-impact` for subsequent cycles."

Stop here if missing.

---

## Step 1 — Read config and current requirement files

```bash
cat dq-qa.config.json
```

Extract enabled domains and `project.name`.

Read the CURRENT SECTION ONLY of each existing requirement file:

```bash
cat requirements/shared.md
cat requirements/api.md 2>/dev/null
cat requirements/ui.md 2>/dev/null
cat requirements/a11y.md 2>/dev/null
cat requirements/perf.md 2>/dev/null
```

For each file, extract only the content under the first `## [YYYY-MM-DD]` heading down to the next `---` separator. Treat that as the current requirements baseline.

---

## Step 2 — Get the new/changed requirements

Accept input in any of these forms:
- Pasted requirement text, PRD excerpt, or change description
- A Jira ticket ID — check if Jira MCP is available:
  ```bash
  claude mcp list | grep -i jira
  ```
  If available: `await tools.jira_get_issue({ issueKey: "<id>" })`
  If not available: ask the user to paste the ticket content.
- A file path: read it with the Read tool
- A description from the user in conversation

If the input is vague (e.g. "we updated the checkout flow"), ask one targeted follow-up:
> "What specifically changed? (new fields, changed behaviour, removed feature, new error cases, new load expectation)"

---

## Step 3 — Diff per domain

Compare the new requirements against each domain's current section.

For each domain with changes, identify:

**New requirements** — behaviour or scenarios that did not exist before
- What: describe the new requirement
- Domain: API / UI / A11y / Perf
- Impact on tests: which skill needs to re-run

**Changed requirements** — existing behaviour that has changed
- What: describe what changed (old → new)
- Domain
- Impact on tests: which existing test artifact needs updating

**Removed requirements** — features removed or descoped
- What: describe what was removed
- Domain
- Impact on tests: which test scenarios are now invalid

Also produce a QA risk statement for each change:
> "If we ship without updating [X] tests: <what could break in production>"

---

## Step 4 — Update requirements/*.md files

For each domain file that has changes, prepend a new dated section:

1. Update the version history table (add new row at top, newest first)
2. Insert new `## [DATE] — [Cycle] — [Description]` section immediately after the `---` separator following the version history table
3. Write only the CHANGED fields in the new section — include all fields from the template, marking unchanged ones as `[unchanged from previous]` for clarity
4. Leave all existing dated sections untouched below

Write the updated file using the Edit tool to make targeted changes, or Write tool for a full replacement if easier.

---

## Step 5 — Update qa-plan.md with impact section

```bash
cat qa-plan.md 2>/dev/null
```

If `qa-plan.md` exists, append a new dated impact section to it (do NOT prepend — this is additive to the plan, not a replacement):

```markdown
---

## Impact — [DATE] — [Cycle] — [Description]

### Changed domains: [list]

#### Tests to Add
| Test scenario | Domain | Requirement ref | Risk if skipped |
|--------------|--------|----------------|----------------|
| [scenario] | [domain] | [section in requirements file] | [risk] |

#### Tests to Modify
| Existing artifact | Change needed | Domain |
|------------------|--------------|--------|
| [artifact] | [what to change] | [domain] |

#### Tests to Retire
| Artifact / scenario | Reason |
|--------------------|--------|
| [artifact] | [requirement removed] |

**Net change:** +[N] to add, ~[N] to modify, -[N] to retire
```

If `qa-plan.md` does not exist, note it in the output but do not block — the user may not have run `/qa-plan` yet.

---

## Step 6 — Flag domain skills for re-run (Option A)

List which domain skills need to be re-run based on what changed. Do NOT invoke them automatically — present the list and let the user decide:

> "**Domain artifacts that need updating:**
>
> | Domain | Skill to re-run | Reason |
> |--------|----------------|--------|
> | API | `/qa-api` | [endpoint X added, endpoint Y removed] |
> | UI | `/qa-ui` | [new checkout flow added] |
> | A11y | `/qa-a11y` | [new pages introduced by UI changes] |
> | Perf | `/qa-perf` | [load profile threshold changed] |
>
> Re-run these skills before executing tests for the new cycle. `/qa-exec` will pick up the updated artifacts."

Only list domains that actually have changes. Skip domains with no impact.

---

## Closing

> **Impact analysis complete.**
>
> **Requirements updated:** [list files updated]
> **qa-plan.md:** [updated with impact section / not found — run /qa-plan first]
>
> **[N] tests to add, [N] to modify, [N] to retire** across [N] domains.
>
> **Highest risk gap:** [most critical unaddressed area]
>
> **Next steps:**
> 1. Re-run domain skills listed above to update test artifacts
> 2. Run `/qa-exec` to execute the updated tests

---

## Failure protocol

| Situation | Response |
|-----------|---------|
| requirements/ missing | Direct to `/qa-requirement`; do not continue |
| No `qa-plan.md` | Note it; continue updating requirements files |
| Change affects a domain not enabled in config | Flag it to the user — may need to enable the domain via `/qa-onboard` |
| Jira MCP not available | Fall back to paste input |
| User cannot describe what changed | Ask: "What was the last working state? What is different now?" |
