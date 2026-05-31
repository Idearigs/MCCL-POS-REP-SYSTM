#!/usr/bin/env bash
#
# TrueDesk — Production Postgres backup → encrypted → off-host (Google Drive via rclone)
#
# Flow: pg_dump (custom format) → gzip → AES-256 encrypt (gpg) → rclone upload → rotate.
# Designed to run as a scheduled job (Coolify scheduled task / cron). Exits non-zero on
# ANY failure and pings an optional alert URL, so a silent backup failure can't hide.
#
# Required env:
#   DATABASE_URL                 postgres://user:pass@host:5432/dbname  (the PROD db)
#   BACKUP_ENCRYPTION_PASSPHRASE strong passphrase; the SAME value is required to restore
#   RCLONE_REMOTE                rclone target, e.g. gdrive:TrueDesk-Backups
# Optional env:
#   BACKUP_RETENTION_DAYS        delete remote backups older than this (default 30)
#   BACKUP_LABEL                 filename prefix (default "truedesk")
#   HEALTHCHECK_URL              GET on success; GET "$HEALTHCHECK_URL/fail" on failure
#   RCLONE_CONFIG                path to rclone.conf (default /config/rclone/rclone.conf)
#
set -Eeuo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_ENCRYPTION_PASSPHRASE:?BACKUP_ENCRYPTION_PASSPHRASE is required}"
: "${RCLONE_REMOTE:?RCLONE_REMOTE is required (e.g. gdrive:TrueDesk-Backups)}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
LABEL="${BACKUP_LABEL:-truedesk}"
export RCLONE_CONFIG="${RCLONE_CONFIG:-/config/rclone/rclone.conf}"

TS="$(date -u +%Y%m%d_%H%M%SZ)"
WORKDIR="$(mktemp -d)"
DUMP="${WORKDIR}/${LABEL}_${TS}.dump"          # pg_dump custom format (already compressed)
ENC="${DUMP}.gpg"                               # encrypted artifact we upload
REMOTE_PATH="${RCLONE_REMOTE}/$(date -u +%Y)/$(date -u +%m)"

log()  { echo "[$(date -u +%H:%M:%SZ)] $*"; }
alert_fail() {
  log "BACKUP FAILED: $*"
  [[ -n "${HEALTHCHECK_URL:-}" ]] && curl -fsS -m 10 --retry 2 "${HEALTHCHECK_URL}/fail" >/dev/null 2>&1 || true
}
cleanup() { rm -rf "${WORKDIR}"; }
trap 'alert_fail "line $LINENO"' ERR
trap cleanup EXIT

# ── 1. Dump (custom format = compressed, parallel-restorable, schema+data) ──────
log "Starting pg_dump…"
pg_dump --format=custom --no-owner --no-privileges --file="${DUMP}" "${DATABASE_URL}"
DUMP_SIZE="$(du -h "${DUMP}" | cut -f1)"
log "pg_dump done (${DUMP_SIZE})."

# ── 2. Encrypt (AES-256). Dump contains all customer PII + financials. ─────────
log "Encrypting…"
gpg --batch --yes --symmetric --cipher-algo AES256 \
    --passphrase "${BACKUP_ENCRYPTION_PASSPHRASE}" \
    --output "${ENC}" "${DUMP}"
rm -f "${DUMP}"   # never keep plaintext around

# ── 3. Upload off-host ─────────────────────────────────────────────────────────
log "Uploading to ${REMOTE_PATH}…"
rclone copyto "${ENC}" "${REMOTE_PATH}/$(basename "${ENC}")" --drive-use-trash=false

# ── 4. Verify the upload actually landed ───────────────────────────────────────
if ! rclone lsf "${REMOTE_PATH}/$(basename "${ENC}")" >/dev/null 2>&1; then
  alert_fail "upload verification failed — file not found on remote"
  exit 1
fi
log "Upload verified."

# ── 5. Rotate old backups (capacity is fine on Google One; this just stays tidy)
log "Pruning remote backups older than ${RETENTION_DAYS} days…"
rclone delete "${RCLONE_REMOTE}" --min-age "${RETENTION_DAYS}d" --drive-use-trash=false || \
  log "WARN: prune step had a non-fatal issue (backup itself succeeded)."

# ── 6. Success signal ──────────────────────────────────────────────────────────
log "BACKUP OK: $(basename "${ENC}") (${DUMP_SIZE} before encryption)."
[[ -n "${HEALTHCHECK_URL:-}" ]] && curl -fsS -m 10 --retry 2 "${HEALTHCHECK_URL}" >/dev/null 2>&1 || true
