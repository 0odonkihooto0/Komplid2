import type { JournalEntryStatus, JournalLinkType, JournalStatus, SpecialJournalType } from '@prisma/client';

// === Лейблы типов журналов ===

export const JOURNAL_TYPE_LABELS: Record<SpecialJournalType, string> = {
  CONCRETE_WORKS: 'Бетонные работы',
  WELDING_WORKS: 'Сварочные работы',
  AUTHOR_SUPERVISION: 'Авторский надзор',
  MOUNTING_WORKS: 'Монтаж конструкций',
  ANTICORROSION: 'Антикоррозия',
  GEODETIC: 'Геодезия',
  EARTHWORKS: 'Земляные работы',
  PILE_DRIVING: 'Погружение свай',
  CABLE_LAYING: 'Прокладка кабелей',
  FIRE_SAFETY: 'Пожарная безопасность',
  // Расширение ЦУС (2026-04-14)
  OZR_1026PR: 'Общий журнал работ (1026/пр)',
  OZR_RD_11_05: 'Общий журнал работ (РД 11-05)',
  INPUT_CONTROL: 'Журнал входного контроля',
  CONSTRUCTION_CONTROL: 'Журнал строительного контроля',
  CONSTRUCTION_CONTROL_V2: 'Журнал строительного контроля v.2',
  SK_CALL_REGISTER: 'Журнал вызовов представителей СК',
  AUTHOR_SUPERVISION_2016: 'Журнал авторского надзора (2016)',
  DRILLING_WORKS: 'Журнал буровых работ',
  CONCRETE_CURING: 'Журнал ухода за бетоном',
  JOINT_GROUTING: 'Журнал замоноличивания стыков',
  ANTICORROSION_WELD: 'Журнал антикоррозионной защиты сварных соединений',
  BOLT_CONNECTIONS: 'Журнал монтажных соединений на болтах',
  TORQUE_WRENCH_CALIBRATION: 'Журнал тарировки динамометрических ключей',
  CABLE_TUBE: 'Кабельнотрубный журнал',
  CABLE_ROUTE: 'Кабельный журнал (по трассам)',
  PIPELINE_WELDING: 'Журнал сварки трубопроводов',
  INSULATION_LAYING: 'Журнал изоляционно-укладочных работ',
  TECHNICAL_LEVELING: 'Журнал технического нивелирования',
  FIRE_SAFETY_INTRO: 'Журнал вводного инструктажа по ПБ',
  GENERAL_INTRO_BRIEFING: 'Журнал вводного инструктажа',
  CUSTOM: 'Произвольный',
};

// === Лейблы статусов ===

export const JOURNAL_STATUS_LABELS: Record<JournalStatus, string> = {
  ACTIVE: 'Активен',
  STORAGE: 'На хранении',
  CLOSED: 'Закрыт',
};

// === CSS-классы статусов ===

export const JOURNAL_STATUS_CLASS: Record<JournalStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  STORAGE: 'bg-gray-100 text-gray-600',
  CLOSED: 'bg-red-100 text-red-700',
};

// === CSS-классы типов журналов ===

