# Staging Environment — Wiring & Setup Guide

Full mirror of production (POS + Mainframe + DBs) on the `develop` branch, so all
features — including LemonSqueezy billing — can be tested end to end before they
reach the live client.

> ⚠️ **Verify this domain spelling first:** you gave the mainframe backend as
> `staging-mianframe-api.truedesk.co.uk` (note "mianframe"). Whatever the DNS
> record actually is, it must be used **identically** everywhere below — a single
> character off and the admin panel can't reach its API. Fix it in one place
> (the table) and reuse.

## 1. The four staging services

| # | Service | Repo dir | Branch | Staging domain |
|---|---------|----------|--------|----------------|
| 1 | POS backend (NestJS) | `backend/` | `develop` | `staging-api.truedesk.co.uk` |
| 2 | POS frontend (React) | `src/` | `develop` | `staging-pos.truedesk.co.uk` |
| 3 | Mainframe backend (Express) | `mainframe-backend/` | `develop` | `staging-mianframe-api.truedesk.co.uk` ⚠️ |
| 4 | Mainframe admin (React) | `mainframe-admin/` | `develop` | `staging-mainframe.truedesk.co.uk` |

Plus two databases: **staging POS DB** and **staging mainframe DB** (you cloned
these).

## 2. How the pieces talk to each other

```
[staging-pos]  ──API──▶ [staging-api] ──(LemonSqueezy checkout/webhook)──▶ LemonSqueezy (TEST mode)
   (POS UI)                (POS backend = billing source of truth)
                               ▲
                               │ HMAC (INTERNAL_API_KEY) — /overview proxy
                               │
[staging-mainframe] ──API──▶ [staging-mianframe-api]
   (admin UI)                  (mainframe backend)
```

Three links must line up, or it won't work:
1. **Admin → mainframe API:** admin build `VITE_API_URL` → the mainframe backend domain.
2. **Mainframe API → POS API:** `POS_BACKEND_URL` → the POS backend, and
   `INTERNAL_API_KEY` **identical** on both (HMAC auth for the `/overview` proxy).
3. **POS UI → POS API:** `VITE_API_BASE_URL` → the POS backend, and the POS
   backend `CORS_ORIGIN` allows the POS UI origin.

## 3. GitHub secrets (for the new staging CI deploy jobs)

The pipeline now has `develop`-triggered staging deploy jobs. They each **skip
silently** until you add the matching secret, so nothing breaks before you do.
Add under **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Coolify app it deploys |
|--------|------------------------|
| `COOLIFY_BACKEND_STAGING_WEBHOOK` | POS backend (staging) |
| `COOLIFY_FRONTEND_STAGING_WEBHOOK` | POS frontend (staging) |
| `COOLIFY_MAINFRAME_BACKEND_STAGING_WEBHOOK` | Mainframe backend (staging) |
| `COOLIFY_MAINFRAME_ADMIN_STAGING_WEBHOOK` | Mainframe admin (staging) |

Get each value from Coolify → the app → **Webhooks → Deploy webhook (GET)**.
`COOLIFY_TOKEN` already exists and is reused. After this, a push to `develop`
that touches a service auto-redeploys its staging app.

## 4. Environment variables per service (set in Coolify)

