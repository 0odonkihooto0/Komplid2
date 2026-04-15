-- Добавление поля замещающего инспектора СК к дефекту (ЦУС стр. 269)
ALTER TABLE "defects" ADD COLUMN IF NOT EXISTS "substituteInspectorId" TEXT;

ALTER TABLE "defects"
  ADD CONSTRAINT "defects_substituteInspectorId_fkey"
  FOREIGN KEY ("substituteInspectorId")
  REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
