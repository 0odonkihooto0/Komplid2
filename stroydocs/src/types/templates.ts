/** Данные участника строительства для шаблонов PDF */
export interface TemplateParticipant {
  role: string;
  organizationName: string;
  representativeName: string;
  position: string;
  appointmentOrder?: string;
}

/** Данные материала для шаблона АОСР */
export interface TemplateMaterial {
  name: string;
  documentType: string;
  documentNumber: string;
}

/** Данные для шаблона АОСР */
export interface AosrTemplateData {
  number: string;
  date: string;
  projectName: string;
  projectAddress: string;
  contractNumber: string;
  participants: TemplateParticipant[];
  workName: string;
  ksiCode: string;
  location: string;
  description: string;
  normative: string;
  materials: TemplateMaterial[];
  workDate: string;
}

/** Строка записи для шаблона ОЖР */
export interface OzrRecordRow {
  date: string;
  workName: string;
  location: string;
  normative: string;
  status: string;
}

/** Данные для шаблона ОЖР */
export interface OzrTemplateData {
  number: string;
  date: string;
  projectName: string;
  projectAddress: string;
  contractNumber: string;
  participants: TemplateParticipant[];
  records: OzrRecordRow[];
}

/** Строка работы для акта технической готовности */
export interface TechReadinessWorkRow {
  name: string;
  cipher: string;
  status: string;
}

/** Данные для шаблона акта технической готовности */
export interface TechReadinessTemplateData {
  number: string;
  date: string;
  projectName: string;
  projectAddress: string;
  contractNumber: string;
  participants: TemplateParticipant[];
  works: TechReadinessWorkRow[];
}

// ============================================================
// Типы для генерации .docx через docxtemplater (Фаза 3.6)
// Все поля — строки, т.к. docxtemplater подставляет их напрямую в Word
// ============================================================

/** Данные для aosr.docx — все плейсхолдеры шаблона АОСР */
export interface AosrDocxData {
  /** Объект капитального строительства (название + адрес) */
  object: string;
  /** Номер акта */
  '№': string;
  /** Дата составления акта (полная строка, например "01 марта 2025") */
  date: string;
  /** День даты составления */
  D: string;
  /** Месяц даты составления */
  M: string;
  /** Год даты составления */
  Y: string;
  /** Реквизиты организации застройщика (шапка акта) */
  zakazchik: string;
  /** Представитель застройщика — только ФИО (для подписи) */
  zakazchik2: string;
  /** Реквизиты организации подрядчика (шапка акта) */
  stroiteli: string;
  /** Реквизиты организации проектировщика/авторнадзора (шапка акта) */
  projectirovshik: string;
  /** Представитель подрядчика (строительство) — должность, ФИО, приказ */
  stroiteli11: string;
  /** Представитель подрядчика (стройконтроль/SUPERVISION) — должность, ФИО, приказ */
  stroiteli12: string;
  /** Представитель исполнителя работ — должность, ФИО, приказ */
  stroiteli3: string;
  /** Представитель подрядчика (строительство) — только ФИО */
  stroiteli21: string;
  /** Представитель подрядчика (стройконтроль) — только ФИО */
  stroiteli22: string;
  /** Представитель исполнителя — только ФИО */
  stroiteli32: string;
  /** Представитель проектировщика — должность, ФИО, приказ */
  projectirovshik1: string;
  /** Представитель проектировщика — только ФИО */
  projectirovshik2: string;
  /** Наименование работ, предъявляемых к освидетельствованию */
  rabota: string;
  /** Ссылка на проектную документацию (шифр + раздел) */
  project: string;
  /** Применяемые материалы с реквизитами сертификатов */
  material: string;
  /** Исполнительная схема (номер/наименование) */
  shema: string;
  /** Испытания и протоколы лабораторного контроля */
  ispitaniya: string;
  /** День начала работ */
  D1: string;
  /** Месяц начала работ */
  M1: string;
  /** Год начала работ */
  Y1: string;
  /** День окончания работ */
  D2: string;
  /** Месяц окончания работ */
  M2: string;
  /** Год окончания работ */
  Y2: string;
  /** Нормативные документы (СНиП, СП, ГОСТ) */
  SNIP: string;
  /** Разрешается производство последующих работ */
  Next: string;
  /** Количество экземпляров акта */
  N: string;
  /** Приложения к акту */
  DOP: string;
}

/** Объединённый тип данных для docx-генератора */
export type DocxTemplateData = AosrDocxData | Record<string, string>;

/** Имена поддерживаемых docx-шаблонов */
export type DocxTemplateName = 'aosr' | 'ozr' | 'ks2' | 'ks3' | 'avk' | 'zhvk';
