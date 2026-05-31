# Runbook — Database Backup & Restore (Tier 0)

> **What this protects:** the production Postgres database (all tenants' sales, payments,
> customers, repairs, financials). **Off-host destination:** Google Drive on
> `idearigs@gmail.com` (Google One). **Encryption:** AES-256 (the dump holds PII + money data).
>
> Backups are **worthless until a restore is tested.** Do Part C at least once now, and again
> quarterly.

---

## Overview

```
 Coolify scheduled task (daily)                       Google Drive (idearigs@gmail.com)
 ┌──────────────────────────────┐                     ┌───────────────────────────────┐
 │ pg_dump → gpg(AES-256) → rclone ───── upload ─────▶ │ TrueDesk-Backups/YYYY/MM/*.gpg │
 └──────────────────────────────┘                     └───────────────────────────────┘
                │ on failure
                ▼
        alert (HEALTHCHECK_URL/fail)
```

Files: `scripts/backup/pg_backup.sh`, `scripts/backup/pg_restore.sh`, `scripts/backup/Dockerfile`.

---

## Part A — One-time setup

### A1. Generate the encryption passphrase (do this first, store it safely)

```bash
openssl rand -base64 32
```

- Save this in your password manager as **`BACKUP_ENCRYPTION_PASSPHRASE`**.
- ⚠️ **If you lose it, the backups cannot be decrypted.** Store it somewhere that is NOT
  only on the server being backed up (e.g. a password manager, not just Coolify).

### A2. Authorize rclone for Google Drive (the OAuth step — needs a browser once)

The production server is headless, so authorize on your laptop, then copy the token over.

**On your laptop (has a browser):**
```bash
# install rclone if needed:  https://rclone.org/install/
rclone config
```
Then:
1. `n` (new remote) → name it **`gdrive`**
2. Storage type → `drive` (Google Drive)
3. `client_id` / `client_secret` → leave **blank** (press Enter) to use rclone's defaults
4. `scope` → choose **`1`** (`drive` — full access) *or* `3` (`drive.file`, app-created files only — also fine)
5. `root_folder_id`, `service_account_file` → leave blank
6. "Edit advanced config?" → `n`
7. "Use auto config?" → `y` → a browser opens → **log in as `idearigs@gmail.com`** and allow
8. "Configure this as a Shared Drive?" → `n` (it's a personal Drive)
9. `y` to confirm, then `q` to quit

Find where rclone saved the config and copy its contents:
```bash
rclone config file      # prints the path, e.g. ~/.config/rclone/rclone.conf
cat "$(rclone config file | tail -1)"
```
You'll paste this `rclone.conf` into Coolify in step A4.

### A3. Create the backup folder in Drive

```bash
rclone mkdir gdrive:TrueDesk-Backups
rclone lsd gdrive:           # confirm it exists
```
So `RCLONE_REMOTE` = **`gdrive:TrueDesk-Backups`**.

### A4. Deploy the backup runner in Coolify

1. **New resource → Docker image (or build from this repo)** using `scripts/backup/Dockerfile`.
   Put it on the **same network as the production Postgres** so `pg_dump` can reach it.
2. **Make it a Scheduled Task** with cron `0 2 * * *` (daily 02:00 UTC — pick a quiet hour).
3. **Mount the rclone config** from A2 as a file at `/config/rclone/rclone.conf`
   (Coolify: add it as a *file mount* / config-file with the pasted contents).
4. **Environment variables / secrets:**

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | the production Postgres connection string (internal network host) |
   | `BACKUP_ENCRYPTION_PASSPHRASE` | the passphrase from A1 |
   | `RCLONE_REMOTE` | `gdrive:TrueDesk-Backups` |
   | `BACKUP_RETENTION_DAYS` | `30` (or higher — storage is ample) |
   | `RCLONE_CONFIG` | `/config/rclone/rclone.conf` |
   | `HEALTHCHECK_URL` | *(optional)* a https://healthchecks.io ping URL — see A5 |

### A5. (Recommended) Failure alerting

Create a free check at **https://healthchecks.io**, set its period to ~1 day + grace, and put
its ping URL in `HEALTHCHECK_URL`. The script pings it on success and `…/fail` on failure, so
**you get an email/Slack alert if a nightly backup ever stops or fails** — instead of finding
out during a disaster. (This is the first piece of Tier 1 observability.)

---

## Part B — Run a backup manually (smoke test)

From the deployed container (Coolify → the resource → Terminal/Exec):
```bash
/opt/backup/pg_backup.sh
```
Expect `BACKUP OK: truedesk_<timestamp>.dump.gpg`. Then confirm it's in Drive:
```bash
rclone lsf gdrive:TrueDesk-Backups --recursive
```
You should also see the file under **My Drive → TrueDesk-Backups → YYYY → MM** in the
`idearigs@gmail.com` web UI.

---

## Part C — Test a RESTORE (do this now; backups are unproven until you do)

**Never practice-restore into production.** Use a scratch database.

1. Create a scratch DB (e.g. a second Postgres in Coolify, or `createdb restore_test`).
2. From the backup container shell:
   ```bash
   export BACKUP_ENCRYPTION_PASSPHRASE='…'        # same as A1
   export RCLONE_REMOTE='gdrive:TrueDesk-Backups'
   export RCLONE_CONFIG='/config/rclone/rclone.conf'
   /opt/backup/pg_restore.sh --target 'postgres://user:pass@host:5432/restore_test' --latest
   # type RESTORE when prompted
   ```
3. **Verify** the restore is real — connect to `restore_test` and check:
   ```sql
   SELECT count(*) FROM sales;
   SELECT count(*) FROM customers;
   SELECT max("createdAt") FROM sales;   -- recent data present?
   ```
   Numbers should look like production. If they do → **your backups are proven.** ✅

---

## Part D — Disaster recovery (production DB lost)

1. Stand up a fresh Postgres (Coolify) and create an empty DB.
2. Restore the newest good backup into it:
   ```bash
   /opt/backup/pg_restore.sh --target 'postgres://…/truedesk_prod' --latest
   ```
3. Point the backend's `DATABASE_URL` at the restored DB; redeploy.
4. Verify: log in, check a recent sale, run a test transaction.
5. Post-incident: note the data-loss window (last backup → failure time) and consider
   shrinking the backup interval or adding WAL/PITR if that window is too large.

---

## Maintenance & checks

- **Weekly:** glance at healthchecks.io (or Drive) — is last night's backup present?
- **Quarterly:** repeat Part C (test restore). An untested backup is a guess.
- **On Postgres major upgrade:** bump the `postgres:16-alpine` base in the Dockerfile to match.
- **Retention:** `BACKUP_RETENTION_DAYS` controls auto-pruning of old dumps off the remote.

## Known limitations / next steps

- This is **daily snapshot** backup → worst-case data loss = up to ~24h of transactions.
  If that's too much, the next step is **WAL archiving / PITR** (continuous) — a Tier-3 upgrade.
- The encryption passphrase is the single most important secret here. Losing it = losing the
  ability to restore. Keep an offline copy.
