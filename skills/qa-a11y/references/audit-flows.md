# Audit Flows Reference

## Recommended workflow for new apps — explore live, then write YAML

Before writing any YAML script for an unfamiliar app, always go through two phases:

### Phase 1 — Live exploration (get real refs, run the audit)

Use `playwright-cli snapshot` after every navigation to get the real element refs for that page. Never guess selectors.

```bash
# Open the browser
playwright-cli open https://example.com -s=audit

# Snapshot to see what's on the page — note the refs (e5, e12, e22 ...)
playwright-cli snapshot -s=audit

# Act using snapshot refs
playwright-cli fill e5 user@example.com -s=audit
playwright-cli fill e8 Pass123 -s=audit
playwright-cli click e12 -s=audit

# After navigation — snapshot again to get fresh refs for the new page
playwright-cli snapshot -s=audit

# Scan each page for accessibility issues
a11y-cli scan -s=audit --page-name "Login"

# Repeat: snapshot → act → scan for every page in the flow
playwright-cli click e22 -s=audit        # e.g. "Add to cart" ref from snapshot
a11y-cli scan -s=audit --page-name "Cart"

# Generate the report at the end
a11y-cli report -s=audit --format html
```

### Phase 2 — Resolve stable selectors, write the YAML

Snapshot refs are session-scoped — they change on every page load. Before writing the YAML, resolve a stable CSS selector for each element you interacted with:

```bash
# For each interactive element, eval to find a stable identifier
playwright-cli eval "document.querySelector('[placeholder=\"Username\"]')?.id" -s=audit
# → "user-name"  →  use: ref: '#user-name'

playwright-cli eval "document.querySelector('[type=\"submit\"]')?.id" -s=audit
# → "login-button"  →  use: ref: '#login-button'

# If no id, try name or data-testid
playwright-cli eval "document.querySelector('[type=\"password\"]')?.name" -s=audit
# → "password"  →  use: ref: '[name="password"]'
```

Priority for stable selectors: `#id` > `[name="…"]` > `[data-testid="…"]` > shortest unique CSS selector.

Write the YAML using these resolved selectors — not the ephemeral `e5`/`e12` refs:

```yaml
version: '1.0'
name: My App Audit
config:
  session: my-app-audit
  output_dir: ./a11y-artifacts
  wcag_level: AA
  format: html
  jurisdiction: US

steps:
  - command: open
    url: https://example.com
    headed: true

  - command: scan
    page_name: Login

  - command: fill
    ref: '#user-name'       # stable id from Phase 2 eval
    value: user@example.com

  - command: fill
    ref: '[name="password"]'  # stable name attr from Phase 2 eval
    value: Pass123

  - command: click
    ref: '#login-button'    # stable id from Phase 2 eval

  - command: scan
    page_name: Dashboard

  - command: report
    format: html

  - command: close
```

---

## Multi-page audit patterns

### Pattern 1 — Inline commands (quick audit)

```bash
playwright-cli goto https://example.com -s=audit
a11y-cli scan -s=audit --page-name "Home"

playwright-cli click e12 -s=audit          # navigate to About page
a11y-cli scan-current -s=audit --page-name "About"

playwright-cli goto https://example.com/contact -s=audit
a11y-cli scan -s=audit --page-name "Contact"
a11y-cli keyboard -s=audit

a11y-cli report -s=audit --format html
```

### Pattern 2 — YAML script (reproducible, source-controlled)

```bash
a11y-cli script my-audit.yaml
a11y-cli script my-audit.yaml --ci          # fail on violations
a11y-cli script - < my-audit.yaml           # read script from stdin
```

### Pattern 3 — REPL (interactive exploration)

```bash
a11y-cli repl -s=audit
a11y> goto https://example.com
a11y> scan
a11y> click e15
a11y> scan-current --page-name "Product Detail"
a11y> keyboard
a11y> report --format html
a11y> .exit
```

---

## YAML script format

