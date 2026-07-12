-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AuditCycleStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "AuditResult" AS ENUM ('VERIFIED', 'MISSING', 'DAMAGED');

-- CreateTable
CREATE TABLE "maintenance_requests" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "issueDescription" TEXT NOT NULL,
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "technicianName" TEXT,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_cycles" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "scopeDepartmentId" TEXT,
    "scopeLocation" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "AuditCycleStatus" NOT NULL DEFAULT 'PLANNED',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_assignments" (
    "id" TEXT NOT NULL,
    "auditCycleId" TEXT NOT NULL,
    "auditorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_records" (
    "id" TEXT NOT NULL,
    "auditCycleId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "result" "AuditResult" NOT NULL,
    "notes" TEXT,
    "auditedById" TEXT NOT NULL,
    "auditedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discrepancy_reports" (
    "id" TEXT NOT NULL,
    "auditCycleId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemCount" INTEGER NOT NULL,
    "summary" JSONB NOT NULL,

    CONSTRAINT "discrepancy_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "maintenance_requests_orgId_idx" ON "maintenance_requests"("orgId");

-- CreateIndex
CREATE INDEX "maintenance_requests_orgId_status_idx" ON "maintenance_requests"("orgId", "status");

-- CreateIndex
CREATE INDEX "maintenance_requests_assetId_idx" ON "maintenance_requests"("assetId");

-- CreateIndex
CREATE INDEX "audit_cycles_orgId_idx" ON "audit_cycles"("orgId");

-- CreateIndex
CREATE INDEX "audit_cycles_orgId_status_idx" ON "audit_cycles"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "audit_assignments_auditCycleId_auditorUserId_key" ON "audit_assignments"("auditCycleId", "auditorUserId");

-- CreateIndex
CREATE INDEX "audit_assignments_auditorUserId_idx" ON "audit_assignments"("auditorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "audit_records_auditCycleId_assetId_key" ON "audit_records"("auditCycleId", "assetId");

-- CreateIndex
CREATE INDEX "audit_records_assetId_idx" ON "audit_records"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "discrepancy_reports_auditCycleId_key" ON "discrepancy_reports"("auditCycleId");

-- CreateIndex
CREATE INDEX "notifications_orgId_idx" ON "notifications"("orgId");

-- CreateIndex
CREATE INDEX "notifications_orgId_userId_idx" ON "notifications"("orgId", "userId");

-- CreateIndex
CREATE INDEX "notifications_orgId_userId_isRead_idx" ON "notifications"("orgId", "userId", "isRead");

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_cycles" ADD CONSTRAINT "audit_cycles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_cycles" ADD CONSTRAINT "audit_cycles_scopeDepartmentId_fkey" FOREIGN KEY ("scopeDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_cycles" ADD CONSTRAINT "audit_cycles_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_assignments" ADD CONSTRAINT "audit_assignments_auditCycleId_fkey" FOREIGN KEY ("auditCycleId") REFERENCES "audit_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_assignments" ADD CONSTRAINT "audit_assignments_auditorUserId_fkey" FOREIGN KEY ("auditorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_records" ADD CONSTRAINT "audit_records_auditCycleId_fkey" FOREIGN KEY ("auditCycleId") REFERENCES "audit_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_records" ADD CONSTRAINT "audit_records_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_records" ADD CONSTRAINT "audit_records_auditedById_fkey" FOREIGN KEY ("auditedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discrepancy_reports" ADD CONSTRAINT "discrepancy_reports_auditCycleId_fkey" FOREIGN KEY ("auditCycleId") REFERENCES "audit_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
