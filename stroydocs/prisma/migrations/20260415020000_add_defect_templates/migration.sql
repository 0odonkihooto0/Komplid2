-- Справочник типовых недостатков (ЦУС стр. 272)
-- Системные шаблоны (isSystem=true, organizationId=null) доступны всем организациям
-- Пользовательские (isSystem=false) привязаны к конкретной организации
CREATE TABLE IF NOT EXISTS "defect_templates" (
  "id"             TEXT NOT NULL,
  "title"          TEXT NOT NULL,
  "description"    TEXT,
  "category"       "DefectCategory" NOT NULL,
  "normativeRef"   TEXT,
  "requirements"   TEXT,
  "isSystem"       BOOLEAN NOT NULL DEFAULT false,
  "organizationId" TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "defect_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "defect_templates_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "defect_templates_organizationId_idx"
  ON "defect_templates"("organizationId");

CREATE INDEX IF NOT EXISTS "defect_templates_isSystem_idx"
  ON "defect_templates"("isSystem");
