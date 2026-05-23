# WCAG Scanning Reference

## When to use `a11y-cli scan`

Run `a11y-cli scan` any time you need to identify WCAG violations on a web page:

- After navigating to a new page in a `playwright-cli` session
- Before and after a UI change to detect regressions
- As part of CI/CD to gate releases on accessibility compliance
- For generating compliance reports for legal or audit purposes

## Conformance levels

| Level | Flag | Covers |
|-------|------|--------|
| A | `--wcag-level A` | Minimum baseline — critical barriers for users with disabilities |
| AA | `--wcag-level AA` | Legal standard in most jurisdictions (default) |
| AAA | `--wcag-level AAA` | Highest conformance — aspirational, not always achievable |

## Jurisdiction-specific compliance references

Use `--jurisdiction` to include legal references in the report:

| Code | Standard |
|------|----------|
| `US` | ADA Title III, Section 508, WCAG 2.1 AA |
| `NZ` | NZ Government Web Standards, WCAG 2.1 AA |
| `AU` | Disability Discrimination Act, WCAG 2.1 AA |
| `CA` | AODA, EN 301 549, WCAG 2.1 AA |
| `EU` | EN 301 549, Web Accessibility Directive, WCAG 2.1 AA |
| `UK` | Public Sector Bodies Accessibility Regulations, WCAG 2.1 AA |

## Rule filtering

### Enable specific rules only
```bash
a11y-cli scan https://example.com --rules wcag2a wcag2aa
a11y-cli scan https://example.com --rules color-contrast label
```

### Disable specific rules
```bash
a11y-cli scan https://example.com --exclude-rules color-contrast
```

Common axe-core rule IDs: `color-contrast`, `label`, `aria-required-attr`, `image-alt`, `link-name`, `button-name`, `landmark-one-main`, `page-has-heading-one`, `region`, `focus-order-semantics`

## Running against a live session

The most efficient pattern: navigate with `playwright-cli`, then scan without re-navigating:

```bash
# Start session and navigate
playwright-cli goto https://example.com -s=audit
playwright-cli click e5 -s=audit                  # log in or navigate deeper

# Scan current state
a11y-cli scan -s=audit --page-name "Dashboard"

# Navigate to next page, scan again
playwright-cli click e12 -s=audit
a11y-cli scan-current -s=audit --page-name "Settings"

# Generate combined report for all scanned pages
a11y-cli report -s=audit --format html
```

## CI/CD usage

```bash
# Fail build if violations found
a11y-cli scan https://staging.example.com --ci --wcag-level AA

# Machine-readable output for downstream parsing
a11y-cli scan https://example.com --raw --format json --ci
```

Exit codes:
- `0` — scan completed, no violations (or `--ci` not set)
- `1` — violations found (when `--ci` is set), or scan failed

## Including keyboard test in scan

```bash
a11y-cli scan https://example.com --include-keyboard
```

Runs both axe-core scan and keyboard navigation test in a single command.

## Output files

Each scan writes to `--output-dir` (default: `./a11y-artifacts`):
- `scan-<pageName>-<timestamp>.json` — raw results with enriched impact/fix data
- `report-<timestamp>.html` — visual HTML report (if `--format html` or `both`)
- `report-<timestamp>.json` — machine-readable report (if `--format json` or `both`)
- `screenshots/evidence-<n>.png` — violation screenshots (unless `--no-screenshots`)
