# Idearigs / TrueDesk — Engineering Reliability Roadmap

> **Status:** Living document. Created 2026-05-31.
> **Audience:** Idearigs engineering (you + Claude).
> **Why this exists:** TrueDesk is mission-critical POS/jewelry software. When it breaks,
> customers can't take payments — they call us immediately and churn. This document is an
> honest, evidence-based assessment of our engineering maturity against industry practice,
> and a prioritized plan to close the gaps that matter for **reliability and trust**.

---

## 1. The core problem we are solving

> "If this breaks, all our customers instantly call us — and they quit their subscription."

That sentence is the diagnosis. Today our **alerting system is our customers.** We have strong
reliability *mechanisms* (idempotency, row-locking, circuit breakers, rate limiting — Phase 1–3),
but two weak spots that directly cause the pain above:

1. **We don't know something broke until a customer tells us** (no error tracking, no alerting).
2. **We can't reliably stop a break from shipping** (test coverage ~6.5%).

This roadmap fixes those first, then builds out operational maturity.

---

## 2. How to read this

Each capability is rated:

| Mark | Meaning |
|------|---------|
| ✅ **Have** | Implemented and in use |
| 🟡 **Partial** | Exists but incomplete or shallow |
| 🔴 **Missing** | Not present — a real gap |
| ❓ **Verify** | Can't confirm from the codebase; lives in infra/ops |

Work is grouped into **Tiers** by priority. Tier 0 is "do before almost anything else."

---

## 3. Current-state scorecard (evidence-based, 2026-05-31)

| Area | Rating | Basis |
|------|--------|-------|
| Reliability mechanisms | 🟢 Strong | idempotency (`replayOrRun`), row-locking, opossum circuit breaker, throttler rate limiting, graceful degradation, webhook queue + retry/backoff |
| Execution (async/perf) | 🟢 Strong | async queue, Redis cache, UNNEST batching, streaming CSV, cursor pagination, DB indexes |
| System structure | 🟢 Good | NestJS modules, DTO data contracts, class-validator, multi-tenant isolation |
| Infrastructure / VCS | 🟢 Good | GitFlow + branch protection + CI/CD, 13 Prisma migrations, gitignored secrets, `.env.example` |
| Security | 🟡 Mostly good | helmet ✓, 6 auth guards (JWT/roles/tenant) ✓, parameterized SQL ✓; **secrets still in git history**, no documented PII handling |
| **Testing & quality** | 🔴 **Weak** | 5 backend + 4 frontend + 1 e2e spec files; **~6.5% coverage** |
| **Observability** | 🔴 **Largely missing** | no error tracking, no aggregated/structured logging, no APM, no alerting; `/health` is shallow |
| **Backups / recovery** | 🔴 **Tier 0** | not confirmed / not tested — holding customers' financial data |
| Planning / docs | 🟡 Informal | no `docs/` (until now), no ADRs, no written Definition of Done |

---

## 4. The roadmap

### TIER 0 — Data safety (start immediately)

A POS holds customers' sales, payments, and financial history. Losing it is existential — for
them and for us. Untested backups are effectively no backups.

| # | Action | Done when |
|---|--------|-----------|
| 0.1 | Confirm/enable **automated Postgres backups** (daily full + WAL/PITR if available on the host/Coolify or managed DB) | A backup runs automatically on a schedule, retention ≥ 30 days |
| 0.2 | **Test a restore** into a throwaway DB | We have restored a real backup and verified row counts/integrity at least once |
| 0.3 | Document the restore runbook | `docs/runbooks/restore-database.md` exists with exact steps + who to call |
| 0.4 | Off-host copy | Backups stored somewhere that survives the primary host dying (different provider/bucket) |

> **Owner action required:** decide where backups live (managed DB provider vs. Coolify volume
> snapshots vs. `pg_dump` to object storage). This is an infra decision, not just code.

---

### TIER 1 — Know before customers do (days)

Turn "a customer called, something's broken" into "we got paged and fixed it before they noticed."