export const JOURNAL_TYPE_CLASS: Record<SpecialJournalType, string> = {
  CONCRETE_WORKS: 'bg-blue-100 text-blue-800',
  WELDING_WORKS: 'bg-orange-100 text-orange-800',
  AUTHOR_SUPERVISION: 'bg-purple-100 text-purple-800',
  MOUNTING_WORKS: 'bg-indigo-100 text-indigo-800',
  ANTICORROSION: 'bg-teal-100 text-teal-800',
  GEODETIC: 'bg-cyan-100 text-cyan-800',
  EARTHWORKS: 'bg-amber-100 text-amber-800',
  PILE_DRIVING: 'bg-rose-100 text-rose-800',
  CABLE_LAYING: 'bg-yellow-100 text-yellow-800',
  FIRE_SAFETY: 'bg-red-100 text-red-800',
  // Расширение ЦУС (2026-04-14)
  OZR_1026PR: 'bg-blue-100 text-blue-900',
  OZR_RD_11_05: 'bg-blue-100 text-blue-700',
  INPUT_CONTROL: 'bg-green-100 text-green-800',
  CONSTRUCTION_CONTROL: 'bg-violet-100 text-violet-800',
  CONSTRUCTION_CONTROL_V2: 'bg-violet-100 text-violet-700',
  SK_CALL_REGISTER: 'bg-pink-100 text-pink-800',
  AUTHOR_SUPERVISION_2016: 'bg-purple-100 text-purple-700',
  DRILLING_WORKS: 'bg-amber-100 text-amber-900',
  CONCRETE_CURING: 'bg-sky-100 text-sky-800',
  JOINT_GROUTING: 'bg-indigo-100 text-indigo-700',
  ANTICORROSION_WELD: 'bg-teal-100 text-teal-700',
  BOLT_CONNECTIONS: 'bg-slate-100 text-slate-800',
  TORQUE_WRENCH_CALIBRATION: 'bg-zinc-100 text-zinc-800',
  CABLE_TUBE: 'bg-yellow-100 text-yellow-900',
  CABLE_ROUTE: 'bg-yellow-100 text-yellow-700',
  PIPELINE_WELDING: 'bg-orange-100 text-orange-700',
  INSULATION_LAYING: 'bg-lime-100 text-lime-800',
  TECHNICAL_LEVELING: 'bg-cyan-100 text-cyan-700',
  FIRE_SAFETY_INTRO: 'bg-red-100 text-red-700',
  GENERAL_INTRO_BRIEFING: 'bg-red-100 text-red-600',
  CUSTOM: 'bg-gray-100 text-gray-800',
};

// === Нормативные ссылки по типам журналов ===

export const JOURNAL_NORMATIVE_REFS: Partial<Record<SpecialJournalType, string>> = {
  CONCRETE_WORKS: 'СП 70.13330.2012, Прил. Ф',
  WELDING_WORKS: 'СП 70.13330.2012, Прил. Б',
  AUTHOR_SUPERVISION: 'СП 246.1325800.2023, Прил. Б',
  MOUNTING_WORKS: 'СП 70.13330.2012, Прил. А',
  ANTICORROSION: 'СП 72.13330.2016, Прил. Г',
  GEODETIC: 'Форма Ф-5',
  EARTHWORKS: 'СП 392.1325800.2018, Ф.5.1',
  PILE_DRIVING: 'СП 392.1325800.2018, Ф.4.1',
  CABLE_LAYING: 'И 1.13-07, Форма 18',
  OZR_1026PR: 'Приказ Ростехнадзора № 1026/пр',
  OZR_RD_11_05: 'РД 11-05-2007',
  INPUT_CONTROL: 'СП 48.13330.2019, Прил. И',
  CONSTRUCTION_CONTROL: 'СП 48.13330.2019',
  CONSTRUCTION_CONTROL_V2: 'СП 48.13330.2019',
  AUTHOR_SUPERVISION_2016: 'СП 246.1325800.2016, Прил. Е',
  DRILLING_WORKS: 'СП 392.1325800.2018, Ф.11.17',
  CONCRETE_CURING: 'Форма Ф-55',
  JOINT_GROUTING: 'СП 70.13330.2012, Прил. Г',
  ANTICORROSION_WELD: 'СП 72.13330.2016, Прил. В',
  TORQUE_WRENCH_CALIBRATION: 'СП 70.13330.2012, Прил. Е',
  CABLE_TUBE: 'ГОСТ 21.613-2014',
  CABLE_ROUTE: 'ГОСТ 21.613',
  PIPELINE_WELDING: 'СП 77.13330.2016, Прил. А.13',
  INSULATION_LAYING: 'СП 392.1325800.2018, Ф.7.1',
  TECHNICAL_LEVELING: 'Форма Ф-6',
  GENERAL_INTRO_BRIEFING: 'п.86 ПП РФ 2464',
};

// === Лейблы статусов записей ===

export const ENTRY_STATUS_LABELS: Record<JournalEntryStatus, string> = {
  DRAFT: 'Черновик',
  SUBMITTED: 'На проверке',
  APPROVED: 'Утверждена',
  REJECTED: 'Отклонена',
};

export const ENTRY_STATUS_CLASS: Record<JournalEntryStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-700',
};

// === Тип элемента списка журналов (API-ответ) ===

export interface JournalListItem {
  id: string;
  type: SpecialJournalType;
  number: string;
  title: string;
  status: JournalStatus;
  normativeRef: string | null;
  openedAt: string;
  closedAt: string | null;
  createdAt: string;
  responsible: { id: string; firstName: string | null; lastName: string | null };
  createdBy: { id: string; firstName: string | null; lastName: string | null };
  contract: { id: string; number: string; name: string } | null;
  _count: { entries: number };
}

