# Release & Deploy Record — 2026-06-01

First `develop → main` production release (PR #9), covering the reliability hardening
work plus a staging environment, validated end-to-end and shipped to production. This
document records what was released, how it was verified, the deploy incident and its
fix, and the follow-ups it surfaced.

---

## 1. What shipped (PR #9 → `main`, merge commit `e25cd80`)

A full product release — 78 files, ~7,400 insertions — bundling several earlier PRs
that were on `develop` but had never reached `main`:

| Area | Detail |
|------|--------|
| **Tier 0 — backups** (#5) | Off-host encrypted Postgres backup runbook + scripts; Coolify native daily backup of `mps_jewelry_pos` → Cloudflare R2. |
| **Tier 1 — observability** (#6) | Deep `/health` (pings DB + Redis, returns 503 when degraded), shallow `/health/live`, global `AllExceptionsFilter`, Sentry via `instrument.ts` (no-op until `SENTRY_DSN` set). |
| **Dev process** (#7) | `docs/DEVELOPMENT.md`, PR/issue templates, labels. |
| **Migration baseline** (#8) | Squashed migration history into a single `0_init` baseline so fresh databases build cleanly; old migrations archived to `prisma/_archived_migrations/`. |
| **Sales reliability hardening** (#2) | `SELECT … FOR UPDATE` row locks + idempotency on the create-sale path; settings/repairs/pagination updates; POS, Live Gold Rate, and Features/Help frontend. |

---

## 2. Staging environment (new)

A staging mirror was built in Coolify (project MPOS, separate `staging` environment) that
runs the `develop` branch:

- `staging-postgres` (PG17), `staging-redis`, `Staging-MPOS-BACKEND`, `Staging-MPOS-FRONTEND`
- Domains: `staging-api.truedesk.co.uk` / `staging-pos.truedesk.co.uk`
- Fresh DB had no accounts (mainframe provisions prod tenants but isn't wired to staging),
  so a staging tenant + OWNER user were seeded manually.
- Login form has a **company-code** field, so no `TENANT_DOMAIN_MAPPING` change was needed.

### Staging smoke test (all PASSED)
- Login / auth / tenant resolution
- Dashboard, Live Gold Rate
- POS register
- **Real-product sale** → `POST /sales` 201, stock decremented 5→4
- **Full refund** (back-to-shelf) → stock restored 4→5
- **Service sale** (Watch Battery + Cleaning) → 201
- **Partial refund** (1 of 2 units, £75) → line qty 2→1, stock restocked 3→4
- Deep `/health` (db + redis up), Settings save (`PATCH /settings` 200), Features & Help tab, Repair Tags tab
- Global exception filter confirmed live (error responses carry `timestamp` + `path`)

### Known issues found in testing (all pre-existing or new-feature; none block release)
1. **Manual-entry POS checkout → 404** (`Product manual-… not found`). Identical logic on `main`.
2. **Frontend polls `/api/v1/health` → 404** — backend serves health at `/health`; `connectionMonitor.ts` builds `${base}/health` where base already includes `/api/v1`.
3. **`repairs/tags` 401 on dashboard load** — mount-timing race; endpoint works fine elsewhere.
4. **Service/repair items are not stored as sale line items** (`items: []`; kept only in `notes`), so a service-only sale **cannot be partially refunded** — full refund only.
5. **Partial refund sets `status = REFUNDED`** (not `PARTIALLY_REFUNDED`); amounts are correct, label is misleading.

---

## 3. The production deploy (and the incident)

Merging to `main` triggers `.github/workflows/ci-cd.yml` → tests → Coolify deploy webhooks.
CI Gate passed; the PR was admin-merged (solo dev can't self-approve the required review).

The first three deploy attempts **failed and auto-rolled-back** — Coolify's health-gated
rolling update detected the new container was unhealthy and kept the old one running, so
**production never went down** through any of it.

### Root cause #1 — DB unreachable (`P1001`)
The prod backend's `DATABASE_URL` pointed at the Postgres **public IP** `31.97.116.89:5533`.
That public port had been **closed earlier for security**. The running old container kept
working on its already-established connection pool, but any freshly-built container could
not open a new connection → `P1001: Can't reach database server`.

This was a latent landmine: a Postgres restart or any container restart would have hit the
same wall, deploy or not.

**Fix:** repoint `DATABASE_URL` to the **internal Coolify hostname** (same network path Redis
already used), keeping the database name `mps_jewelry_pos`:
```
postgresql://MPSDB:<pwd>@cc48kw0kg4wk08c0wk00kc84:5432/mps_jewelry_pos?schema=public
```
Internal host (a container UUID), internal port `5432` — not the public IP/port. Now the DB
connection no longer depends on the public port at all.

### Root cause #2 — failed migration (`P3009`)
With the connection fixed, the next deploy connected but hit `P3009`: the Coolify
**pre-deployment** `migrate resolve` step had run inside a leftover container that still had
the **old** `:5533` env (so it failed with P1001 and never marked the baseline applied). The
new container's `migrate deploy` then tried to apply `0_init`, failed on already-existing
tables, and recorded `0_init` as a **failed** migration — which blocks all future deploys.

`prisma migrate resolve --applied 0_init` could not be used from the running container
(`P3017` — the old image doesn't contain the `0_init` folder). So the failed record was
cleared directly with SQL (no data touched, checksum preserved):
```sql
UPDATE _prisma_migrations
SET finished_at = now(), logs = NULL, rolled_back_at = NULL, applied_steps_count = 1
WHERE migration_name = '0_init';
```
run via `npx prisma db execute --file …`.

### Success
The next deploy printed **`No pending migrations to apply`**, connected to Postgres + Redis,
booted, passed the healthcheck, and removed the old container. Prod `/health` now returns the
deep format with `database` and `redis` both `up`.

---

## 4. Follow-ups (opened by this work)

**High priority**
- [ ] **mainframe-backend almost certainly has the same public-IP `DATABASE_URL` landmine** — repoint it to the internal host **before** its next deploy, or it will fail identically.
- [ ] **Rotate exposed secrets** — `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, and the `MPSDB` DB password were printed in build logs (Coolify bakes env as build ARGs). Move secrets to Coolify "runtime-only" so they stop landing in build output. `ENCRYPTION_KEY` needs care if it encrypts stored fields.
- [ ] **Set `HRMS_ENCRYPTION_KEY`** in prod (32-char) — currently using a derived dev key.

**Medium**
- [ ] **Google Drive disabled in prod** — `GOOGLE_DRIVE_PRIVATE_KEY` fails to decode (`error:1E08010C`), silently falling back to local file storage. Fix the key formatting/newlines.
- [ ] **Remove the prod pre-deployment command** — reconciliation is done; it now just fails harmlessly.
- [ ] Investigate the `CacheService "Redis not configured"` log line (main cache + throttler connect to Redis fine — likely an env-var name mismatch).
- [ ] File the 5 staging findings above as issues; the service-sale / partial-refund limitation (#4) is the most substantive.

**From earlier roadmap**
- [ ] Flip Sentry on (`SENTRY_DSN`).
- [ ] Wire `develop → staging` auto-deploy into `ci-cd.yml`.

---

## 5. Lessons

- **Closing the public DB port silently broke deploys.** Apps should reach managed databases
  over the internal network (hostname), never the public IP — match what Redis was already doing.
- **Health-gated rolling deploys are worth it.** Three failed prod deploys, zero downtime.
- **Baseline reconciliation must run with the new image and the correct DB URL.** The Coolify
  pre-deployment hook ran with stale env here; when a `migrate resolve` isn't possible, a direct
  `_prisma_migrations` SQL update is the safe escape hatch (it preserves the checksum).
