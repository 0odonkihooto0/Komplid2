-- Миграция: extend_doc_comments (2026-04-14)
-- Расширение системы замечаний к ИД:
-- 1. Новые поля в DocComment (commentNumber, urgency, remarkType, responsibleId,
--    watcherIds, plannedResolveDate, actualResolveDate, suggestion, attachmentS3Keys)
-- 2. Новая таблица doc_comment_replies (ответы на замечания)
-- 3. Новый статус PENDING_REMARKS в ApprovalRouteStatus

-- 1. Расширяем таблицу doc_comments новыми полями
ALTER TABLE "doc_comments"
  ADD COLUMN "commentNumber"      INTEGER,
  ADD COLUMN "urgency"            TEXT,
  ADD COLUMN "remarkType"         TEXT,
  ADD COLUMN "responsibleId"      TEXT,
  ADD COLUMN "watcherIds"         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "plannedResolveDate" TIMESTAMP(3),
  ADD COLUMN "actualResolveDate"  TIMESTAMP(3),
  ADD COLUMN "suggestion"         TEXT,
  ADD COLUMN "attachmentS3Keys"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- 2. Внешний ключ на User (ответственный за устранение)
ALTER TABLE "doc_comments"
  ADD CONSTRAINT "doc_comments_responsibleId_fkey"
    FOREIGN KEY ("responsibleId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Индекс на responsibleId
CREATE INDEX "doc_comments_responsibleId_idx" ON "doc_comments"("responsibleId");

-- 4. Создаём таблицу ответов на замечания
CREATE TABLE "doc_comment_replies" (
  "id"               TEXT         NOT NULL,
  "text"             TEXT         NOT NULL,
  "attachmentS3Keys" TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  "commentId"        TEXT         NOT NULL,
  "authorId"         TEXT         NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "doc_comment_replies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "doc_comment_replies_commentId_fkey"
    FOREIGN KEY ("commentId") REFERENCES "doc_comments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "doc_comment_replies_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "doc_comment_replies_commentId_idx" ON "doc_comment_replies"("commentId");
CREATE INDEX "doc_comment_replies_authorId_idx"  ON "doc_comment_replies"("authorId");

-- 5. Добавляем значение PENDING_REMARKS в enum ApprovalRouteStatus
-- PostgreSQL позволяет добавлять значения в enum через ALTER TYPE
ALTER TYPE "ApprovalRouteStatus" ADD VALUE IF NOT EXISTS 'PENDING_REMARKS';
