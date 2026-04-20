-- Migration: add missing tables and fields
-- All statements use IF NOT EXISTS / DO$$...EXCEPTION to be idempotent.

-- ═══════════════════════════════════════════════════════════════════
-- 1. Таблица contract_doc_links (ContractDocLink — не была создана)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "contract_doc_links" (
    "id"         TEXT NOT NULL,
    "linkType"   TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contract_doc_links_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "contract_doc_links"
    ADD CONSTRAINT "contract_doc_links_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "contract_doc_links"
    ADD CONSTRAINT "contract_doc_links_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "project_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE UNIQUE INDEX "contract_doc_links_contractId_documentId_linkType_key"
    ON "contract_doc_links"("contractId", "documentId", "linkType");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX "contract_doc_links_contractId_idx" ON "contract_doc_links"("contractId");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 2. Таблица id_closure_packages (IdClosurePackage — не была создана)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "id_closure_packages" (
    "id"              TEXT NOT NULL,
    "number"          TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "status"          TEXT NOT NULL DEFAULT 'DRAFT',
    "notes"           TEXT,
    "executionDocIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "registryIds"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "archiveDocIds"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "s3Key"           TEXT,
    "fileName"        TEXT,
    "exportedAt"      TIMESTAMP(3),
    "projectId"       TEXT NOT NULL,
    "createdById"     TEXT NOT NULL,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "id_closure_packages_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "id_closure_packages"
    ADD CONSTRAINT "id_closure_packages_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "id_closure_packages"
    ADD CONSTRAINT "id_closure_packages_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX "id_closure_packages_projectId_idx" ON "id_closure_packages"("projectId");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 3. Таблица journal_remark_replies (JournalRemarkReply — не была создана)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "journal_remark_replies" (
    "id"        TEXT NOT NULL,
    "title"     TEXT,
    "text"      TEXT NOT NULL,
    "remarkId"  TEXT NOT NULL,
    "authorId"  TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "journal_remark_replies_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "journal_remark_replies"
    ADD CONSTRAINT "journal_remark_replies_remarkId_fkey"
    FOREIGN KEY ("remarkId") REFERENCES "journal_entry_remarks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "journal_remark_replies"
    ADD CONSTRAINT "journal_remark_replies_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id") ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX "journal_remark_replies_remarkId_idx" ON "journal_remark_replies"("remarkId");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 4. Новые поля в таблице journal_entry_remarks
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE "journal_entry_remarks" ADD COLUMN IF NOT EXISTS "title"               TEXT;
ALTER TABLE "journal_entry_remarks" ADD COLUMN IF NOT EXISTS "remediationDeadline" TIMESTAMP(3);
ALTER TABLE "journal_entry_remarks" ADD COLUMN IF NOT EXISTS "issuedAt"            TIMESTAMP(3);
ALTER TABLE "journal_entry_remarks" ADD COLUMN IF NOT EXISTS "objectDescription"   TEXT;
ALTER TABLE "journal_entry_remarks" ADD COLUMN IF NOT EXISTS "attachmentS3Keys"    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "journal_entry_remarks" ADD COLUMN IF NOT EXISTS "journalId"           TEXT;
ALTER TABLE "journal_entry_remarks" ADD COLUMN IF NOT EXISTS "issuedById"          TEXT;

-- entryId стал nullable в схеме (было NOT NULL в CREATE TABLE)
ALTER TABLE "journal_entry_remarks" ALTER COLUMN "entryId" DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE "journal_entry_remarks"
    ADD CONSTRAINT "journal_entry_remarks_journalId_fkey"
    FOREIGN KEY ("journalId") REFERENCES "special_journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "journal_entry_remarks"
    ADD CONSTRAINT "journal_entry_remarks_issuedById_fkey"
    FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 5. Новые поля в таблице estimate_items
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE "estimate_items" ADD COLUMN IF NOT EXISTS "isCustomerResource" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "estimate_items" ADD COLUMN IF NOT EXISTS "isExcluded"         BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "estimate_items" ADD COLUMN IF NOT EXISTS "ssrWorkType"        TEXT;
