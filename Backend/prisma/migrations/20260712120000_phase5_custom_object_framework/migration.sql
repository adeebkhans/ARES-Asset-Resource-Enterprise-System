-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTISELECT', 'RELATION');

-- CreateEnum
CREATE TYPE "CustomFieldTargetType" AS ENUM ('ASSET_CATEGORY', 'CUSTOM_OBJECT');

-- CreateEnum
CREATE TYPE "RelationTarget" AS ENUM ('ASSET', 'USER', 'DEPARTMENT', 'CUSTOM_OBJECT');

-- CreateTable
CREATE TABLE "custom_object_definitions" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "pluralLabel" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_object_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_definitions" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "targetType" "CustomFieldTargetType" NOT NULL,
    "categoryId" TEXT,
    "objectDefinitionId" TEXT,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "CustomFieldType" NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "relationTarget" "RelationTarget",
    "relationObjectDefinitionId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_object_records" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "objectDefinitionId" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_object_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_object_definitions_orgId_idx" ON "custom_object_definitions"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_object_definitions_orgId_key_key" ON "custom_object_definitions"("orgId", "key");

-- CreateIndex
CREATE INDEX "custom_field_definitions_orgId_categoryId_idx" ON "custom_field_definitions"("orgId", "categoryId");

-- CreateIndex
CREATE INDEX "custom_field_definitions_orgId_objectDefinitionId_idx" ON "custom_field_definitions"("orgId", "objectDefinitionId");

-- CreateIndex
CREATE INDEX "custom_object_records_orgId_objectDefinitionId_idx" ON "custom_object_records"("orgId", "objectDefinitionId");

-- AddForeignKey
ALTER TABLE "custom_object_definitions" ADD CONSTRAINT "custom_object_definitions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "asset_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_objectDefinitionId_fkey" FOREIGN KEY ("objectDefinitionId") REFERENCES "custom_object_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_object_records" ADD CONSTRAINT "custom_object_records_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_object_records" ADD CONSTRAINT "custom_object_records_objectDefinitionId_fkey" FOREIGN KEY ("objectDefinitionId") REFERENCES "custom_object_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- GIN index for querying/filtering inside custom object record JSONB (plan.md §10)
CREATE INDEX "custom_object_records_data_gin" ON "custom_object_records" USING GIN ("data");

-- GIN index for asset custom field values (Layer 1)
CREATE INDEX "assets_custom_field_values_gin" ON "assets" USING GIN ("customFieldValues");

-- Partial unique indexes: fieldKey must be unique per category / per object
-- definition. Expressed as partial indexes because a plain composite unique
-- over nullable columns treats NULLs as distinct rows.
CREATE UNIQUE INDEX "custom_field_defs_unique_per_category"
  ON "custom_field_definitions" ("orgId", "categoryId", "fieldKey")
  WHERE "categoryId" IS NOT NULL;

CREATE UNIQUE INDEX "custom_field_defs_unique_per_object"
  ON "custom_field_definitions" ("orgId", "objectDefinitionId", "fieldKey")
  WHERE "objectDefinitionId" IS NOT NULL;
