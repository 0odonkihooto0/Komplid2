-- CreateTable
CREATE TABLE "pir_object_type_configs" (
    "id" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pir_object_type_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pir_category_configs" (
    "id" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "parentCode" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "configId" TEXT NOT NULL,

    CONSTRAINT "pir_category_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pir_object_type_configs_projectId_key" ON "pir_object_type_configs"("projectId");

-- CreateIndex
CREATE INDEX "pir_object_type_configs_projectId_idx" ON "pir_object_type_configs"("projectId");

-- CreateIndex
CREATE INDEX "pir_category_configs_configId_idx" ON "pir_category_configs"("configId");

-- AddForeignKey
ALTER TABLE "pir_object_type_configs" ADD CONSTRAINT "pir_object_type_configs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pir_category_configs" ADD CONSTRAINT "pir_category_configs_configId_fkey" FOREIGN KEY ("configId") REFERENCES "pir_object_type_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
