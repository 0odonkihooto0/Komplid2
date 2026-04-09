-- CreateTable
CREATE TABLE "defect_annotations" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "data" JSONB NOT NULL,
    "defectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "defect_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "defect_annotations_defectId_idx" ON "defect_annotations"("defectId");

-- AddForeignKey
ALTER TABLE "defect_annotations" ADD CONSTRAINT "defect_annotations_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "defects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