| # | Action | Tooling | Done when |
|---|--------|---------|-----------|
| 1.1 | **Error tracking** on backend + frontend | Sentry (or self-hosted GlitchTip — free) | Every unhandled exception creates an alert with stack trace, tenant, route, user |
| 1.2 | **Global exception filter** (NestJS) | `@Catch()` filter | All 500s logged centrally with a consistent JSON error shape + request ID |
| 1.3 | **Real health checks** | `@nestjs/terminus` | `/health` pings Postgres + Redis; returns 503 when a dependency is down |
| 1.4 | **Uptime monitoring + alerting** | UptimeRobot / BetterStack | The real endpoints are polled; downtime → Slack/email/SMS within ~1 min |
| 1.5 | **Structured logging** w/ request + tenant IDs | pino / nestjs-pino | Logs are JSON, correlated by request, filterable by tenant |

**Outcome of Tier 1:** the churn-driver sentence stops being true.

---

### TIER 2 — Stop shipping breaks (1–2 weeks, then ongoing)

CI already *runs* tests and blocks merges via the CI Gate. The gap is that the tests don't yet
cover enough. We target the **money paths** first, not 100% everywhere.

| # | Action | Done when |
|---|--------|-----------|
| 2.1 | Unit + integration tests for **checkout/sale create** | Happy path + oversell + payment-mismatch + idempotent replay covered |
| 2.2 | Tests for **refund / installment / void** | Full + partial refund, over-refund guard, double-submit, status guards |
| 2.3 | Tests for **auth & tenant isolation** | Login throttle, token validation, cross-tenant access denied |
| 2.4 | Tests for **stock / inventory** | Bulk update, concurrent decrement, negative-stock guard |
| 2.5 | Set a **realistic coverage floor** in CI (e.g. 40% overall, 80% on `sales`/`auth`/`inventory`) | CI fails if critical-path coverage drops |
| 2.6 | A few **Playwright E2E** flows for the POS happy path | Login → add to cart → checkout → refund runs in CI |

---

### TIER 3 — Resilience & safe change (ongoing)

| # | Action | Done when |
|---|--------|-----------|
| 3.1 | **Feature flags / per-tenant rollout** | Risky changes can be enabled for one tenant before all |
| 3.2 | **Mock external services** in tests | LemonSqueezy, gold API, SMS, OpenAI, Drive all mockable; no live calls in CI |
| 3.3 | **Performance / load testing** on checkout | We know req/sec + P95 latency before customers hit the limit |
| 3.4 | **Cost observability** | Visibility into OpenAI/SMS/infra spend before bills surprise us |
| 3.5 | **Audit logging coverage** | Every money-moving + admin action is in `audit_logs` (currently thin) |
| 3.6 | **DB index review under real query patterns** | Slow-query log reviewed; indexes match actual access |

---

### TIER 4 — Process & knowledge (ongoing, low effort)

| # | Action | Done when |
|---|--------|-----------|
| 4.1 | **Definition of Done** written | `docs/DEFINITION_OF_DONE.md` — every change meets it before merge |
| 4.2 | **ADRs** for big decisions | `docs/adr/` — multi-tenant, monorepo, billing, etc. captured |
| 4.3 | **Rotate leaked secrets** | DB pw, JWT/encryption keys, all API keys rotated; old ones invalid |
| 4.4 | **PII handling note** | `docs/PII.md` — what personal data we hold, where, retention |
| 4.5 | **GitHub Issues/Projects** for tracking | Work flows through issues → PRs, not chat memory |
| 4.6 | **Mainframe build fix** + decide repo split | `mainframe-admin` builds; split planned/executed |

---

## 5. Full checklist coverage map

Direct answer to "are we using these or not", item by item.

### Planning & Requirements
| Item | Status | Note / Plan |
|------|--------|-------------|
| Business Requirements | 🟡 Partial | In founders' heads; not written. → light PRD per feature |
| Product Requirements | 🟡 Partial | Same |
| Design & Technical Requirements | 🟡 Partial | Decisions in commits/chat → ADRs (4.2) |
| Requirements Thinking | 🟡 Partial | We tend to build then refine |
| MVP | ✅ Have | Product is live with real tenants |
| Trade-offs & Constraints | ✅ Have | We make them, just don't record them → ADRs |
| Scope Creep | 🟡 Partial | Watch via Issues/Projects (4.5) |
| Definition of Done | 🔴 Missing | → 4.1 |
| Cost of Ownership | 🟡 Partial | → cost observability 3.4 |

