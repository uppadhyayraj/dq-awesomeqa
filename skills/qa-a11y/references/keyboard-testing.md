# Keyboard Navigation Testing Reference

## When to use `a11y-cli keyboard`

Run `a11y-cli keyboard` when you need to verify that:
- All interactive elements are reachable via Tab/Shift+Tab
- Focus order matches the visual/logical reading order
- Keyboard traps are not present (focus cannot escape modal dialogs, etc.)
- Skip navigation links exist and work correctly
- Focus indicators are visible on focused elements

This is required for WCAG 2.1 Success Criteria:
- **2.1.1** Keyboard (Level A) — all functionality available via keyboard
- **2.1.2** No Keyboard Trap (Level A) — focus can always be moved away
- **2.4.3** Focus Order (Level A) — logical, meaningful focus sequence
- **2.4.7** Focus Visible (Level AA) — keyboard focus indicator is visible
- **2.4.11** Focus Appearance (Level AA, WCAG 2.2) — focus indicator meets size/contrast thresholds

## Basic usage

```bash
# Test keyboard navigation on the active playwright-cli page
a11y-cli keyboard -s=audit

# Navigate to a URL then test
a11y-cli keyboard https://example.com

# Start tabbing from a specific element
a11y-cli keyboard -s=audit --start-selector "#skip-link"

# Verify elements are reachable in a specific order
a11y-cli keyboard -s=audit --expected-order "#skip-link" "#main-nav" "#search-input" "#content"

# Check for keyboard traps (default: true)
a11y-cli keyboard -s=audit --check-traps
```

## What the test checks

The keyboard test simulates up to 50 Tab keypresses and records:

| Check | What it verifies |
|-------|-----------------|
| **Tab order** | Sequence of elements receiving focus via Tab |
| **Focus indicators** | Whether each focused element has a visible outline/border |
| **Keyboard traps** | Whether focus can escape modal dialogs and widgets |
| **Skip links** | Presence of `#skip-to-content` or similar skip navigation links |

## Interpreting results

### Tab order output
```
Focus 1: button#menu-toggle — "Open Menu" [visible indicator: yes]
Focus 2: a#skip-link — "Skip to main content" [visible indicator: yes]
Focus 3: input#search — "" [visible indicator: no]  ← issue
```

### Common issues

| Issue | WCAG Criterion | Fix |
|-------|---------------|-----|
| Element not reachable by keyboard | 2.1.1 | Add `tabindex="0"` or use native interactive elements |
| Focus trapped in modal | 2.1.2 | Implement focus trap that allows Escape to dismiss |
| Focus jumps unexpectedly | 2.4.3 | Fix DOM order or use `tabindex` to control sequence |
| No visible focus ring | 2.4.7 | Add `:focus { outline: 2px solid ... }` — never use `outline: none` without replacement |
| Skip link missing | 2.4.1 | Add `<a href="#main">Skip to main content</a>` as first focusable element |

## Expected order verification

When `--expected-order` is provided, the test checks that each listed selector appears in the tab sequence and in the specified order:

```bash
a11y-cli keyboard -s=audit \
  --expected-order "#skip-link" "#logo" "#nav-home" "#nav-about" "#search" "#main-heading"
```

If an element from `--expected-order` is not found in the tab sequence, or the order is wrong, a violation is reported.

## Combine with scan

```bash
# Run axe scan and keyboard test together
a11y-cli scan https://example.com --include-keyboard

# Or run separately and include both in the report
a11y-cli scan -s=audit --page-name "Homepage"
a11y-cli keyboard -s=audit
a11y-cli report -s=audit --format html
```
