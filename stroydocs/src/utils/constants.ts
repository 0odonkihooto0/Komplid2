import type {
  UserRole,
  ProjectStatus,
  ContractStatus,
  MaterialDocumentType,
  MeasurementUnit,
  WorkRecordStatus,
  ExecutionDocType,
  ExecutionDocStatus,
  DocCommentStatus,
  ArchiveCategory,
  EstimateImportStatus,
  EstimateItemStatus,
  EstimateFormat,
  InputControlResult,
  InputControlActStatus,
  PhotoCategory,
  IdCategory,
} from '@prisma/client';

/** Русские названия ролей пользователей */
export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Администратор',
  MANAGER: 'Менеджер',
  WORKER: 'Работник',
  CONTROLLER: 'Контролёр',
  CUSTOMER: 'Заказчик',
};

/** Русские названия статусов проектов */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: 'Активный',
  COMPLETED: 'Завершён',
  ARCHIVED: 'Архив',
};

/** Русские названия статусов договоров */
export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT: 'Черновик',
  ACTIVE: 'Действующий',
  COMPLETED: 'Исполнен',
  TERMINATED: 'Расторгнут',
};

/** Русские названия типов документов материалов */
export const MATERIAL_DOC_TYPE_LABELS: Record<MaterialDocumentType, string> = {
  PASSPORT: 'Паспорт качества',
  CERTIFICATE: 'Сертификат соответствия',
  PROTOCOL: 'Протокол испытаний',
};

/** Русские названия единиц измерения */
export const MEASUREMENT_UNIT_LABELS: Record<MeasurementUnit, string> = {
  PIECE: 'шт',
  KG: 'кг',
  TON: 'т',
  M: 'м',
  M2: 'м²',
  M3: 'м³',
  L: 'л',
  SET: 'компл',
};

/** Русские названия статусов записей о работах */
export const WORK_RECORD_STATUS_LABELS: Record<WorkRecordStatus, string> = {
  DRAFT: 'Черновик',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнено',
  ACCEPTED: 'Принято',
  REJECTED: 'Отклонено',
};

/** Русские названия типов исполнительных документов */
export const EXECUTION_DOC_TYPE_LABELS: Record<ExecutionDocType, string> = {
  AOSR: 'АОСР',
  OZR: 'ОЖР',
  TECHNICAL_READINESS_ACT: 'Акт технической готовности',
};

/** Русские названия статусов исполнительных документов */
export const EXECUTION_DOC_STATUS_LABELS: Record<ExecutionDocStatus, string> = {
  DRAFT: 'Черновик',
  IN_REVIEW: 'На проверке',
  SIGNED: 'Подписано',
  REJECTED: 'Отклонено',
};

/** Русские названия категорий ИД по ГОСТ Р 70108-2025 */
export const ID_CATEGORY_LABELS: Record<IdCategory, string> = {
  ACCOUNTING_JOURNAL: 'Журналы учёта',
  INSPECTION_ACT: 'Акты освидетельствования',
  OTHER_ID: 'Иная ИД',
};

/** Цвета категорий ИД */
export const ID_CATEGORY_COLORS: Record<IdCategory, string> = {
  ACCOUNTING_JOURNAL: 'bg-blue-100 text-blue-800',
  INSPECTION_ACT: 'bg-purple-100 text-purple-800',
  OTHER_ID: 'bg-gray-100 text-gray-800',
};

/** Русские названия статусов замечаний */
export const DOC_COMMENT_STATUS_LABELS: Record<DocCommentStatus, string> = {
  OPEN: 'Открыто',
  RESOLVED: 'Устранено',
};

/** Русские названия категорий архива */
export const ARCHIVE_CATEGORY_LABELS: Record<ArchiveCategory, string> = {
  PERMITS: 'Разрешительная документация',
  WORKING_PROJECT: 'Рабочий проект',
  EXECUTION_DRAWINGS: 'Исполнительные схемы',
  CERTIFICATES: 'Сертификаты и протоколы',
  STANDARDS: 'Нормативка',
  LABORATORY: 'Лаборатории',
};

/** Русские названия статусов импорта сметы */
export const ESTIMATE_IMPORT_STATUS_LABELS: Record<EstimateImportStatus, string> = {
  UPLOADING: 'Загрузка',
  PARSING: 'Парсинг',
  AI_PROCESSING: 'Обработка ИИ',
  PREVIEW: 'Предпросмотр',
  CONFIRMED: 'Подтверждён',
  FAILED: 'Ошибка',
};

/** Русские названия статусов позиций импорта */
export const ESTIMATE_ITEM_STATUS_LABELS: Record<EstimateItemStatus, string> = {
  RECOGNIZED: 'Распознано',
  MAPPED: 'Привязано',
  UNMATCHED: 'Не привязано',
  SKIPPED: 'Пропущено',
  CONFIRMED: 'Подтверждено',
};

/** Русские названия форматов смет */
export const ESTIMATE_FORMAT_LABELS: Record<EstimateFormat, string> = {
  XML_GRAND_SMETA: 'XML Гранд-Смета',
  XML_RIK: 'XML РИК',
  EXCEL: 'Excel (.xlsx)',
  PDF: 'PDF',
};

/** Русские названия результатов входного контроля */
export const INPUT_CONTROL_RESULT_LABELS: Record<InputControlResult, string> = {
  CONFORMING: 'Соответствует',
  NON_CONFORMING: 'Не соответствует',
  CONDITIONAL: 'Условно допущен',
};

/** Русские названия статусов актов входного контроля */
export const INPUT_CONTROL_ACT_STATUS_LABELS: Record<InputControlActStatus, string> = {
  DRAFT: 'Черновик',
  APPROVED: 'Утверждён',
  REJECTED: 'Отклонён',
};

/** Русские названия категорий фото */
export const PHOTO_CATEGORY_LABELS: Record<PhotoCategory, string> = {
  CONFIRMING: 'Подтверждающие',
  VIOLATION: 'Фиксирующие нарушение',
};

/** Цвета статусов по спецификации */
export const STATUS_COLORS = {
  success: 'bg-green-100 text-green-800',  // подписано / утверждено
  danger: 'bg-red-100 text-red-800',       // отклонено
  warning: 'bg-yellow-100 text-yellow-800', // на проверке
  neutral: 'bg-gray-100 text-gray-800',    // черновик / в работе
} as const;