// === Тип реквизитов журнала ===

/** Одна запись реквизита — юрлицо или физлицо */
export interface JournalRequisiteEntry {
  orgId?: string;    // ObjectOrganization.id
  personId?: string; // ObjectPerson.id
  name: string;      // Отображаемое название
}

/** Реквизиты журнала (Заказчик, Генподрядчик и т.д.) */
export interface JournalRequisites {
  customer?: JournalRequisiteEntry;
  generalContractor?: JournalRequisiteEntry;
  constructionControl?: JournalRequisiteEntry;
  authorSupervision?: JournalRequisiteEntry;
  stateSupervision?: JournalRequisiteEntry;
}

// === Тип карточки журнала (GET /journals/[journalId]) ===

export interface JournalDetail {
  id: string;
  type: SpecialJournalType;
  number: string;
  title: string;
  status: JournalStatus;
  normativeRef: string | null;
  openedAt: string;
  closedAt: string | null;
  startDate: string | null;
  endDate: string | null;
  requisites: JournalRequisites | null;
  createdAt: string;
  responsible: { id: string; firstName: string | null; lastName: string | null };
  createdBy: { id: string; firstName: string | null; lastName: string | null };
  contract: { id: string; number: string; name: string } | null;
  approvalRoute: {
    id: string;
    status: string;
    currentStepIdx: number;
    steps: Array<{
      id: string;
      stepIndex: number;
      role: string;
      status: string;
      comment: string | null;
      decidedAt: string | null;
      userId: string | null;
      user: { id: string; firstName: string | null; lastName: string | null } | null;
    }>;
  } | null;
  _count: { entries: number };
}

// === Лейблы и CSS статусов замечаний ===

export const REMARK_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Открыто',
  IN_PROGRESS: 'В работе',
  RESOLVED: 'Решено',
};

export const REMARK_STATUS_CLASS: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
};

// === Тип замечания (API-ответ) ===

export interface RemarkItem {
  id: string;
  text: string;
  status: string;
  deadline: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  createdAt: string;
  author: { id: string; firstName: string | null; lastName: string | null };
  resolvedBy: { id: string; firstName: string | null; lastName: string | null } | null;
}

// === Тип детальной карточки записи (GET /entries/[entryId]) ===

export interface EntryDetail {
  id: string;
  entryNumber: number;
  date: string;
  status: JournalEntryStatus;
  description: string;
  location: string | null;
  normativeRef: string | null;
  weather: string | null;
  temperature: number | null;
  data: Record<string, unknown> | null;
  inspectionDate: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; firstName: string | null; lastName: string | null };
  journal: { id: string; type: SpecialJournalType; title: string; status: JournalStatus };
  executionDoc: { id: string; number: string; title: string } | null;
  remarks: RemarkItem[];
}

// === Тип раздела ОЖР с записями (GET /journals/[journalId]/sections) ===

export interface SectionWithEntries {
  id: string;
  sectionNumber: number;
  title: string;
  journalId: string;
  createdAt: string;
  entries: JournalEntryItem[];
}

// === Тип записи журнала (GET /journals/[journalId]/entries) ===

export interface JournalEntryItem {
  id: string;
  entryNumber: number;
  date: string;
  status: JournalEntryStatus;
  description: string;
  location: string | null;
  normativeRef: string | null;
  weather: string | null;
  temperature: number | null;
  data: Record<string, unknown> | null;
  inspectionDate: string | null;
  executionDocId: string | null;
  journalId: string;
  authorId: string;
  author: { id: string; firstName: string | null; lastName: string | null };
  _count: { remarks: number; sourceLinks: number; targetLinks: number };
}

// === Тип связи записей журналов (GET .../entries/[eid]/links) ===

export interface JournalEntryLinkItem {
  id: string;
  linkType: JournalLinkType;
  sourceEntryId: string;
  targetEntryId: string;
  createdAt: string;
  createdBy: { id: string; firstName: string | null; lastName: string | null };
  sourceEntry?: {
    id: string;
    entryNumber: number;
    description: string;
    date: string;
    journal: { id: string; type: SpecialJournalType; title: string };
  };
  targetEntry?: {
    id: string;
    entryNumber: number;
    description: string;
    date: string;
    journal: { id: string; type: SpecialJournalType; title: string };
  };
}
