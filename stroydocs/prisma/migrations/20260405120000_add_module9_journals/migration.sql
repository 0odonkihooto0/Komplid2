-- CreateEnum
CREATE TYPE "SpecialJournalType" AS ENUM ('CONCRETE_WORKS', 'WELDING_WORKS', 'AUTHOR_SUPERVISION', 'MOUNTING_WORKS', 'ANTICORROSION', 'GEODETIC', 'EARTHWORKS', 'PILE_DRIVING', 'CABLE_LAYING', 'FIRE_SAFETY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "JournalStatus" AS ENUM ('ACTIVE', 'STORAGE', 'CLOSED');

-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "approval_routes" ADD COLUMN "specialJournalId" TEXT;

-- CreateTable
CREATE TABLE "special_journals" (
    "id" TEXT NOT NULL,
    "type" "SpecialJournalType" NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "JournalStatus" NOT NULL DEFAULT 'ACTIVE',
    "normativeRef" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,
    "contractId" TEXT,
    "responsibleId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "special_journals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "special_journal_entries" (
    "id" TEXT NOT NULL,
    "entryNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT NOT NULL,
    "location" TEXT,
    "normativeRef" TEXT,
    "weather" TEXT,
    "temperature" INTEGER,
    "data" JSONB,
    "inspectionDate" TIMESTAMP(3),
    "inspectionNotificationSent" BOOLEAN NOT NULL DEFAULT false,
    "executionDocId" TEXT,
    "journalId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "special_journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry_remarks" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "deadline" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "entryId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entry_remarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "approval_routes_specialJournalId_key" ON "approval_routes"("specialJournalId");

-- CreateIndex
CREATE INDEX "special_journals_projectId_idx" ON "special_journals"("projectId");

-- CreateIndex
CREATE INDEX "special_journals_projectId_type_idx" ON "special_journals"("projectId", "type");

-- CreateIndex
CREATE INDEX "special_journals_contractId_idx" ON "special_journals"("contractId");

-- CreateIndex
CREATE INDEX "special_journals_status_idx" ON "special_journals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "special_journal_entries_journalId_entryNumber_key" ON "special_journal_entries"("journalId", "entryNumber");

-- CreateIndex
CREATE INDEX "special_journal_entries_journalId_date_idx" ON "special_journal_entries"("journalId", "date");

-- CreateIndex
CREATE INDEX "special_journal_entries_journalId_status_idx" ON "special_journal_entries"("journalId", "status");

-- CreateIndex
CREATE INDEX "special_journal_entries_inspectionDate_idx" ON "special_journal_entries"("inspectionDate");

-- CreateIndex
CREATE INDEX "journal_entry_remarks_entryId_idx" ON "journal_entry_remarks"("entryId");

-- CreateIndex
CREATE INDEX "journal_entry_remarks_status_idx" ON "journal_entry_remarks"("status");

-- AddForeignKey
ALTER TABLE "approval_routes" ADD CONSTRAINT "approval_routes_specialJournalId_fkey" FOREIGN KEY ("specialJournalId") REFERENCES "special_journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_journals" ADD CONSTRAINT "special_journals_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_journals" ADD CONSTRAINT "special_journals_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_journals" ADD CONSTRAINT "special_journals_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_journals" ADD CONSTRAINT "special_journals_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_journal_entries" ADD CONSTRAINT "special_journal_entries_executionDocId_fkey" FOREIGN KEY ("executionDocId") REFERENCES "execution_docs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_journal_entries" ADD CONSTRAINT "special_journal_entries_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "special_journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_journal_entries" ADD CONSTRAINT "special_journal_entries_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_remarks" ADD CONSTRAINT "journal_entry_remarks_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "special_journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_remarks" ADD CONSTRAINT "journal_entry_remarks_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_remarks" ADD CONSTRAINT "journal_entry_remarks_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
