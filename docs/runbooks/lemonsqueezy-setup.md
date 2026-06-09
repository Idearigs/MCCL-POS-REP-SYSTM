# LemonSqueezy Subscriptions — Setup & Verification

This is the runbook for the tenant subscription/billing flow. The **POS backend**
(`api.truedesk.co.uk`) is the single source of truth for LemonSqueezy state; the
Mainframe admin panel reads it via an internal proxy.

## How the flow works

1. A tenant's POS shows a **trial banner** (`BillingWarningBanner`) while it's on
   an unpaid trial (`mf_subscriptions.isOnTrial` + `trialEndsAt`), with a
   **Subscribe now** button → `/subscription`.
2. `SubscriptionPage` → `POST /mainframe/subscriptions/create-checkout` builds a
   LemonSqueezy hosted checkout, embedding `custom_data.profileId` so the webhook
   can map the payment back to the tenant.
3. Customer pays. LemonSqueezy calls the webhook:
   **`POST https://api.truedesk.co.uk/api/v1/webhooks/lemon-squeezy`**
   (signature-verified, processed off the request thread via the async queue).
4. The webhook stores `lsSubscriptionId/lsStatus/...`, clears the local trial
   (`isOnTrial = false`), and sets both `mf_customer_profiles.status` **and** the
   POS `tenants.status` (ACTIVE / PAYMENT_WARNING / SUSPENDED / INACTIVE). This is
   what unlocks/locks the POS and clears the banner.
5. LemonSqueezy then bills monthly automatically. `subscription_payment_success`
   keeps `ACTIVE` + advances `nextBillingDate`; `payment_failed` → `PAYMENT_WARNING`;
   `expired`/`cancelled` (past period end) → suspend.

## Production configuration

### 1. POS backend env (Coolify → `mps_backend`)
These are now passed through `docker-compose.prod.yml`; set the **values** in Coolify:

| Var | Notes |
|-----|-------|
| `LEMONSQUEEZY_API_KEY` | **Required.** LemonSqueezy → Settings → API. Without it, checkout creation fails. |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | **Required.** Must equal the signing secret on the webhook (below). Without it, signatures are skipped (insecure). |
| `LS_STORE_ID` | Optional — defaults to `333794`. |
| `LS_VARIANT_ID` | Optional — defaults to `1710752`. Set to the variant of the product you created. |
| `INTERNAL_API_KEY` | Already set — shared HMAC secret for the admin overview proxy. |

### 2. Mainframe backend env (Coolify → `apimainframe.truedesk.co.uk`)
| Var | Notes |
|-----|-------|
| `POS_BACKEND_URL` | e.g. `https://api.truedesk.co.uk/api/v1` — used by the `/overview` proxy. |
| `INTERNAL_API_KEY` | **Must match the POS backend's value** (HMAC). |

### 3. LemonSqueezy dashboard → Webhooks
- Callback URL: `https://api.truedesk.co.uk/api/v1/webhooks/lemon-squeezy`
- Signing secret: same string as `LEMONSQUEEZY_WEBHOOK_SECRET`.
- Subscribe to: `order_created`, `subscription_created`, `subscription_updated`,
  `subscription_cancelled`, `subscription_resumed`, `subscription_expired`,
  `subscription_payment_success`, `subscription_payment_failed`,
  `subscription_payment_recovered`.

## Client trial seed

On boot the POS backend runs `seedBuymeTrial` (idempotent): it puts **Buy Me
Jewellery** on a PROFESSIONAL trial ending **30 Jun 2026** if they have no LS
subscription yet. It never touches a tenant that has already paid
(`lsSubscriptionId` set). To change date/plan, edit
`backend/src/core/seed/buyme-trial.seed.ts`.

## Verification (use LemonSqueezy **test mode**)

1. Open the tenant POS → confirm the blue **trial banner** with a countdown.
2. Click **Subscribe now** → `/subscription` → **Subscribe Now** opens the LS
   checkout. Pay with a test card.
3. Watch POS backend logs: `[LS Webhook] subscription_created — queued` →
   `Subscription ACTIVATED`.
4. Reload the POS: trial banner gone; `/subscription` shows **Active** +
   **Manage Billing**.
5. Mainframe admin → **Billing** tab → **Payment Status — Live** shows the tenant
   as **Paid · Active** with the next renewal date.

## Where things live

- Checkout / portal / status: `backend/src/features/mainframe/services/lemon-squeezy.service.ts`,
  `controllers/subscriptions.controller.ts`
- Webhook: `backend/src/features/mainframe/controllers/lemon-squeezy-webhook.controller.ts`
- Admin overview: POS `subscriptions.service.getOverview()` → mainframe-backend
  `GET /mainframe/subscriptions/overview` proxy → admin Billing tab.
- POS trial banner: `src/components/auth/BillingWarningBanner.tsx`
