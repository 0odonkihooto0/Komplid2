-- AlterTable
ALTER TABLE "technical_conditions"
  ADD COLUMN "landPlotId" TEXT,
  ADD COLUMN "documentS3Key" TEXT,
  ADD COLUMN "documentFileName" TEXT;

-- AddForeignKey
ALTER TABLE "technical_conditions"
  ADD CONSTRAINT "technical_conditions_landPlotId_fkey"
  FOREIGN KEY ("landPlotId") REFERENCES "land_plots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
