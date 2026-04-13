-- AlterTable material_requests: add attachmentS3Keys
ALTER TABLE "material_requests" ADD COLUMN "attachmentS3Keys" TEXT[] DEFAULT ARRAY[]::TEXT[];
