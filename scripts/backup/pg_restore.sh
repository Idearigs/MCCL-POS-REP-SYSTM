#!/usr/bin/env bash
#
# TrueDesk — Restore an encrypted Postgres backup pulled from Google Drive (rclone).
#
# SAFETY: this OVERWRITES the target database. It refuses to run unless you pass an
# explicit --target connection string AND type the confirmation. Practice restores
# into a SCRATCH database first (see docs/runbooks/database-backup-restore.md).
#
# Usage:
#   ./pg_restore.sh --target "postgres://user:pass@host:5432/restore_test" [--file NAME|--latest]
#
# Required env:
#   BACKUP_ENCRYPTION_PASSPHRASE  same passphrase used to create the backup
#   RCLONE_REMOTE                 e.g. gdrive:TrueDesk-Backups
# Optional env:
#   RCLONE_CONFIG                 path to rclone.conf (default /config/rclone/rclone.conf)
#
set -Eeuo pipefail

: "${BACKUP_ENCRYPTION_PASSPHRASE:?BACKUP_ENCRYPTION_PASSPHRASE is required}"
: "${RCLONE_REMOTE:?RCLONE_REMOTE is required}"
export RCLONE_CONFIG="${RCLONE_CONFIG:-/config/rclone/rclone.conf}"

TARGET=""; FILE=""; USE_LATEST=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) TARGET="$2"; shift 2;;
    --file)   FILE="$2";   shift 2;;
    --latest) USE_LATEST=true; shift;;
    *) echo "Unknown arg: $1"; exit 2;;
  esac
done
[[ -z "${TARGET}" ]] && { echo "ERROR: --target is required"; exit 2; }

WORKDIR="$(mktemp -d)"; trap 'rm -rf "${WORKDIR}"' EXIT
log() { echo "[$(date -u +%H:%M:%SZ)] $*"; }

# ── Pick which backup to restore ───────────────────────────────────────────────
if [[ "${USE_LATEST}" == true || -z "${FILE}" ]]; then
  log "Finding latest backup on ${RCLONE_REMOTE}…"
  FILE="$(rclone lsf "${RCLONE_REMOTE}" --recursive --files-only | grep '\.dump\.gpg$' | sort | tail -1)"
  [[ -z "${FILE}" ]] && { echo "ERROR: no backups found on remote"; exit 1; }
fi
log "Selected backup: ${FILE}"

# ── Confirm (this overwrites TARGET) ───────────────────────────────────────────
TARGET_HOST="$(echo "${TARGET}" | sed -E 's#.*@([^/?]+).*#\1#')"
echo "About to RESTORE '${FILE}' INTO → ${TARGET_HOST}  (this overwrites that database)"
read -r -p "Type 'RESTORE' to proceed: " CONFIRM
[[ "${CONFIRM}" == "RESTORE" ]] || { echo "Aborted."; exit 1; }

# ── Download → decrypt → restore ───────────────────────────────────────────────
log "Downloading…"
rclone copyto "${RCLONE_REMOTE}/${FILE}" "${WORKDIR}/backup.dump.gpg"

log "Decrypting…"
gpg --batch --yes --decrypt --passphrase "${BACKUP_ENCRYPTION_PASSPHRASE}" \
    --output "${WORKDIR}/backup.dump" "${WORKDIR}/backup.dump.gpg"

log "Restoring into target (clean + if-exists)…"
pg_restore --clean --if-exists --no-owner --no-privileges \
    --dbname="${TARGET}" "${WORKDIR}/backup.dump"

log "RESTORE COMPLETE. Verify row counts / spot-check critical tables now."
