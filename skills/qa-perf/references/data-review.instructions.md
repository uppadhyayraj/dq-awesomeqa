# Data File Review Instructions

> **When to apply:** After reading the API schema (Phase A) and locating any generated or
> hand-crafted data feed files (`data/*.json`, `data/*.csv`). Run this review on every
> data file referenced in the YAML before declaring the scenario ready.
>
> **Goal:** Ensure every value in every data record is valid for the API field it targets —
> correct type, correct format, within length/range constraints, matching enum values — so
> the test fails due to load behaviour, never due to bad test data.

---

## Step 1 — Build a Field Contract from the Schema

For each data file, identify which API endpoint's request body schema it feeds.
Resolve all `$ref` chains in that schema (same as SKILL Phase A2) and build a contract table:

| Field | JSON type | Format | Required | min/max | enum values | Example |
|---|---|---|---|---|---|---|
| `username` | string | — | yes | minLength:3, maxLength:30 | — | `"johndoe"` |
| `price` | number | — | no | minimum:0.01 | — | `2.99` |
| `status` | string | — | yes | — | `pending,active,closed` | `"active"` |
| `createdAt` | string | date-time | no | — | — | `"2024-01-15T10:30:00Z"` |
| `zipCode` | string | — | no | minLength:5, maxLength:10 | — | `"10001"` |

Build this table before checking any values. Never eyeball the data against the schema —
always derive the contract first.

---

## Step 2 — Check Every Field in Every Record

For each field in every record of the data file, apply the checks below.

### 2a. Type correctness

| Schema type | JSON must be | Common mistake to look for |
|---|---|---|
| `string` | JSON string `"..."` | Number without quotes: `42` instead of `"42"` |
| `integer` | JSON number, no decimal | Float: `1.0` instead of `1` — or string: `"1"` |
| `number` | JSON number | String: `"9.99"` instead of `9.99` |
| `boolean` | `true` or `false` (no quotes) | String: `"true"` instead of `true` |
| `array` | JSON array `[...]` | Single value outside array: `"item"` instead of `["item"]` |
| `object` | JSON object `{...}` | Flat string representation |

**Flag any field whose JSON value type does not match the schema type.**

### 2b. String format compliance

The `generate` command uses Bogus to produce format-aware values, but only for known formats.
Any unrecognised or missing `format` falls back to `faker.Lorem.Word()` — a random word that
may not satisfy the server's actual validation.

Check these formats explicitly:

| Format | Valid pattern | Generated correctly? | Common failure |
|---|---|---|---|
| `date` | `YYYY-MM-DD` | ✅ Yes | — |
| `date-time` | ISO 8601 with timezone: `2024-01-15T10:30:00.000Z` | ✅ Yes | — |
| `email` | `user@domain.tld` | ✅ Yes | — |
| `uuid` | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | ✅ Yes | — |
| `uri` / `url` | Full URL with scheme | ✅ Yes | — |
| `password` | 12-char alphanumeric | ✅ Yes | Server may require special chars |
| `phone` | Server-specific pattern | ⚠️ Falls back to Lorem.Word | `"ipsum"` is not a phone number |
| `zip` / `postal_code` | 5-10 digit string | ⚠️ Falls back to Lorem.Word | `"lorem"` will fail zip validation |
| `credit_card` | 16-digit string | ⚠️ Falls back to Lorem.Word | Random word is not a card number |
| `hostname` | Domain name | ✅ Yes | — |
| (custom / none) | Depends on server | ⚠️ Falls back to Lorem.Word | Review carefully |

**For any field with an unrecognised or missing `format`, check the schema's `example` or
`description` to understand the expected shape, then replace `Lorem.Word()` values with
realistic ones.**

### 2c. Length constraints

| Constraint | What to check |
|---|---|
| `minLength` | Every string value must be at least this many characters |
| `maxLength` | Every string value must be at most this many characters |
| `minItems` | Every array must have at least this many elements |
| `maxItems` | Every array must have at most this many elements |

`faker.Lorem.Word()` generates 3–10 character words. This violates `minLength > 10` silently.
`faker.Lorem.Sentence()` generates ~50+ chars. This violates `maxLength < 50` silently.

**Flag any value that falls outside the schema's length bounds.**

### 2d. Numeric range constraints

| Constraint | What to check |
|---|---|
| `minimum` | Every number must be >= this value |
| `maximum` | Every number must be <= this value |
| `exclusiveMinimum` | Every number must be > this value (strictly) |
| `exclusiveMaximum` | Every number must be < this value (strictly) |
| `multipleOf` | Every number must be divisible by this value |

`faker.Random.Double(0.01, 999.99)` is the default number range. If the schema has a tighter
range (e.g. `minimum: 1, maximum: 100`) some generated values will be out of range.

**Flag any numeric value outside the schema's constraints.**

### 2e. Enum values

If a field has an `enum` array in the schema, every value in the data file must be one of
the listed members. Case sensitivity matters — check whether the API is case-sensitive.

```json
// Schema: "status": { "type": "string", "enum": ["pending", "active", "cancelled"] }
// BAD: "status": "Pending"   ← wrong case
// BAD: "status": "complete"  ← not in enum
// GOOD: "status": "active"
```

**Flag any value that is not a member of the declared enum.**

### 2f. Required fields present

Every field listed in the schema's `required[]` array must be present in every data record.
Missing required fields are the most common cause of 400 errors.

**Flag any record missing a required field.**

### 2g. No extra fields that cause strict validation failures

Some APIs with strict validation (Zod, class-validator with `forbidNonWhitelisted`) reject
requests containing fields not declared in the schema. Check whether the data file contains
fields not present in the schema's `properties`.

