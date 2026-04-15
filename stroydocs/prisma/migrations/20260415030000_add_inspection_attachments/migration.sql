-- Добавление массива прикреплённых файлов к проверке
ALTER TABLE "inspections" ADD COLUMN IF NOT EXISTS "attachmentS3Keys" TEXT[] DEFAULT '{}';
