export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  WORKER = 'WORKER',
  CONTROLLER = 'CONTROLLER',
  CUSTOMER = 'CUSTOMER',
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
}

export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum ContractType {
  MAIN = 'MAIN',
  SUBCONTRACT = 'SUBCONTRACT',
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  TERMINATED = 'TERMINATED',
}

export enum ParticipantRole {
  DEVELOPER = 'DEVELOPER',
  CONTRACTOR = 'CONTRACTOR',
  SUPERVISION = 'SUPERVISION',
  SUBCONTRACTOR = 'SUBCONTRACTOR',
}

// === Фаза 2 — Производство работ ===

export enum MaterialDocumentType {
  PASSPORT = 'PASSPORT',
  CERTIFICATE = 'CERTIFICATE',
  PROTOCOL = 'PROTOCOL',
}

export enum MeasurementUnit {
  PIECE = 'PIECE',
  KG = 'KG',
  TON = 'TON',
  M = 'M',
  M2 = 'M2',
  M3 = 'M3',
  L = 'L',
  SET = 'SET',
}

export enum WorkRecordStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export enum PhotoEntityType {
  WORK_RECORD = 'WORK_RECORD',
  MATERIAL = 'MATERIAL',
  REMARK = 'REMARK',
  WORK_ITEM = 'WORK_ITEM',
  CONTRACT = 'CONTRACT',
}

// === Фаза 3.5 — Парсинг смет ===

export enum EstimateFormat {
  XML_GRAND_SMETA = 'XML_GRAND_SMETA',
  XML_RIK = 'XML_RIK',
  EXCEL = 'EXCEL',
  PDF = 'PDF',
}

export enum EstimateImportStatus {
  UPLOADING = 'UPLOADING',
  PARSING = 'PARSING',
  AI_PROCESSING = 'AI_PROCESSING',
  PREVIEW = 'PREVIEW',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

export enum EstimateItemStatus {
  RECOGNIZED = 'RECOGNIZED',
  MAPPED = 'MAPPED',
  UNMATCHED = 'UNMATCHED',
  SKIPPED = 'SKIPPED',
  CONFIRMED = 'CONFIRMED',
}

// === Фаза 3 — Исполнительная документация ===

export enum ExecutionDocType {
  AOSR = 'AOSR',
  OZR = 'OZR',
  TECHNICAL_READINESS_ACT = 'TECHNICAL_READINESS_ACT',
}

export enum ExecutionDocStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  SIGNED = 'SIGNED',
  REJECTED = 'REJECTED',
}

export enum SignatureType {
  DETACHED = 'DETACHED',
  EMBEDDED = 'EMBEDDED',
}

export enum DocCommentStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
}

export enum ArchiveCategory {
  PERMITS = 'PERMITS',
  WORKING_PROJECT = 'WORKING_PROJECT',
  EXECUTION_DRAWINGS = 'EXECUTION_DRAWINGS',
  CERTIFICATES = 'CERTIFICATES',
  STANDARDS = 'STANDARDS',
}
