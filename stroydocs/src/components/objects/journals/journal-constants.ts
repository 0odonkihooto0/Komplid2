import type { JournalEntryStatus, JournalStatus, SpecialJournalType } from '@prisma/client';

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
  CUSTOM: 'bg-gray-100 text-gray-800',
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
  createdAt: string;
  responsible: { id: string; firstName: string | null; lastName: string | null };
  createdBy: { id: string; firstName: string | null; lastName: string | null };
  contract: { id: string; number: string; name: string } | null;
  approvalRoute: { id: string; status: string } | null;
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
  _count: { remarks: number };
}
