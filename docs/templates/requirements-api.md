# API Requirements — [PROJECT_NAME]

<!-- VERSION HISTORY — newest row at top -->
| Date | Cycle | Summary |
|------|-------|---------|
| [DATE] | [CYCLE] | Initial creation |

---
<!-- CURRENT — skills read only the first dated section below this line -->

## [DATE] — [CYCLE] — [DESCRIPTION]

### Critical Endpoints
| Endpoint | Method | Priority | Purpose |
|----------|--------|----------|---------|
| [/path] | [GET/POST/PUT/DELETE] | P0/P1/P2 | [what it does] |

### Authentication
- Mechanism: [OAuth2 / API key / JWT / session]
- How to obtain a test token: [describe steps or env var]
- Required scopes/permissions: [list or 'none']

### Error Cases to Validate
| Scenario | Expected Status | Expected Response |
|----------|----------------|-------------------|
| Missing required field | 400 | [error shape] |
| Unauthorised access | 401 | [error shape] |
| Forbidden resource | 403 | [error shape] |
| Not found | 404 | [error shape] |

### Rate Limits
- Limit: [requests per second / minute, or 'unknown']
- Test strategy: [stay under limit / test boundary]

### Test Environment Constraints
- Sandbox available: [yes / no]
- Data persistence between runs: [yes — describe / no — ephemeral]
- Known flaky endpoints: [list or 'none']

### Out of Scope
- [endpoints or categories explicitly excluded this cycle, or 'none']
