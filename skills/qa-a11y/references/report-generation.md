# Report Generation Reference

## When to use `a11y-cli report`

Run `a11y-cli report` after one or more scans to produce a consolidated HTML or JSON compliance report. The report aggregates all scan results saved in the current session's output directory.

Scans accumulate automatically whenever `--add-to-session` is set (the default). You only need to call `report` once at the end of a flow.

## Basic usage

```bash
# Generate both HTML and JSON (default)
a11y-cli report -s=audit

# HTML only
a11y-cli report -s=audit --format html

# JSON only (useful for downstream tools)
a11y-cli report -s=audit --format json

# Skip screenshots in report
a11y-cli report -s=audit --format html --no-screenshots

# Report on a specific past session
a11y-cli report --session-id checkout-audit-1713200000000 --format html
```

## Output directory structure

Reports are written to `--output-dir` (default: `./a11y-artifacts`):

```
a11y-artifacts/
└── session-<timestamp>/
    ├── scan-Home-1713200000000.json
    ├── scan-Cart-1713200000001.json
    ├── keyboard-Checkout-1713200000002.json
    ├── report-1713200000003.html       ← HTML compliance report
    ├── report-1713200000003.json       ← JSON compliance report
    └── screenshots/
        ├── evidence-0.png
        ├── evidence-1.png
        └── evidence-2.png
```

## HTML report contents

The HTML report includes:

- **Summary dashboard** — total violations by severity (critical/serious/moderate/minor), pass rate, pages scanned
- **Per-page results** — each scanned page with its violations grouped by rule
- **Violation details** — description, WCAG criterion, impact level, affected DOM element, fix suggestions
- **Legal references** — jurisdiction-specific compliance links (if `--jurisdiction` was set during scan)
- **Keyboard test results** — tab order, focus indicator status, trap detections
- **Screenshots** — visual evidence linked to each violation (unless `--no-screenshots`)
- **Fix complexity** — estimated effort (low/medium/high) per violation

## JSON report schema

```json
{
  "generatedAt": "2024-04-15T10:00:00Z",
  "sessionId": "session-1713200000000",
  "summary": {
    "totalViolations": 12,
    "bySeverity": { "critical": 2, "serious": 4, "moderate": 5, "minor": 1 },
    "pagesScanned": 3,
    "wcagLevel": "AA",
    "jurisdiction": "US"
  },
  "pages": [
    {
      "url": "https://example.com",
      "pageName": "Home",
      "scannedAt": "2024-04-15T09:55:00Z",
      "violations": [ ... ],
      "passes": [ ... ],
      "incomplete": [ ... ]
    }
  ],
  "keyboardResults": [ ... ]
}
```

## CI/CD integration

```bash
# Scan and generate report — exit 1 if violations found
a11y-cli scan https://example.com --ci --format json --output-dir ./reports
echo "Exit code: $?"

# In a YAML pipeline (GitHub Actions example):
# - run: a11y-cli scan ${{ env.STAGING_URL }} --ci --format json
#   continue-on-error: false
```

Exit codes:
- `0` — no violations (or `--ci` not set)
- `1` — violations found when `--ci` is set, or command failed

## Generating report in a YAML script

Add a `report` step at the end of your script:

```yaml
steps:
  - command: scan
    url: https://example.com
    page_name: Home

  - command: keyboard
    page_name: Home

  - command: report
    format: html
    include_screenshots: true
```

## Customising output location

```bash
a11y-cli scan https://example.com --output-dir ./ci/accessibility-reports
a11y-cli report --output-dir ./ci/accessibility-reports --format html
```

Both commands must use the same `--output-dir` so `report` can find the scan data.
