-- Add repair_tags table for server-side tag persistence

CREATE TABLE IF NOT EXISTS "repair_tags" (
  "id"          TEXT NOT NULL,
  "tenantId"    TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "color"       TEXT NOT NULL DEFAULT 'gray',
  "description" TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "repair_tags_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "repair_tags_tenantId_fkey" FOREIGN KEY ("tenantId")
    REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "repair_tags_tenantId_idx" ON "repair_tags" ("tenantId");
