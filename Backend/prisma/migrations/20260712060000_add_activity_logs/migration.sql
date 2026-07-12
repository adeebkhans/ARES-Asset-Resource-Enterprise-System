-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_logs_orgId_idx" ON "activity_logs"("orgId");

-- CreateIndex
CREATE INDEX "activity_logs_orgId_userId_idx" ON "activity_logs"("orgId", "userId");

-- CreateIndex
CREATE INDEX "activity_logs_orgId_entityType_entityId_idx" ON "activity_logs"("orgId", "entityType", "entityId");
