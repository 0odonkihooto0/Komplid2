-- AlterTable: добавить GPS поля в signatures
ALTER TABLE "signatures" ADD COLUMN IF NOT EXISTS "gpsLat" DOUBLE PRECISION;
ALTER TABLE "signatures" ADD COLUMN IF NOT EXISTS "gpsLng" DOUBLE PRECISION;
ALTER TABLE "signatures" ADD COLUMN IF NOT EXISTS "gpsAccuracy" DOUBLE PRECISION;
ALTER TABLE "signatures" ADD COLUMN IF NOT EXISTS "signedAtLocation" JSONB;

-- AlterEnum: добавить SIMPLE в SignatureType
ALTER TYPE "SignatureType" ADD VALUE IF NOT EXISTS 'SIMPLE';
