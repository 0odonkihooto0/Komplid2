-- Расширение схемы для модуля ПИР: шаблоны согласования, журнал изменений, PDF-штампы

-- 1. Расширить таблицу design_documents
ALTER TABLE "design_documents" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "design_documents" ADD COLUMN "sentForExpertise" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "design_documents" ADD COLUMN "reviewerOrgId" TEXT;
ALTER TABLE "design_documents" ADD COLUMN "reviewerUserId" TEXT;
ALTER TABLE "design_documents" ADD COLUMN "reviewerComment" TEXT;

-- Внешние ключи для проверяющей организации и пользователя
ALTER TABLE "design_documents" ADD CONSTRAINT "design_documents_reviewerOrgId_fkey"
  FOREIGN KEY ("reviewerOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "design_documents" ADD CONSTRAINT "design_documents_reviewerUserId_fkey"
  FOREIGN KEY ("reviewerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. Расширить таблицу design_doc_comments
ALTER TABLE "design_doc_comments" ADD COLUMN "plannedResolutionDate" TIMESTAMP(3);
ALTER TABLE "design_doc_comments" ADD COLUMN "suggestion" TEXT;
ALTER TABLE "design_doc_comments" ADD COLUMN "watchers" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL;

-- 3. Создать таблицу approval_templates (шаблоны согласования)
CREATE TABLE "approval_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entityType" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_templates_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "approval_templates" ADD CONSTRAINT "approval_templates_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "approval_templates_organizationId_entityType_idx" ON "approval_templates"("organizationId", "entityType");

-- 4. Создать таблицу approval_template_levels (уровни шаблона согласования)
CREATE TABLE "approval_template_levels" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "requiresPreviousApproval" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_template_levels_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "approval_template_levels" ADD CONSTRAINT "approval_template_levels_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "approval_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "approval_template_levels" ADD CONSTRAINT "approval_template_levels_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "approval_template_levels_templateId_idx" ON "approval_template_levels"("templateId");

-- 5. Создать таблицу design_doc_changes (журнал изменений документа ПИР)
CREATE TABLE "design_doc_changes" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "changeDescription" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "design_doc_changes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "design_doc_changes" ADD CONSTRAINT "design_doc_changes_docId_fkey"
  FOREIGN KEY ("docId") REFERENCES "design_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "design_doc_changes" ADD CONSTRAINT "design_doc_changes_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "design_doc_changes_docId_idx" ON "design_doc_changes"("docId");

-- 6. Создать таблицу pdf_stamps (штампы на PDF)
CREATE TABLE "pdf_stamps" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "stampText" TEXT NOT NULL,
    "titleId" TEXT,
    "positionX" DOUBLE PRECISION NOT NULL,
    "positionY" DOUBLE PRECISION NOT NULL,
    "page" INTEGER NOT NULL,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdf_stamps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pdf_stamps_entityType_entityId_idx" ON "pdf_stamps"("entityType", "entityId");

-- 7. Создать таблицу stamp_titles (справочник заголовков штампов)
CREATE TABLE "stamp_titles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "template" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stamp_titles_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "stamp_titles" ADD CONSTRAINT "stamp_titles_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "stamp_titles_organizationId_idx" ON "stamp_titles"("organizationId");