### System Structure
| Item | Status | Note |
|------|--------|------|
| System Design | ✅ Have | NestJS + React + Postgres + Redis, multi-tenant |
| Component Architecture | ✅ Have | Feature modules |
| Separation of Concerns | ✅ Have | controller/service/repository |
| Frontend vs Backend | ✅ Have | Clear split |
| File & Folder Structure | ✅ Have | Conventional Nest/Vite layout |
| Data Structures | ✅ Have | Prisma schema |
| Data Contracts | ✅ Have | DTOs |
| Data Validation | ✅ Have | class-validator |
| State Management | ✅ Have | React contexts/hooks |
| API Design Basics | ✅ Have | REST + consistent patterns |

### Thinking Disciplines
| Item | Status | Note |
|------|--------|------|
| Edge Case Thinking | 🟡 Partial | Strong in Phase 1–3; formalize via tests (Tier 2) |
| Production Thinking | 🟡 Partial | Reliability yes; observability no (Tier 1) |
| Technical Debt | 🟡 Partial | Known (e.g. mainframe build, CRLF, coverage) — track in Issues |
| Evaluating AI-Generated Code | 🟡 Partial | Now enforced by review + CI Gate |
| Right-Sized Prompting | ✅ Have | n/a to product |
| Documentation As You Go | 🔴→🟡 | This doc + ADRs start it |
| Blast Radius | ✅ Have | CI decoupled per-service; feature flags next (3.1) |
| Analysis Paralysis | ✅ Have | We ship |
| Rubber Ducking | ✅ Have | n/a |

### Reliability
| Item | Status | Note |
|------|--------|------|
| Error Handling | 🟡 Partial | Per-route yes; **no global filter** → 1.2 |
| Idempotency | ✅ Have | `replayOrRun` on sale/refund/installment/void |
| Event Handling | ✅ Have | Webhook queue |
| Retry Strategies | ✅ Have | Queue retry/backoff |
| Rate Limiting | ✅ Have | throttler (Redis + memory fallback) |
| Timeouts & Circuit Breakers | ✅ Have | opossum on gold API |
| Graceful Degradation | ✅ Have | Stale-rate fallback, cache fallback |
| Webhooks | ✅ Have | Signature verify → enqueue → 200 |

### Execution
| Item | Status | Note |
|------|--------|------|
| Sync vs Async | ✅ Have | Async queue for slow work |
| Threading & Parallelism | ✅ Have | Node async; parallel CI jobs |
| Caching | ✅ Have | cache-manager + Redis |
| Background Jobs | ✅ Have | Async queue (BullMQ-style fallback) |
| Race Conditions | ✅ Have | `SELECT … FOR UPDATE` row locks |
| Batching Operations | ✅ Have | UNNEST bulk update |
| Long-Running Processes | 🟡 Partial | Streaming export; revisit for big jobs |
| Streaming & Chunked | ✅ Have | CSV export streams |
| Pagination | ✅ Have | Cursor + offset |
| Database Indexes | ✅ Have | Added on sales/customers/repairs → review under load (3.6) |
| Concurrency Basics | ✅ Have | Locks + idempotency |

