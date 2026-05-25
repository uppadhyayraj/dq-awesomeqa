# Artifact Versioning Convention

All artifacts produced by dq-awesomeqa skills use dated sections to preserve a full change history.

## Structure of every versioned artifact

```markdown
# [Artifact Title] — [Project Name]

<!-- VERSION HISTORY — append a new row here each cycle, newest at top -->
| Date | Cycle | Summary |
|------|-------|---------|
| YYYY-MM-DD | [cycle name] | [one-line summary of this version] |

---
<!-- CURRENT — skills read only the first dated section below this line -->

## [YYYY-MM-DD] — [Cycle] — [Description]

[current content]

---
<!-- HISTORY — skills ignore everything below this line when reading -->

## [YYYY-MM-DD] — [Previous Cycle] — [Description]

[previous content]
```

## Rules for READING (all skills)

1. Find the FIRST `## [YYYY-MM-DD]` heading in the file.
2. Read all content from that heading down to the next `---` separator or the next `## [YYYY-MM-DD]` heading (whichever comes first).
3. **Stop there.** Everything below is historical record — do not process it.

## Rules for WRITING (when updating an existing artifact)

1. Add a new row at the **top** of the version history table (newest first).
2. Insert a new `## [DATE] — [Cycle] — [Description]` section immediately after the `---` separator that follows the version history table.
3. Push the previous current section down (it becomes history).
4. **Never overwrite or delete existing dated sections.**

## Rules for WRITING (when creating a new artifact)

Use the template for that artifact type (this directory). Replace all `[PLACEHOLDER]` tokens with actual values. Add the initial row to the version history table.
