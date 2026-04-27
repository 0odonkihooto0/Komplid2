-- Фаза D2: Журнал аудита — фиксирует все значимые события в системе

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id"           TEXT NOT NULL,
  "workspaceId"  TEXT,
  "actorUserId"  TEXT,
  "action"       TEXT NOT NULL,
  "resourceType" TEXT,
  "resourceId"   TEXT,
  "before"       JSONB,
  "after"        JSONB,
  "ipAddress"    TEXT,
  "userAgent"    TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- FK на workspace (необязательный, SetNull при удалении)
DO $$ BEGIN
  ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- FK на actor (необязательный, SetNull при удалении)
DO $$ BEGIN
  ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Индекс для выборки по workspace + дата (основной сценарий UI)
CREATE INDEX IF NOT EXISTS "audit_logs_workspaceId_createdAt_idx"
  ON "audit_logs"("workspaceId", "createdAt");

-- Индекс для выборки по актору + дата
CREATE INDEX IF NOT EXISTS "audit_logs_actorUserId_createdAt_idx"
  ON "audit_logs"("actorUserId", "createdAt");

-- Индекс для фильтрации по типу события
CREATE INDEX IF NOT EXISTS "audit_logs_action_createdAt_idx"
  ON "audit_logs"("action", "createdAt");
