-- AlterTable: добавить поля ФИО представителя и должности в ContractParticipant
ALTER TABLE "contract_participants" ADD COLUMN "representativeName" TEXT;
ALTER TABLE "contract_participants" ADD COLUMN "position" TEXT;

-- AlterTable: добавить поле даты начала работ в WorkRecord
ALTER TABLE "work_records" ADD COLUMN "startDate" TIMESTAMP(3);
