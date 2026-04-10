-- CreateEnum
CREATE TYPE "AppointmentDocType" AS ENUM ('ORDER', 'POWER_OF_ATTORNEY', 'DECREE', 'REGULATION', 'DECISION', 'CHARTER');

-- CreateTable
CREATE TABLE "object_organizations" (
    "id" TEXT NOT NULL,
    "buildingObjectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "object_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "object_persons" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "organizationId" TEXT,
    "linkedUserId" TEXT,
    "buildingObjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "object_persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "object_participant_roles" (
    "id" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "orgParticipantId" TEXT,
    "personId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "object_participant_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_appointments" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "documentType" "AppointmentDocType" NOT NULL,
    "documentNumber" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "s3Key" TEXT,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "object_organizations_buildingObjectId_organizationId_key" ON "object_organizations"("buildingObjectId", "organizationId");

-- CreateIndex
CREATE INDEX "object_organizations_buildingObjectId_idx" ON "object_organizations"("buildingObjectId");

-- CreateIndex
CREATE INDEX "object_persons_buildingObjectId_idx" ON "object_persons"("buildingObjectId");

-- CreateIndex
CREATE INDEX "object_participant_roles_orgParticipantId_idx" ON "object_participant_roles"("orgParticipantId");

-- CreateIndex
CREATE INDEX "object_participant_roles_personId_idx" ON "object_participant_roles"("personId");

-- CreateIndex
CREATE INDEX "person_appointments_personId_idx" ON "person_appointments"("personId");

-- AddForeignKey
ALTER TABLE "object_organizations" ADD CONSTRAINT "object_organizations_buildingObjectId_fkey" FOREIGN KEY ("buildingObjectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_organizations" ADD CONSTRAINT "object_organizations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_persons" ADD CONSTRAINT "object_persons_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_persons" ADD CONSTRAINT "object_persons_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_persons" ADD CONSTRAINT "object_persons_buildingObjectId_fkey" FOREIGN KEY ("buildingObjectId") REFERENCES "building_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_participant_roles" ADD CONSTRAINT "object_participant_roles_orgParticipantId_fkey" FOREIGN KEY ("orgParticipantId") REFERENCES "object_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_participant_roles" ADD CONSTRAINT "object_participant_roles_personId_fkey" FOREIGN KEY ("personId") REFERENCES "object_persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_appointments" ADD CONSTRAINT "person_appointments_personId_fkey" FOREIGN KEY ("personId") REFERENCES "object_persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
