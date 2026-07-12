-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('MAINTENANCE', 'TRANSFER', 'AUDIT_DISCREPANCY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ESCALATED');

-- CreateTable
CREATE TABLE "approval_rules" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "approvalType" "ApprovalType" NOT NULL,
    "slaHours" INTEGER NOT NULL DEFAULT 24,
    "escalateToRole" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" "ApprovalType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "currentApproverUserId" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "escalatedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_delegations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "delegatorUserId" TEXT NOT NULL,
    "delegateUserId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_delegations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "approval_rules_orgId_approvalType_key" ON "approval_rules"("orgId", "approvalType");

-- CreateIndex
CREATE INDEX "approval_rules_orgId_idx" ON "approval_rules"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "approvals_entityType_entityId_key" ON "approvals"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "approvals_orgId_idx" ON "approvals"("orgId");

-- CreateIndex
CREATE INDEX "approvals_orgId_status_idx" ON "approvals"("orgId", "status");

-- CreateIndex
CREATE INDEX "approvals_orgId_currentApproverUserId_idx" ON "approvals"("orgId", "currentApproverUserId");

-- CreateIndex
CREATE INDEX "approvals_dueAt_idx" ON "approvals"("dueAt");

-- CreateIndex
CREATE INDEX "approval_delegations_orgId_idx" ON "approval_delegations"("orgId");

-- CreateIndex
CREATE INDEX "approval_delegations_orgId_delegatorUserId_idx" ON "approval_delegations"("orgId", "delegatorUserId");

-- CreateIndex
CREATE INDEX "approval_delegations_orgId_delegateUserId_idx" ON "approval_delegations"("orgId", "delegateUserId");

-- AddForeignKey
ALTER TABLE "approval_rules" ADD CONSTRAINT "approval_rules_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_currentApproverUserId_fkey" FOREIGN KEY ("currentApproverUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_delegatorUserId_fkey" FOREIGN KEY ("delegatorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_delegateUserId_fkey" FOREIGN KEY ("delegateUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
