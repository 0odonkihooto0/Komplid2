-- AlterTable
ALTER TABLE "video_cameras" ADD COLUMN "s3Keys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "video_cameras" ADD COLUMN "fileNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