### 1) POS backend — `staging-api.truedesk.co.uk`
| Var | Value |
|-----|-------|
| `DATABASE_URL` | staging POS database URL |
| `NODE_ENV` | `production` (it's a real deploy; keeps behaviour identical to prod) |
| `PORT` | `3000` |
| `REDIS_HOST` / `REDIS_PORT` | staging redis / `6379` |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | staging secrets (NOT the prod ones) |
| `CORS_ORIGIN` | `https://staging-pos.truedesk.co.uk` |
| `APP_URL` | `https://staging-api.truedesk.co.uk` |
| `INTERNAL_API_KEY` | **staging shared secret — must match the mainframe backend (below)** |
| `ENCRYPTION_KEY` | staging encryption key |
| `DEFAULT_TENANT_ID` | `buymejewellery` (or your staging test tenant) |
| `LEMONSQUEEZY_API_KEY` | **TEST-mode** key (add when you send it) |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | signing secret of the **test** webhook (§6) |
| `LS_STORE_ID` / `LS_VARIANT_ID` | your store / variant (defaults `333794` / `1710752`) |

### 2) POS frontend — `staging-pos.truedesk.co.uk`
| Var | Value |
|-----|-------|
| `VITE_API_BASE_URL` | `https://staging-api.truedesk.co.uk/api/v1` |

(Already set if POS staging was working — just confirm.)

### 3) Mainframe backend — `staging-mianframe-api.truedesk.co.uk` ⚠️
| Var | Value |
|-----|-------|
| `DATABASE_URL` | staging mainframe database URL |
| `PORT` | `3001` |
| `JWT_SECRET` / `PASSWORD_SALT` | staging secrets |
| `CORS_ORIGINS` | `https://staging-mainframe.truedesk.co.uk` (comma-separated; add localhost if needed) |
| `MAINFRAME_URL` | `https://staging-mainframe.truedesk.co.uk` |
| `POS_BACKEND_URL` | `https://staging-api.truedesk.co.uk/api/v1` ← **points at staging POS** |
| `INTERNAL_API_KEY` | **must equal the POS backend's staging value** |
| `SMTP_*` | staging/test mail creds (optional for billing) |

### 4) Mainframe admin — `staging-mainframe.truedesk.co.uk`
| Var | Value |
|-----|-------|
| `VITE_API_URL` | `https://staging-mianframe-api.truedesk.co.uk/api/v1` ⚠️ exact spelling |

> Vite vars are **build-time** — after changing `VITE_*`, rebuild/redeploy the app
> in Coolify (a restart alone won't pick them up).

## 5. Databases

Both backends **self-initialise on boot** — you don't have to hand-load schema:
- Mainframe backend runs its migrations + seeds admin, features, and the Buy Me
  Jewellery profile (`mainframe-backend/src/index.ts`).
- POS backend runs Prisma migrations and the **trial seed**
  (`backend/src/core/seed/buyme-trial.seed.ts`): Buy Me Jewellery → PROFESSIONAL,
  trial ends **30 Jun 2026**, unless they already have a LemonSqueezy subscription.

A fresh empty staging DB is fine. If you cloned prod data instead, the seeds are
idempotent and won't overwrite a paid subscription.

Default admin login is seeded by the mainframe backend (see `index.ts`
`seedAdmin` / `/setup`). Change the password after first login.

## 6. LemonSqueezy in staging (keep separate from production)

Keep test and live **completely separate**:
- **Production** POS backend: **LIVE** API key + a **LIVE** webhook →
  `https://api.truedesk.co.uk/api/v1/webhooks/lemon-squeezy`.
- **Staging** POS backend: **TEST-mode** API key + a **TEST** webhook →
  `https://staging-api.truedesk.co.uk/api/v1/webhooks/lemon-squeezy`.

Each webhook has its own signing secret → put it in that environment's
`LEMONSQUEEZY_WEBHOOK_SECRET`. Subscribe each webhook to: `order_created`,
`subscription_created`, `subscription_updated`, `subscription_cancelled`,
`subscription_resumed`, `subscription_expired`, `subscription_payment_success`,
`subscription_payment_failed`, `subscription_payment_recovered`.

> You said the live store currently has a **production API key with a test-mode
> webhook** — that mix means live payments won't be signed/verified as expected.
> When you disable test mode for today's real payments, make production = LIVE key
> **and** LIVE webhook, and leave the TEST key/webhook for staging only. Send me
> the test-mode key and I'll confirm the staging wiring.

## 7. End-to-end verification (staging)

1. `staging-mainframe` → log in → **Billing** tab → **Payment Status — Live** loads
   (proves admin → mainframe-api → POS-api HMAC chain works).
2. `staging-pos` → log in as Buy Me Jewellery → blue **trial banner** with countdown
   to 30 Jun 2026 + **Subscribe now**.
3. Click **Subscribe now** → `/subscription` → **Subscribe Now** → LemonSqueezy
   **test** checkout. Pay with a test card.
4. POS backend logs: `[LS Webhook] subscription_created — queued` → `ACTIVATED`.
5. Reload POS: trial banner gone; `/subscription` shows **Active** + **Manage Billing**.
6. `staging-mainframe` → Billing → tenant now shows **Paid · Active** + next renewal.

## 8. Promoting to production

Same code, different env. Once staging passes: merge `develop → main`. The
production deploy jobs fire automatically per changed service. Then set the
**LIVE** LemonSqueezy key + webhook on the production POS backend and run the same
verification against the live domains. See `lemonsqueezy-setup.md` for the prod
checklist.

## 9. Quick troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Admin "Billing" shows *Could not load live payment status* | `POS_BACKEND_URL` wrong, or `INTERNAL_API_KEY` mismatch between mainframe & POS staging |
| Admin can't reach API at all | `VITE_API_URL` typo (the `mianframe` spelling) or not rebuilt after env change |
| Checkout button errors | `LEMONSQUEEZY_API_KEY` empty/wrong on staging POS, or tenant has no profile row |
| Webhook does nothing | LS test webhook URL wrong, or `LEMONSQUEEZY_WEBHOOK_SECRET` ≠ the webhook's secret |
| Trial banner never shows | Subscription not on trial / already has `lsSubscriptionId`, or POS CORS blocks `by-subdomain` |
| CORS errors in POS | `CORS_ORIGIN` on staging POS backend ≠ `https://staging-pos.truedesk.co.uk` |
