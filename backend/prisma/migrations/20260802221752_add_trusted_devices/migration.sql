-- CreateTable
CREATE TABLE "public"."trusted_devices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "label" TEXT,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trusted_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trusted_devices_deviceId_key" ON "public"."trusted_devices"("deviceId");

-- CreateIndex
CREATE INDEX "trusted_devices_tenantId_userId_idx" ON "public"."trusted_devices"("tenantId", "userId");

-- AddForeignKey
ALTER TABLE "public"."trusted_devices" ADD CONSTRAINT "trusted_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."trusted_devices" ADD CONSTRAINT "trusted_devices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

