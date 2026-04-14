-- Миграция: add_execution_doc_links (2026-04-14)
-- Связи между исполнительными документами ИД (вкладка «Связанные документы»)

CREATE TABLE "execution_doc_links" (
  "id"          TEXT NOT NULL,
  "sourceDocId" TEXT NOT NULL,
  "targetDocId" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "execution_doc_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "execution_doc_links_sourceDocId_targetDocId_key" UNIQUE ("sourceDocId", "targetDocId"),
  CONSTRAINT "execution_doc_links_sourceDocId_fkey"
    FOREIGN KEY ("sourceDocId") REFERENCES "execution_docs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "execution_doc_links_targetDocId_fkey"
    FOREIGN KEY ("targetDocId") REFERENCES "execution_docs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "execution_doc_links_sourceDocId_idx" ON "execution_doc_links"("sourceDocId");
CREATE INDEX "execution_doc_links_targetDocId_idx" ON "execution_doc_links"("targetDocId");
