# QA Summary — [PROJECT_NAME]

<!-- VERSION HISTORY — newest row at top -->
| Date | Cycle | Summary |
|------|-------|---------|
| [DATE] | [CYCLE] | Initial creation |

---
<!-- CURRENT — skills read only the first dated section below this line -->

## [DATE] — [CYCLE] — [DESCRIPTION]

**Status: [✅ PASS / ⚠️ PASS WITH RISK / ❌ FAIL]**
**Prepared by:** dq-awesomeqa

### Executive Summary
[2-3 sentences: what was tested, overall result, most important finding. Clear go/no-go signal.]

### What Was Tested
| Domain | Coverage | Scenarios |
|--------|----------|-----------|
| API | [N endpoints] | [functional / security / error-handling / edge-cases] |
| UI | [list of flows] | Interaction steps + screenshots |
| Accessibility | [list of pages] | WCAG [level] ([jurisdiction]) |
| Performance | [flows tested] | [load profile] |

### Results by Domain
| Domain | Tests / Checks | Passed | Failed | Status |
|--------|---------------|--------|--------|--------|
| API | [N] | [N] | [N] | ✅/⚠️/❌ |
| UI | [N flows] | [N] | [N] | ✅/⚠️/❌ |
| Accessibility | [N crit] / [N serious] violations | — | — | ✅/⚠️/❌ |
| Performance | p99: [N]ms / ok: [N]% | — | — | ✅/⚠️/❌ |

### Key Findings
**API:** [top findings or 'All tests passing']
**UI:** [failures with step and reason, or 'All flows passed']
**Accessibility:** [top violations with WCAG criterion, or '0 violations']
**Performance:** [p99 vs threshold, capacity recommendation]

### Open Items
| ID | Domain | Severity | Description | Owner |
|----|--------|----------|-------------|-------|
| [id] | [domain] | P0/P1 | [description] | [team] |

### Accepted Risks
[list with rationale, or 'none']

### Coverage Gaps
[from qa-coverage.md — high-risk gaps not covered this cycle, or 'none']

### Reports
| Domain | Report |
|--------|--------|
| API | `qa-reports/api/api-execution-report.html` |
| UI | `qa-reports/ui/report.html` |
| Accessibility | `qa-reports/a11y/report.html` |
| Performance | `qa-reports/perf/` |

---
<!-- HISTORY — skills ignore everything below this line -->