---

## Step 3 — CSV-Specific Checks

For `.csv` data files:

| Check | Rule |
|---|---|
| Header row | First row must be column names — no BOM, no leading spaces |
| Column count | Every row must have the same number of columns as the header |
| Quoted values | Values containing commas must be quoted: `"Smith, Jr."` |
| Numeric columns | CSV is always string — if a column feeds a number field in the body, the YAML step must use a quoted JSON string body (see SKILL body encoding rules) |
| Boolean columns | Same — CSV `"true"` is a string; use quoted JSON string body with literal `true` |
| Empty values | Empty CSV cell → empty string `""` — check if the schema allows empty strings for that field |

---

## Step 4 — Realistic Value Quality Check

Beyond schema compliance, poor data quality causes subtle test failures or misleading results:

| Anti-pattern | Why it matters | Fix |
|---|---|---|
| All records identical | Server-side duplicate detection, rate limiting, or caching will mask real load behaviour | Each record should have distinct identifiable values (username, email, ID) |
| Placeholder IDs like `prod_123` | If the API validates referential integrity, fake IDs will get 404 on every request | Use IDs that actually exist in the test environment, or capture real IDs via prior steps |
| Empty strings for optional fields | Some servers treat `""` as invalid even when the field is optional | Use `null` or omit the field if the schema allows it |
| Dates in the past for future-only fields | Booking, scheduling, expiry fields often require future dates | Check field semantics — `expiresAt` should be in the future |
| Dates without timezone for `date-time` fields | Many servers require `Z` or `+00:00` suffix | Always use full ISO 8601: `2025-06-01T00:00:00.000Z` |
| Hardcoded `prod_123`, `user_123` across all records | If only one record ever succeeds, concurrency will cause conflicts | Vary IDs across records |

---

## Step 5 — Report Findings and Fix

After running all checks, produce a report in this format:

```
Data File: data/post_api_cart__userid__items.json
Schema: AddToCartRequest (via /api/cart/{userId}/items POST)

ISSUES FOUND:
  - Field `quantity` (record 3): value "5" is a string, schema type is number
  - Field `productId` (records 1-10): value "prod_ylawan" — not a real product ID;
    will get 404 on view_product if this feed is reused for that step

NO ISSUES:
  - All required fields present (productId, quantity)
  - No enum violations
  - No length violations
```

Then fix each issue directly in the data file. For type mismatches in JSON files, correct
the JSON value type. For CSV files feeding number/boolean fields, ensure the YAML step uses
a quoted JSON string body as described in the SKILL's body encoding rules.

---

## Known Limitations of the `generate` Command

These are the cases where `generate` produces values that may need manual correction.

### OpenAPI

| Field scenario | Generated output | May need correction |
|---|---|---|
| `string` with no `format` and no `enum` | `faker.Lorem.Word()` — random word | If server validates format (phone, postal code, card number, etc.) |
| `string` with `pattern` (regex) | `faker.Lorem.Word()` — ignores pattern | Pattern constraint is not honoured |
| `string` with `minLength > 10` | Short word may be too short | Replace with longer value |
| `string` with `maxLength < 5` | Short word may still be too long | Replace with value within bounds |
| `number` with tight `minimum`/`maximum` | Range 0.01–999.99 may exceed bounds | Replace with in-range value |
| `integer` | Random 1–1000 | May violate tighter bounds |
| Nested `object` (not $ref, inline) | Recursively generated — shallow | Deep nested objects may be incomplete |
| `anyOf` / `oneOf` | First branch only | Other valid shapes not covered |

### GraphQL

| Field scenario | Generated output | May need correction |
|---|---|---|
| `String` scalar (no name heuristic match) | `faker.Lorem.Word()` — random word | If field has format semantics (phone, postal, card, pattern) |
| Custom scalar (e.g. `DateTime`, `Date`, `Email`, `URL`, `UUID`) | Bogus generates appropriate value for known custom scalars | Unknown custom scalars fall back to `faker.Lorem.Word()` — check the schema description |
| Input type field with no name match | `faker.Lorem.Word()` | Any field whose name isn't in the name-heuristic map (email, password, phone, etc.) |
| `Int` / `Float` with server-side range validation | Random 1–100 | Tighter range not known from SDL — check API docs |
| `Boolean` field | Random `true`/`false` | If the test scenario requires a specific value (e.g. `isAdmin: false`) |
| Enum field | Random valid enum value from schema | Correct type — but test logic may require a specific value |
| Selection set | `{ __typename }` | **Always replace** with real fields; `__typename` only returns the type name and hides business logic failures |
| Variable defaults in YAML | `"placeholder"` for unrecognised scalars | `"placeholder"` will likely cause a server validation error — replace with a realistic value |

#### GraphQL data file key structure

For operations with input-type arguments, the generated JSON data file uses **flattened dot-notation keys**:

```json
[
  {
    "input.name": "Alice Smith",
    "input.email": "alice@example.com",
    "input.age": 30
  }
]
```

These map to the YAML variable block:

```yaml
variables:
  input:
    name: "${data.createuser.input.name:-placeholder}"
    email: "${data.createuser.input.email:-test@example.com}"
    age: "${data.createuser.input.age:-1}"
```

When reviewing a GraphQL data file, check:
1. The key prefix matches the argument name in the SDL (e.g. `input.` for `createUser(input: CreateUserInput!)`)
2. The value type matches the input field's scalar type (see Type correctness table in Step 2a)
3. All required fields of the input type are present as keys in every record
| Fields with referential integrity (foreign keys) | Fake generated ID | Will 404 if API validates existence |
