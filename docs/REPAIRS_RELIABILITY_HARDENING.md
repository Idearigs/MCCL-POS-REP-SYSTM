# Repair Management — Reliability Hardening Plan

**Status:** Planning → in progress (Phase 1)
**Owner:** solo dev
**Created:** 2026-06-01
**Why:** Repairs is a critical, customer-facing component, but it was written before
the Sales hardening (PR #2) and never received the same reliability treatment. This
plan brings it up to the same standard, in phases, each shipped via
branch → `develop` → staging → `main`.

> Companion to `docs/ENGINEERING_ROADMAP.md`. Scope is limited to
> `backend/src/features/repairs/**` and its direct dependencies (SMS, cache, queue).

---

## Audit summary (2026-06-01)

Read of `repairs.service.ts` (1106), `repairs.controller.ts` (840),
`repairs.repository.ts`, `repair.dto.ts`, schema. Status per concept:

| Concept | Status | Note |
|---|---|---|
| Error handling | 🟢 | Global exception filter + service try/catch. |
| **Idempotency** | 🔴 | None. Retried create / status-change / note duplicates rows and **re-sends SMS**. |
| Event handling | 🟡 | Status history written inline; no domain events. |
| **Retry strategies** | 🔴 | None. Repair-number collision and failed SMS are not retried. |
| Rate limiting | 🟢 | Global throttler (100/min/IP) applies. |
| **Timeouts & circuit breakers** | 🟡 | SMS has a 15s axios timeout but **no breaker, no retry** (opossum used only in metals). |
| Graceful degradation | 🟢 | SMS failure does not break the status change (`changeStatus` try/catch). |
| Webhooks | ➖ | N/A. |
| **Sync vs async / background jobs** | 🔴 | SMS sent **synchronously in the status-change request** (`changeStatus:595`); `QueueModule` exists but is bypassed. |
| **Race conditions** | 🔴 | `generateRepairNumber` read-max-then-increment with no lock; `changeStatus` read-then-update with no lock. |
| **Concurrency / transactions** | 🔴 | `create` and `changeStatus` perform multiple writes outside a `$transaction`. |
| **Caching** | 🔴 | `CacheService` injected but never called (dead dependency). |
| Pagination | 🟡 | Offset-based (cap 1000); fine now, degrades at scale. |
| DB indexes | 🟢 | `@@unique([tenantId,repairNumber])` + `status`/`customerId`/`(tenantId,createdAt)`. Missing `priority`; `search` is a LIKE scan. |
| Batching / parallelism | 🟢 | `Promise.all` for reads; image upload batched (≤10). |
| Streaming / long-running | ➖ | N/A. |

---

## Phase 1 — Data integrity (idempotency + atomicity + races) — **first PR**

The highest-value, customer-/data-facing fixes. Mirrors the Sales `replayOrRun` +
`SELECT … FOR UPDATE` patterns.

1. **Idempotency wrapper.** Add a `replayOrRun(scope, key, fn)` helper to
   `RepairsService` (cache-backed, 24h TTL) — same as `SalesService`. Reuse the
   already-injected `CacheService`.
2. **Idempotency-Key on mutations.** Accept `@Headers('Idempotency-Key')` on
   `POST /repairs`, `POST /repairs/:id/status`, `POST /repairs/:id/notes`,
   `POST /repairs/:id/cancel`; thread it into the service and wrap the body in
   `replayOrRun`.
3. **Atomic `changeStatus`.** Wrap the status update + status-history write in a
   single `$transaction`, with `SELECT … FOR UPDATE` on the repair row so concurrent
   status changes serialize. (SMS stays outside the transaction — see Phase 2.)
4. **Atomic `create` + number-collision retry.** Generate the repair number and
   insert inside a transaction; on the `@@unique([tenantId, repairNumber])` violation
   (P2002), retry with the next number (bounded retries) instead of 500-ing.
5. **Tests.** Extend `repairs.service.spec.ts`: idempotent replay returns the prior
   result without a second write; concurrent status changes don't double-write
   history; number generation retries on collision.

**Acceptance:** retried create/status/note is a no-op replay; no duplicate repair
numbers under concurrency; status change + history are all-or-nothing.

## Phase 2 — SMS off the hot path (async + resilience) — second PR

6. **Background SMS.** Enqueue repair-status SMS via the existing `QueueModule`
   instead of `await`-ing it in `changeStatus`. Status change returns immediately.
7. **Retry + circuit breaker.** Wrap the SMS provider call in an opossum breaker
   (as in `metals.service.ts`) with bounded retries/backoff; persist failures for
   visibility rather than dropping them.

**Acceptance:** a slow/down SMS provider no longer delays or blocks status changes;
transient failures retry; sustained failures open the breaker and degrade cleanly.

## Phase 3 — Cache, pagination, indexes — third PR

8. **Use or remove the cache.** Cache `findOne`/`getStats`; invalidate on write.
9. **Pagination.** Offer cursor pagination on `findAll` for large datasets (keep
   offset for back-compat), mirroring Sales.
10. **Indexes.** Add `@@index` for `priority` (and review technician/search filters).

**Acceptance:** hot reads served from cache with correct invalidation; large lists
paginate without deep-offset cost.

---

## Rollout (every phase)
Branch → PR to `develop` → **redeploy staging** → verify the targeted behaviour on
`staging-pos.truedesk.co.uk` (incl. a real repair create + status change + refund-free
flows) → PR `develop` → `main` → watch prod `/health` and a smoke check. No direct
commits to `main`.

## Out of scope
Frontend repair UI changes (separate), and the unrelated sale-path validation-error
white-screen (tracked elsewhere).
