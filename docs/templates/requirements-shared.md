# Shared Requirements — [PROJECT_NAME]

<!-- VERSION HISTORY — newest row at top -->
| Date | Cycle | Summary |
|------|-------|---------|
| [DATE] | [CYCLE] | Initial creation |

---
<!-- CURRENT — skills read only the first dated section below this line -->

## [DATE] — [CYCLE] — [DESCRIPTION]

### Authentication & Authorisation
- Auth mechanism: [OAuth2 / API key / JWT / session cookie / other]
- Token/credential source for test runs: [env var name, e.g. TEST_API_TOKEN]
- Test account roles available: [admin, user, guest — or 'none yet']

### Test Data
- Required seed data: [describe records that must exist before tests run]
- Setup method: [manual / fixture script / API-created during test]
- Teardown required: [yes — describe / no]

### Target Environment
- Environment: [staging / dev / prod-mirror / localhost]
- Base URL: [https://... or see dq-qa.config.json]
- Feature flags active for this cycle: [list flag names or 'none']
- Known differences from production: [list or 'none']

### Exit Criteria
- P0 failures allowed to ship: 0
- P1 failures allowed to ship: [number, e.g. 0]
- Minimum domains that must pass: [API, UI, ...]
- Additional criteria: [describe or 'none']

### Cycle Scope
- In scope: [describe what is being tested this cycle]
- Explicitly out of scope: [describe what is NOT being tested]

### Stakeholders
- QA lead: [name or team]
- Developer contact: [name or team]
- Product owner: [name or team]
