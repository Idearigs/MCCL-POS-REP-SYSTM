#!/usr/bin/env node
/**
 * Google Drive → VPS Local Storage Migration Script
 * Tenant: buymejewellery
 *
 * Purpose:
 *   1. Fetch all product_images rows for the buymejewellery tenant from the DB
 *   2. Download each image that is stored in Google Drive (has driveFileId)
 *   3. Save to /app/uploads/product-images/ (the uploads_data Docker volume)
 *   4. Update the DB row: set filePath to local URL, clear driveFileId/driveViewLink
 *
 * Usage (run INSIDE the backend container):
 *   docker cp scripts/migrate-drive-images.js mps_backend:/tmp/migrate-drive-images.js
 *   docker exec -it mps_backend node /tmp/migrate-drive-images.js
 *
 * Required env vars (already present in the container):
 *   DATABASE_URL, APP_URL,
 *   GOOGLE_DRIVE_CLIENT_EMAIL, GOOGLE_DRIVE_PRIVATE_KEY, GOOGLE_DRIVE_PROJECT_ID
 *
 * Optional overrides:
 *   TENANT_ID=buymejewellery  (default)
 *   UPLOAD_DIR=/app/uploads/product-images  (default)
 *   DRY_RUN=1  (print what would happen, make no changes)
 */

'use strict';

const { Client } = require('pg');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Config ───────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
const APP_URL = (process.env.APP_URL || 'https://api.truedesk.co.uk').replace(/\/$/, '');
const TENANT_ID = process.env.TENANT_ID || 'buymejewellery';
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads/product-images';
const DRY_RUN = process.env.DRY_RUN === '1';

const CLIENT_EMAIL = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
const PRIVATE_KEY = (process.env.GOOGLE_DRIVE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const PROJECT_ID = process.env.GOOGLE_DRIVE_PROJECT_ID;

// ─── Validation ───────────────────────────────────────────────────────────────

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL env var is required');
  process.exit(1);
}
if (!CLIENT_EMAIL || !PRIVATE_KEY || !PROJECT_ID) {
  console.error('❌ Google Drive credentials required: GOOGLE_DRIVE_CLIENT_EMAIL, GOOGLE_DRIVE_PRIVATE_KEY, GOOGLE_DRIVE_PROJECT_ID');
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mimeToExt(mimeType) {
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };
  return map[mimeType] || '.jpg';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Google Drive → VPS Migration | Tenant:', TENANT_ID);
  if (DRY_RUN) console.log('  *** DRY RUN — no files written, no DB changes ***');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // ── 1. Connect to DB ──────────────────────────────────────────────────────

  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  console.log('✅ Connected to database');

  // ── 2. Init Google Drive ──────────────────────────────────────────────────

  const auth = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  const drive = google.drive({ version: 'v3', auth });

  // Test auth
  const about = await drive.about.get({ fields: 'user' });
  console.log('✅ Google Drive authenticated as:', about.data.user.emailAddress);
  console.log('');

  // ── 3. Fetch product_images for this tenant ───────────────────────────────

  const { rows: images } = await db.query(
    `SELECT pi.id, pi."productId", pi."fileName", pi."filePath",
            pi."driveFileId", pi."driveViewLink", pi."fileSize", pi."mimeType",
            pi."isMain", pi."alt"
     FROM product_images pi
     JOIN products p ON p.id = pi."productId"
     WHERE p."tenantId" = $1
     ORDER BY pi."createdAt" ASC`,
    [TENANT_ID],
  );

  console.log(`📦 Found ${images.length} product_images for tenant "${TENANT_ID}"`);

  const driveImages = images.filter((img) => img.driveFileId);
  const localImages = images.filter((img) => !img.driveFileId);

  console.log(`   ├─ ${driveImages.length} stored in Google Drive (need migration)`);
  console.log(`   └─ ${localImages.length} already on local storage (no action needed)`);
  console.log('');

  if (driveImages.length === 0) {
    console.log('🎉 Nothing to migrate — all images are already on local storage!');
    await db.end();
    return;
  }

  // ── 4. Ensure upload directory exists ────────────────────────────────────

  if (!DRY_RUN) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
  }

  // ── 5. Download & migrate each Drive image ────────────────────────────────

  let success = 0;
  let failed = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < driveImages.length; i++) {
    const img = driveImages[i];
    const prefix = `[${i + 1}/${driveImages.length}]`;

    console.log(`${prefix} ID=${img.id}  Drive=${img.driveFileId}`);
    console.log(`        originalFile="${img.fileName}"  mime=${img.mimeType}`);

    try {
      // Build a deterministic filename: timestamp-prefix + original name
      // Use the DB row id as the unique prefix to be idempotent
      const ext = mimeToExt(img.mimeType);
      const baseName = img.fileName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, '');
      const uniqueFileName = `${Date.now()}-${img.id.slice(0, 8)}-${baseName}${ext}`;
      const localFilePath = path.join(UPLOAD_DIR, uniqueFileName);
      const localUrl = `${APP_URL}/uploads/product-images/${uniqueFileName}`;

      if (DRY_RUN) {
        console.log(`        → [DRY RUN] Would save to: ${localFilePath}`);
        console.log(`        → [DRY RUN] Would update filePath to: ${localUrl}`);
        skipped++;
        continue;
      }

      // Download from Google Drive
      const fileRes = await drive.files.get(
        { fileId: img.driveFileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'arraybuffer' },
      );

      const buffer = Buffer.from(fileRes.data);
      console.log(`        ↓ Downloaded ${buffer.length} bytes`);

      // Write to local disk
      fs.writeFileSync(localFilePath, buffer);
      console.log(`        ✅ Saved: ${uniqueFileName}`);

      // Update DB
      await db.query(
        `UPDATE product_images
         SET "filePath" = $1,
             "driveFileId" = NULL,
             "driveViewLink" = NULL,
             "fileSize" = $2
         WHERE id = $3`,
        [localUrl, buffer.length, img.id],
      );
      console.log(`        ✅ DB updated → ${localUrl}`);

      success++;

      // Small delay to avoid rate limiting
      await sleep(200);

    } catch (err) {
      console.error(`        ❌ FAILED: ${err.message}`);
      errors.push({ id: img.id, driveFileId: img.driveFileId, error: err.message });
      failed++;

      // On 403/404, skip and continue; on other errors, also continue
      await sleep(500);
    }

    console.log('');
  }

  // ── 6. Summary ────────────────────────────────────────────────────────────

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Migration Summary');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  ✅ Success:  ${success}`);
  console.log(`  ❌ Failed:   ${failed}`);
  if (DRY_RUN) console.log(`  ⏭  Skipped:  ${skipped} (dry run)`);
  console.log('');

  if (errors.length > 0) {
    console.log('  Failed images:');
    errors.forEach((e) => {
      console.log(`    - DB id=${e.id}  driveFileId=${e.driveFileId}`);
      console.log(`      Error: ${e.error}`);
    });
    console.log('');
  }

  if (!DRY_RUN && success > 0) {
    console.log('  ✅ Migration complete!');
    console.log('');
    console.log('  NEXT STEPS:');
    console.log('  1. Verify images are visible in the app at https://pos.buymejewellery.co.uk');
    console.log('  2. Remove buymejewellery from GOOGLE_DRIVE_TENANT_IDS in Coolify env vars');
    console.log('     (set to empty string "" or remove the env var entirely)');
    console.log('  3. Redeploy the backend so Google Drive is no longer initialised');
  }

  console.log('═══════════════════════════════════════════════════════════════');

  await db.end();

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
