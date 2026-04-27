-- Фаза D1: Runtime feature-flags для A/B-тестов, rollout и kill-switch
-- Отдельная система от PaywallGate (подписочные gates — в SubscriptionFeature)

CREATE TABLE IF NOT EXISTS "feature_flags" (
  "id"             TEXT NOT NULL,
  "key"            TEXT NOT NULL,
  "description"    TEXT,
  "enabled"        BOOLEAN NOT NULL DEFAULT false,
  "rolloutPercent" INTEGER NOT NULL DEFAULT 0,
  "audiences"      JSONB,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- Уникальный индекс на ключ флага
DO $$ BEGIN
  CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Индекс для быстрого поиска по ключу
CREATE INDEX IF NOT EXISTS "feature_flags_key_idx" ON "feature_flags"("key");

-- Индекс для фильтрации включённых флагов
CREATE INDEX IF NOT EXISTS "feature_flags_enabled_idx" ON "feature_flags"("enabled");
