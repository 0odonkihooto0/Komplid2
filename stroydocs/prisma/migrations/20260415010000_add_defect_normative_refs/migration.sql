-- Таблица нормативных ссылок дефекта (ЦУС стр. 273) — дополнение к нарушенным стандартам
CREATE TABLE IF NOT EXISTS "defect_normative_refs" (
  "id"          TEXT NOT NULL,
  "defectId"    TEXT NOT NULL,
  "reference"   TEXT NOT NULL,
  "description" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "defect_normative_refs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "defect_normative_refs_defectId_fkey"
    FOREIGN KEY ("defectId") REFERENCES "defects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "defect_normative_refs_defectId_idx"
  ON "defect_normative_refs"("defectId");
