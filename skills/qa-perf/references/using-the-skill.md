# Using the dq-nbomber Agent Skill

> This guide explains how to use the `/dq-nbomber` skill in VS Code Copilot to refine,
> fix, and extend a `dq-nbomber.yaml` file that was generated or scaffolded by the CLI.

---

## Prerequisites

1. You have a `dq-nbomber.yaml` file — created by either:
   - `dq-nbomber init` (starter template)
   - `dq-nbomber generate <spec-file>` (auto-generated from OpenAPI or GraphQL)
2. The skill is installed in your project: `dq-nbomber install-skill`
3. VS Code Copilot is open in agent mode (`@workspace` or agent panel)

---

## Invoking the Skill

Type `/dq-nbomber` in the Copilot chat to activate the skill. Then describe what you need:

```
/dq-nbomber My generated YAML has a login step and a profile step.
             The login uses a CSV feed but I'm not sure the field names are right.
             Can you check and fix it?
```

The agent will:
- Read your `dq-nbomber.yaml`
- Read the referenced data files (CSV / JSON)
- Cross-check field names against the config schema
- Edit the YAML directly

---

## Common Tasks After Generation

### Fix data feed field names

After `dq-nbomber generate`, the generated CSV columns may not match your actual API fields.

**Prompt:**
```
/dq-nbomber The login step uses ${data.email} and ${data.password} but my CSV has
            "username" and "pass" columns. Fix the YAML and rename the CSV header.
```

---

### Add authentication to a generated scenario

Generated scenarios from OpenAPI don't always wire up auth correctly.

**Prompt:**
```
/dq-nbomber Add a login step before the "get_orders" step. Login is POST /api/auth/login
            with email+password from the users CSV. Capture the token and pass it as
            Bearer auth to all subsequent steps.
```

---

### Chain register → login with the same data

A common pattern: register new users then immediately log in with those same credentials.

**Prompt:**
```
/dq-nbomber I have a register scenario and a login scenario. They use different data files
            right now. Make them both use data/users.csv so the credentials match.
            Register should use strategy: unique, login should use strategy: circular.
```

---

### Add assertions to every step

**Prompt:**
```
/dq-nbomber None of my steps have assertions. Add statusCode: "2xx" assertions to all steps,
            and add a jsonPath notEmpty check on the response ID field where relevant.
```

---

### Tune load simulations

**Prompt:**
```
/dq-nbomber I want to ramp up from 0 to 100 virtual users over 1 minute,
            hold at 100 for 3 minutes, then ramp down. Update all scenarios.
```

---

### Add thresholds for CI/CD

**Prompt:**
```
/dq-nbomber Add thresholds: 99% ok requests, P99 latency under 500ms, and less than 1% failures.
```

---

### Fix validation errors

Run `dq-nbomber validate ./my-loadtest/dq-nbomber.yaml` and paste the output:

**Prompt:**
```
/dq-nbomber I ran dq-nbomber validate and got these errors:
            [paste errors here]
            Please fix the YAML.
```

---

### Fix GraphQL selection sets

Generated steps use `{ __typename }` as a placeholder. Replace with real fields.

**Prompt:**
```
/dq-nbomber My GraphQL steps all have { __typename } in the query string.
            The schema is attached. Expand the selection sets to include the actual
            fields I need: id, name, email for User; id, status, total for Order.
```

---

### Fix GraphQL variable types and defaults

Generated variable values use `"placeholder"` for unknown scalars.

**Prompt:**
```
/dq-nbomber In my graphql_mutations scenario, the createOrder step has
            quantity: "placeholder" but quantity is an Int.
            Fix the variable type and update the data feed file.
```

---

### Add GraphQL error assertions

GraphQL always returns HTTP 200 — you must assert on `$.errors` explicitly.

**Prompt:**
```
/dq-nbomber None of my GraphQL steps check for errors in the response body.
            Add an assertion that $.data is not empty on every step, and add
            a capture of $.errors[0].message as gqlError with default "" on
            the mutation steps.
```

---

### Wire a GraphQL auth token across scenarios

**Prompt:**
```
/dq-nbomber My graphql_mutations scenario has a login step that captures authToken.
            The graphql_queries scenario also needs the auth token on every step.
            How do I share the token? And can I make the queries scenario depend
            on the mutations scenario running first?
```

---

**Prompt:**
```
/dq-nbomber My scenario "user_flow" has only one step that does everything.
            Split it into: login, get_dashboard, create_item, logout — each as a separate step
            with the correct auth and capture chain.
```

---

## Iterative Workflow

**OpenAPI:**
```
dq-nbomber generate openapi.yaml --output ./my-loadtest
        ↓
/dq-nbomber  ← fix, refine, add auth, tune simulations
        ↓
dq-nbomber validate ./my-loadtest/dq-nbomber.yaml
        ↓
/dq-nbomber  ← fix any validation errors
        ↓
✅ Config is ready — hand off to dq-nbomber run
           or: dq-nbomber export → dotnet run Program.cs
```

**GraphQL (SDL file):**
```
dq-nbomber generate schema.graphql --output ./my-loadtest
        ↓
/dq-nbomber  ← expand { __typename } selection sets, fix variable types, add error assertions
        ↓
dq-nbomber validate ./my-loadtest/dq-nbomber.yaml
        ↓
/dq-nbomber  ← fix any validation errors
        ↓
✅ Config is ready — hand off to dq-nbomber run
           or: dq-nbomber export → dotnet run Program.cs
```

**GraphQL (live endpoint introspection):**
```
dq-nbomber generate https://api.example.com/graphql --output ./my-loadtest
        ↓
/dq-nbomber  ← replace placeholder credentials in data/users.csv with real test users
        ↓
dq-nbomber validate ./my-loadtest/dq-nbomber.yaml
        ↓
✅ Config is ready — hand off to dq-nbomber run
           or: dq-nbomber export → dotnet run Program.cs
```

---

## Tips

- **Always validate after edits**: ask the skill to remind you to run `dq-nbomber validate`.
- **One concern at a time**: ask for auth first, then assertions, then load shape — easier to review.
- **Paste error output**: if `validate` or `run` shows an error, paste it directly into the chat — the skill knows the YAML structure and can diagnose it.
- **Data files are editable too**: the skill can create or rename CSV columns, add rows, or restructure JSON feeds.
- **The skill does not run tests**: once the YAML is ready, run it yourself with `dq-nbomber run`.
