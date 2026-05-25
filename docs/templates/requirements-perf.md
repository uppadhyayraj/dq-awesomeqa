# Performance Requirements — [PROJECT_NAME]

<!-- VERSION HISTORY — newest row at top -->
| Date | Cycle | Summary |
|------|-------|---------|
| [DATE] | [CYCLE] | Initial creation |

---
<!-- CURRENT — skills read only the first dated section below this line -->

## [DATE] — [CYCLE] — [DESCRIPTION]

### Load Profile
- Peak concurrent users: [number]
- Sustained load (average): [number]
- Ramp-up period: [minutes]
- Test duration: [minutes]
- Busy periods: [time of day, e.g. 09:00–10:00 NZST / seasonal, e.g. Black Friday]

### Thresholds
- p99 latency: ≤ [ms]ms
- p95 latency: ≤ [ms]ms
- Error rate: ≤ [%]%
- Minimum throughput: [req/s or 'not defined']

### Current Baseline (from production or staging)
- p99 latency: [ms or 'unknown']
- Error rate: [% or 'unknown']
- Data source: [Datadog / New Relic / CloudWatch / Grafana / 'unknown']
- Dashboard URL: [url or 'none']

### Infrastructure
- Target test environment: [staging / dev / prod-mirror]
- Auto-scaling enabled: [yes / no / unknown]
- Infrastructure SLA: [uptime/availability target]
- Known bottlenecks: [describe or 'none']

### Endpoints Under Load Test
| Endpoint | Method | Expected RPS | Priority |
|----------|--------|-------------|----------|
| [/path] | [method] | [rps] | P0/P1/P2 |

### Observability
- Monitoring tool: [Datadog / New Relic / CloudWatch / Grafana / other / 'none']
- Alert channels: [Slack #channel / PagerDuty / email / 'none']

### CI/CD Integration
- Load tests in pipeline: [yes / no / planned]
- Pipeline tool: [GitHub Actions / Jenkins / CircleCI / other]
- Trigger: [every PR / nightly / pre-release only]
