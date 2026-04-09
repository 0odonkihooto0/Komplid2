import type { ExecutionDocStatus } from '@prisma/client';

export interface AosrRegistryRow {
  id: string;
  number: string;
  status: ExecutionDocStatus;
  // Автозаполненные из БД
  workName: string;
  materials: string;
  certificates: string;
  // Ручные переопределения или пустые строки
  schemaRef: string;
  nextWorks: string;
  // DB-значения для отображения иконки override
  dbMaterials: string;
  dbCertificates: string;
  // Все текущие overrideFields
  overrides: Record<string, string>;
}

export interface AosrRegistryContext {
  object: string;
  contractNumber: string;
  developerOrg: string;
  contractorOrg: string;
  supervisionOrg: string;
  subcontractorOrg: string;
  developerRep: string;
  contractorRep: string;
  supervisionRep: string;
  subcontractorRep: string;
  developerRepName: string;
  contractorRepName: string;
  supervisionRepName: string;
  subcontractorRepName: string;
  // Флаги незаполненных данных
  missingReps: string[]; // роли с незаполненными ФИО/должностью
}

export interface AosrRegistryResponse {
  rows: AosrRegistryRow[];
  schemas: string[]; // Список исполнительных схем по договору
  projectContext: AosrRegistryContext;
}