```yaml
version: '1.0'
name: Checkout Flow Audit
description: Full accessibility audit of the checkout funnel

config:
  session: checkout-audit          # playwright-cli session name
  output_dir: ./reports            # where to write reports
  wcag_level: AA                   # A | AA | AAA
  format: both                     # json | html | both
  jurisdiction: US                 # optional legal references
  no_screenshots: false            # set true to skip visual evidence

steps:
  - command: goto
    url: https://shop.example.com/login

  - command: fill
    ref: '#email'
    value: test@example.com

  - command: fill
    ref: '#password'
    value: Pass123!
    submit: true                   # press Enter after filling

  - command: scan
    page_name: Dashboard
    include_keyboard: true

  - command: goto
    url: https://shop.example.com/products

  - command: scan
    page_name: Product Listing
    level: AA                      # override wcag_level for this step
    jurisdiction: US

  - command: click
    ref: e42                       # ephemeral snapshot ref — only valid in current session
                                   # resolve stable selector via eval before saving to YAML

  - command: scan-current
    page_name: Product Detail

  - command: screenshot
    filename: ./reports/product-detail.png

  - command: goto
    url: https://shop.example.com/cart

  - command: scan
    page_name: Cart
    include_keyboard: true
    exclude_rules:
      - color-contrast             # suppress known false positive

  - command: goto
    url: https://shop.example.com/checkout

  - command: scan
    page_name: Checkout
    rules:
      - wcag2a
      - wcag2aa
      - label
      - aria-required-attr

  - command: keyboard
    page_name: Checkout Keyboard
    check_traps: true

  - command: report
    format: both
    include_screenshots: true
```

## All supported step commands

### playwright-cli pass-throughs

| Command | Required fields | Optional fields |
|---------|----------------|-----------------|
| `goto` | `url` | — |
| `click` | `ref` | `button` (left/right/middle) |
| `fill` | `ref`, `value` | `submit` (bool) |
| `press` | `key` | — |
| `hover` | `ref` | — |
| `select` | `ref`, `value` | — |
| `snapshot` | — | `filename` |
| `screenshot` | — | `filename`, `ref` |
| `state-save` | `filename` | — |
| `state-load` | `filename` | — |
| `wait` | `timeout` (ms) | — |
| `eval` | `expression` | — |

### a11y-cli commands

| Command | Optional fields |
|---------|----------------|
| `scan` | `url`, `page_name`, `level`, `jurisdiction`, `rules[]`, `exclude_rules[]`, `include_keyboard`, `add_to_session` |
| `scan-current` | `page_name`, `add_to_session` |
| `keyboard` | `url`, `start_selector`, `expected_order[]`, `check_traps` |
| `screen-reader` | `check_landmarks`, `check_headings`, `check_aria` |
| `contrast` | `selectors[]`, `level` |
| `alt-text` | `include_decorative` |
| `headings` | — |
| `form` | `selector` |
| `report` | `format`, `include_screenshots` |

## Authenticated flow example

```yaml
version: '1.0'
name: Authenticated App Audit
config:
  session: app-audit
  output_dir: ./a11y-reports
  wcag_level: AA
  jurisdiction: AU

steps:
  # Load saved auth state to skip login
  - command: state-load
    filename: ./auth-state.json

  - command: goto
    url: https://app.example.com/dashboard

  - command: scan
    page_name: Dashboard

  - command: scan
    page_name: Dashboard Keyboard
    include_keyboard: true

  - command: goto
    url: https://app.example.com/settings

  - command: scan
    page_name: Settings

  - command: form
    selector: '#profile-form'

  - command: headings

  - command: contrast
    level: AA

  - command: report
    format: html
```

## CI/CD YAML example

```yaml
version: '1.0'
name: CI Accessibility Gate
config:
  output_dir: ./ci-reports
  wcag_level: AA
  format: json
  no_screenshots: true

steps:
  - command: scan
    url: https://staging.example.com
    page_name: Home
    add_to_session: false

  - command: scan
    url: https://staging.example.com/about
    page_name: About
    add_to_session: false
```

Run with: `a11y-cli script ci-audit.yaml --ci` — exits `1` if any violations found.