### Infrastructure
| Item | Status | Note |
|------|--------|------|
| Dev Environments (IDEs) | ✅ Have | |
| Database Types | ✅ Have | Postgres + Redis |
| Version Control | ✅ Have | Git + GitFlow + protection |
| Config & Secrets Basics | 🟡 Partial | gitignored now; **rotate leaked history** (4.3) |
| Deployment Targets | ✅ Have | Coolify |
| Serverless | n/a | Not used; fine |
| CI/CD & Deployment Discipline | ✅ Have | ci-cd.yml + CI Gate + change detection |
| Messaging Queues | 🟡 Partial | In-memory queue; consider durable (BullMQ/Redis) for critical events |
| **Backups & Data Recovery** | 🔴 **Tier 0** | → Section 4 Tier 0 |
| Database Migrations | ✅ Have | Prisma, 13 migrations |
| Dependency Management | 🟡 Partial | Lockfiles ✓; add Dependabot/audit |
| License Management | 🔴 Missing | Add a license scan |
| Configuration Files | ✅ Have | `.env` + `.env.example` |
| GitHub Issues & PRs | 🟡 Partial | PRs ✓; adopt Issues (4.5) |
| GitHub Projects | 🔴 Missing | → 4.5 |
| GitHub Actions | ✅ Have | |
| DNS & Domain Management | ✅ Have | truedesk.co.uk live |
| DevOps | 🟡 Partial | Improving with this roadmap |

### Testing & Quality
| Item | Status | Note |
|------|--------|------|
| Debugging | ✅ Have | |
| Automated Testing | 🔴 Weak | ~6.5% coverage → Tier 2 |
| Performance & Scalability Testing | 🔴 Missing | → 3.3 |
| Regression Testing | 🔴 Weak | CI Gate runs tests; need more tests |
| Mock External Services | 🟡 Partial | → 3.2 |
| Testing in Production (flags/rollout) | 🔴 Missing | → 3.1 |
| Browser Dev Tools | ✅ Have | |
| Readiness Testing | 🟡 Partial | After health checks (1.3) + load (3.3) |
| Type Systems | ✅ Have | TypeScript both sides |
| Linting | ✅ Have | ESLint in CI |

### Observability & Security
| Item | Status | Note |
|------|--------|------|
| Logging & Observability | 🔴 Missing | → 1.5 |
| Authentication vs Authorization | ✅ Have | JWT + roles + tenant guards |
| Security-First Coding | 🟡 Partial | helmet, validation, parameterized SQL ✓ |
| Prompt-Injection | ❓ Verify | Review OpenAI features for untrusted input |
| Performance Monitoring | 🔴 Missing | APM (Sentry perf / OTel) |
| Alerting & Error Notifications | 🔴 Missing | → 1.1, 1.4 |
| Auditing | 🟡 Partial | `audit_logs` thin → 3.5 |
| Guardrails (AI) | ❓ Verify | Bound AI features |
| Cost Observability | 🔴 Missing | → 3.4 |
| SQL Injection | ✅ Have | Prisma + parameterized raw |
| Supporting the Application | 🟡 Partial | Improves with Tier 1 |
| PII & Data Handling | 🟡 Partial | Document (4.4) |

---

## 6. Proposed Definition of Done (to ratify)

A change is **Done** only when:
1. Code reviewed via PR (branch protection enforces it).
2. CI Gate green (lint + build + tests pass).
3. New/changed **critical-path** logic has tests.
4. Errors are handled and will surface in monitoring (no silent failures).
5. Any new config/secret is in `.env.example` (placeholder) and documented.
6. User-facing or breaking changes noted in the PR description.
7. No new secret committed; no `console.log` of sensitive data.

---

## 7. What we already do well (don't lose this)

The reliability engineering in Phase 1–3 is genuinely strong and ahead of most products at this
stage: idempotency, row-locking, circuit breakers, rate limiting, graceful degradation, async
decoupling, streaming, batching, cursor pagination. The foundation is solid — this roadmap is
about **operating** it safely (knowing when it breaks, proving it works, protecting the data),
not rebuilding it.

---

## 8. Suggested sequence

```
Tier 0  Backups + tested restore         ← existential, do now
Tier 1  Error tracking + alerting + health + logging   ← stops the churn driver
Tier 2  Tests on money paths + coverage floor          ← stops shipping breaks
Tier 3  Flags, load tests, mocks, audit, cost          ← resilience & safe change
Tier 4  DoD, ADRs, secret rotation, Issues/Projects    ← process & knowledge
```

Each tier is independently valuable; we ship them incrementally through `develop → main`.
