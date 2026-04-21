-- Модуль 15 Фаза 4: Публичный шаринг смет (Сметчик-Студио)

-- AddColumn: поля публичного шаринга в EstimateVersion
ALTER TABLE "estimate_versions"
  ADD COLUMN IF NOT EXISTS "publicShareToken"           TEXT,
  ADD COLUMN IF NOT EXISTS "publicShareMode"            TEXT,
  ADD COLUMN IF NOT EXISTS "publicCompareWithVersionId" TEXT,
  ADD COLUMN IF NOT EXISTS "publicShareExpiresAt"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "publicShareViewCount"       INTEGER NOT NULL DEFAULT 0;

-- CreateIndex: уникальность токена
CREATE UNIQUE INDEX IF NOT EXISTS "estimate_versions_publicShareToken_key"
  ON "estimate_versions"("publicShareToken");

-- CreateIndex: быстрый поиск по токену
CREATE INDEX IF NOT EXISTS "estimate_versions_publicShareToken_idx"
  ON "estimate_versions"("publicShareToken");
