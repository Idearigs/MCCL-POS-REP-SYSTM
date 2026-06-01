# TrueDesk DB backup runner — postgres-client + rclone + gpg in one small image.
# Deploy this as a Coolify *scheduled task* (cron) on the same network as the DB.
#
# IMPORTANT: the postgres-client major version must be >= your production Postgres
# server version. CI uses Postgres 16, so this pins client 16. Bump if you upgrade.
FROM postgres:16-alpine

# rclone (off-host upload) + gpg (encryption) + curl (health pings) + bash
RUN apk add --no-cache rclone gnupg curl bash tzdata

WORKDIR /opt/backup
COPY pg_backup.sh pg_restore.sh /opt/backup/
RUN chmod +x /opt/backup/pg_backup.sh /opt/backup/pg_restore.sh

# Default command runs one backup. In Coolify, set this image as a scheduled task
# with a daily cron (e.g. "0 2 * * *") and mount rclone.conf + inject env secrets.
CMD ["/opt/backup/pg_backup.sh"]
