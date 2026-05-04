import type {
  ExecutionDoc,
  WorkRecord,
  Defect,
  Photo,
  SpecialJournalEntry,
  SpecialJournal,
  Contract,
} from '@prisma/client';
import { ExecutionDocType, ExecutionDocStatus, PhotoEntityType } from '@prisma/client';

export interface RuleContext {
  docs: ExecutionDoc[];
  workRecords: WorkRecord[];
  defects: Defect[];
  photos: Photo[];
  journalEntries: SpecialJournalEntry[];
  journals: SpecialJournal[];
  contracts: Contract[];
  projectId: string;
}

export interface RuleViolation {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category:
    | 'MISSING_DOCUMENT'
    | 'MISSING_SIGNATURE'
    | 'WRONG_DATE'
    | 'INCONSISTENCY'
    | 'MISSING_FIELD'
    | 'FORMAT_ERROR'
    | 'REGULATORY'
    | 'MISSING_CERTIFICATE';
  title: string;
  description: string;
  affectedDocIds: string[];
  affectedJournalIds: string[];
  suggestedFix?: string;
  standard?: string;
}

type Rule = (ctx: RuleContext) => RuleViolation[];

// Вспомогательная функция — проверить есть ли фото привязанное к WorkRecord
function hasPhotosForWorkRecord(photos: Photo[], workRecordId: string): boolean {
  return photos.some(
    (p) => p.entityType === PhotoEntityType.WORK_RECORD && p.entityId === workRecordId,
  );
}

// Получить АОСР-документы
function getAosrDocs(docs: ExecutionDoc[]): ExecutionDoc[] {
  return docs.filter((d) => d.type === ExecutionDocType.AOSR);
}

export const RULES: Rule[] = [
  // Правило 1: АОСР должен быть привязан к WorkRecord
  (ctx) =>
    getAosrDocs(ctx.docs)
      .filter((d) => !d.workRecordId)
      .map((d) => ({
        severity: 'HIGH',
        category: 'MISSING_FIELD',
        title: `АОСР «${d.number}»: не привязан к записи о работе`,
        description: 'Каждый акт освидетельствования скрытых работ обязан ссылаться на конкретную запись WorkRecord о выполненной работе.',
        affectedDocIds: [d.id],
        affectedJournalIds: [],
        suggestedFix: 'Привязать АОСР к существующей записи о работе или создать новую',
        standard: 'СП 48.13330.2019 п.5.4',
      })),

  // Правило 2: У АОСР обязательно должны быть фото скрытых работ
  (ctx) =>
    getAosrDocs(ctx.docs)
      .filter((d) => d.workRecordId && !hasPhotosForWorkRecord(ctx.photos, d.workRecordId))
      .map((d) => ({
        severity: 'CRITICAL',
        category: 'MISSING_DOCUMENT',
        title: `АОСР «${d.number}»: отсутствуют фото скрытых работ`,
        description: 'По каждому АОСР скрытых работ должны быть приложены фотоматериалы, подтверждающие выполнение до закрытия конструкции.',
        affectedDocIds: [d.id],
        affectedJournalIds: [],
        suggestedFix: 'Добавить фото к записи о работе, прикреплённой к данному АОСР',
        standard: 'СП 70.13330.2012 п.10.1',
      })),

  // Правило 3: АОСР не должен быть в статусе DRAFT (неподписан)
  (ctx) =>
    getAosrDocs(ctx.docs)
      .filter((d) => d.status === ExecutionDocStatus.DRAFT)
      .map((d) => ({
        severity: 'HIGH',
        category: 'MISSING_SIGNATURE',
        title: `АОСР «${d.number}»: документ не подписан (статус «Черновик»)`,
        description: 'АОСР должен быть подписан всеми ответственными сторонами перед сдачей пакета ИД.',
        affectedDocIds: [d.id],
        affectedJournalIds: [],
        suggestedFix: 'Подписать акт всеми ответственными сторонами',
        standard: 'ГОСТ Р 70108-2025 п.6.3.2',
      })),

  // Правило 4: АОСР не должен быть отклонён (REJECTED)
  (ctx) =>
    getAosrDocs(ctx.docs)
      .filter((d) => d.status === ExecutionDocStatus.REJECTED)
      .map((d) => ({
        severity: 'HIGH',
        category: 'MISSING_SIGNATURE',
        title: `АОСР «${d.number}»: документ отклонён`,
        description: 'Акт освидетельствования отклонён ответственным. Необходимо устранить замечания и повторно согласовать.',
        affectedDocIds: [d.id],
        affectedJournalIds: [],
        suggestedFix: 'Изучить замечания, внести исправления и повторно направить на согласование',
      })),

  // Правило 5: Дубликаты номеров АОСР в одном договоре
  (ctx) => {
    const byContractAndNumber = new Map<string, ExecutionDoc[]>();
    for (const doc of getAosrDocs(ctx.docs)) {
      const key = `${doc.contractId}::${doc.number}`;
      const existing = byContractAndNumber.get(key) ?? [];
      existing.push(doc);
      byContractAndNumber.set(key, existing);
    }
    const violations: RuleViolation[] = [];
    for (const [, docs] of Array.from(byContractAndNumber.entries())) {
      if (docs.length > 1) {
        violations.push({
          severity: 'CRITICAL',
          category: 'INCONSISTENCY',
          title: `АОСР с номером «${docs[0].number}»: дублирующиеся номера в одном договоре`,
          description: `Найдено ${docs.length} АОСР с одним номером в рамках одного договора. Нумерация АОСР должна быть уникальной.`,
          affectedDocIds: docs.map((d) => d.id),
          affectedJournalIds: [],
          suggestedFix: 'Пересмотреть нумерацию АОСР в данном договоре',
          standard: 'ГОСТ Р 70108-2025 п.5.2',
        });
      }
    }
    return violations;
  },

  // Правило 6: АОСР без заголовка (title)
  (ctx) =>
    getAosrDocs(ctx.docs)
      .filter((d) => !d.title || d.title.trim().length < 3)
      .map((d) => ({
        severity: 'MEDIUM',
        category: 'MISSING_FIELD',
        title: `АОСР «${d.number}»: отсутствует наименование работ`,
        description: 'Акт должен содержать чёткое наименование скрытых работ, которые освидетельствованы.',
        affectedDocIds: [d.id],
        affectedJournalIds: [],
        suggestedFix: 'Указать наименование скрытых работ в поле "Наименование"',
      })),

  // Правило 7: Нет ни одного АОСР при наличии договора и выполненных работ
  (ctx) => {
    const aosrCount = getAosrDocs(ctx.docs).length;
    const workRecordCount = ctx.workRecords.length;
    if (workRecordCount >= 5 && aosrCount === 0) {
      return [
        {
          severity: 'HIGH',
          category: 'MISSING_DOCUMENT',
          title: 'Отсутствуют акты освидетельствования скрытых работ (АОСР)',
          description: `Зафиксировано ${workRecordCount} записей о работах, но не создано ни одного АОСР. Для скрытых работ акты освидетельствования обязательны.`,
          affectedDocIds: [],
          affectedJournalIds: [],
          suggestedFix: 'Создать АОСР для работ, подлежащих освидетельствованию',
          standard: 'СП 48.13330.2019 п.5.4, ГОСТ Р 70108-2025',
        },
      ];
    }
    return [];
  },

  // Правило 8: Нет ОЖР при наличии 3+ АОСР
  (ctx) => {
    const aosrCount = getAosrDocs(ctx.docs).length;
    const ozrDocs = ctx.docs.filter((d) => d.type === ExecutionDocType.OZR);
    if (aosrCount >= 3 && ozrDocs.length === 0 && ctx.journals.length === 0) {
      return [
        {
          severity: 'HIGH',
          category: 'MISSING_DOCUMENT',
          title: 'Отсутствует Общий журнал работ (ОЖР)',
          description: `При наличии ${aosrCount} АОСР обязательно ведение ОЖР. Журнал не найден.`,
          affectedDocIds: [],
          affectedJournalIds: [],
          suggestedFix: 'Создать и заполнить Общий журнал работ',
          standard: 'РД-11-05-2007, СП 48.13330.2019 п.5.6',
        },
      ];
    }
    return [];
  },

  // Правило 9: Дата АОСР позже последней записи WorkRecord (хронологическое нарушение)
  (ctx) => {
    const workRecordById = new Map(ctx.workRecords.map((w) => [w.id, w]));
    return getAosrDocs(ctx.docs)
      .filter((d) => {
        if (!d.workRecordId || !d.generatedAt) return false;
        const wr = workRecordById.get(d.workRecordId);
        if (!wr) return false;
        // АОСР не может быть датирован раньше записи о работе
        return d.generatedAt < wr.date;
      })
      .map((d) => ({
        severity: 'HIGH',
        category: 'WRONG_DATE',
        title: `АОСР «${d.number}»: дата акта раньше даты выполнения работ`,
        description: 'Дата АОСР не может предшествовать дате завершения скрытых работ, которые он освидетельствует.',
        affectedDocIds: [d.id],
        affectedJournalIds: [],
        suggestedFix: 'Проверить и скорректировать дату АОСР',
        standard: 'ГОСТ Р 70108-2025 п.6.3.1',
      }));
  },

  // Правило 10: Нет фото вообще у проекта
  (ctx) => {
    if (ctx.photos.length === 0 && ctx.workRecords.length > 0) {
      return [
        {
          severity: 'HIGH',
          category: 'MISSING_DOCUMENT',
          title: 'Отсутствуют фотоматериалы по объекту',
          description: 'Не найдено ни одной фотографии. Фотофиксация хода работ — обязательный элемент исполнительной документации.',
          affectedDocIds: [],
          affectedJournalIds: [],
          suggestedFix: 'Добавить фотографии выполненных работ',
          standard: 'ГОСТ Р 70108-2025 п.7.5',
        },
      ];
    }
    return [];
  },

  // Правило 11: ОЖР без записей за длительный период (>30 дней подряд без записей при активном договоре)
  (ctx) => {
    if (ctx.journalEntries.length === 0) return [];
    const sorted = [...ctx.journalEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const violations: RuleViolation[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].date).getTime();
      const curr = new Date(sorted[i].date).getTime();
      const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
      if (diffDays > 30) {
        violations.push({
          severity: 'MEDIUM',
          category: 'MISSING_FIELD',
          title: `ОЖР: перерыв в записях более 30 дней`,
          description: `Обнаружен перерыв ${Math.round(diffDays)} дней в записях журнала. ОЖР должен вестись непрерывно в период производства работ.`,
          affectedDocIds: [],
          affectedJournalIds: [sorted[i - 1].journalId],
          suggestedFix: 'Проверить наличие всех записей ОЖР за указанный период',
          standard: 'РД-11-05-2007 п.4.2',
        });
        break; // только первый длинный пропуск, не спамить
      }
    }
    return violations;
  },

  // Правило 12: Документы KS_11 / KS_14 требуют всех подписей (статус)
  (ctx) =>
    ctx.docs
      .filter(
        (d) =>
          (d.type === ExecutionDocType.KS_11 || d.type === ExecutionDocType.KS_14) &&
          d.status !== ExecutionDocStatus.SIGNED,
      )
      .map((d) => ({
        severity: 'CRITICAL',
        category: 'MISSING_SIGNATURE',
        title: `${d.type} «${d.number}»: акт приёмки не подписан`,
        description: 'Акт приёмки законченного строительства должен быть подписан всеми членами комиссии.',
        affectedDocIds: [d.id],
        affectedJournalIds: [],
        suggestedFix: 'Получить подписи всех членов приёмочной комиссии',
        standard: 'Постановление Госстроя РФ № 9 от 24.04.2000',
      })),

  // Правило 13: Нет Акта технической готовности для завершённого объекта
  (ctx) => {
    const hasCompletedContract = ctx.contracts.some(
      (c) => (c as unknown as { status: string }).status === 'COMPLETED',
    );
    const hasTechReadiness = ctx.docs.some(
      (d) => d.type === ExecutionDocType.TECHNICAL_READINESS_ACT,
    );
    if (hasCompletedContract && !hasTechReadiness) {
      return [
        {
          severity: 'HIGH',
          category: 'MISSING_DOCUMENT',
          title: 'Отсутствует Акт технической готовности',
          description: 'Для завершённого договора необходимо наличие подписанного Акта технической готовности объекта.',
          affectedDocIds: [],
          affectedJournalIds: [],
          suggestedFix: 'Создать и подписать Акт технической готовности',
          standard: 'СП 68.13330.2017 п.9.6',
        },
      ];
    }
    return [];
  },

  // Правило 14: Нет ни одного документа вообще
  (ctx) => {
    if (ctx.docs.length === 0) {
      return [
        {
          severity: 'INFO',
          category: 'MISSING_DOCUMENT',
          title: 'Не создано ни одного документа ИД',
          description: 'Пакет исполнительной документации пуст. Необходимо создать и заполнить документы ИД.',
          affectedDocIds: [],
          affectedJournalIds: [],
          suggestedFix: 'Начать с создания АОСР для выполненных скрытых работ',
        },
      ];
    }
    return [];
  },

  // Правило 15: WorkRecord без АОСР (сигнал возможного пропуска)
  (ctx) => {
    const workRecordIdsInAosr = new Set(
      getAosrDocs(ctx.docs)
        .map((d) => d.workRecordId)
        .filter(Boolean),
    );
    const orphanRecords = ctx.workRecords.filter(
      (w) => !workRecordIdsInAosr.has(w.id),
    );
    if (orphanRecords.length > 3) {
      return [
        {
          severity: 'MEDIUM',
          category: 'MISSING_DOCUMENT',
          title: `${orphanRecords.length} записей о работах без АОСР`,
          description: `Обнаружено ${orphanRecords.length} записей о работах, для которых не создан АОСР. Часть скрытых работ может быть не освидетельствована.`,
          affectedDocIds: [],
          affectedJournalIds: [],
          suggestedFix: 'Проверить все записи о работах и создать АОСР для скрытых работ',
          standard: 'СП 48.13330.2019 п.5.4',
        },
      ];
    }
    return [];
  },

  // Правило 16: АОСР без КС-2 (сигнал неполноты)
  (ctx) => {
    const hasKs2 = ctx.docs.some((d) => d.type === ExecutionDocType.KS_6A);
    const aosrCount = getAosrDocs(ctx.docs).length;
    if (aosrCount >= 5 && !hasKs2) {
      return [
        {
          severity: 'MEDIUM',
          category: 'MISSING_DOCUMENT',
          title: 'Отсутствует акт о приёмке выполненных работ (КС-6а)',
          description: `При наличии ${aosrCount} АОСР следует оформить сводную ведомость выполненных работ.`,
          affectedDocIds: [],
          affectedJournalIds: [],
          suggestedFix: 'Сформировать КС-6а на основании выполненных работ',
          standard: 'Постановление Госкомстата РФ от 11.11.1999 № 100',
        },
      ];
    }
    return [];
  },

  // Правило 17: Документы в статусе IN_REVIEW более 14 дней
  (ctx) => {
    const now = Date.now();
    return ctx.docs
      .filter((d) => {
        if (d.status !== ExecutionDocStatus.IN_REVIEW) return false;
        const createdDate = new Date(d.createdAt).getTime();
        const diffDays = (now - createdDate) / (1000 * 60 * 60 * 24);
        return diffDays > 14;
      })
      .map((d) => ({
        severity: 'LOW',
        category: 'REGULATORY',
        title: `Документ «${d.number || d.title}»: задержка согласования более 14 дней`,
        description: 'Документ находится на проверке более 14 дней. Рекомендуется ускорить процесс согласования.',
        affectedDocIds: [d.id],
        affectedJournalIds: [],
        suggestedFix: 'Уточнить статус согласования у ответственного лица',
      }));
  },

  // Правило 18: Проект с работами, нет фото более 60 дней
  (ctx) => {
    if (ctx.photos.length === 0) return [];
    const lastPhotoDate = ctx.photos.reduce((latest, p) => {
      const ts = new Date(p.createdAt).getTime();
      return ts > latest ? ts : latest;
    }, 0);
    const daysSinceLastPhoto = (Date.now() - lastPhotoDate) / (1000 * 60 * 60 * 24);
    if (daysSinceLastPhoto > 60 && ctx.workRecords.length > 0) {
      return [
        {
          severity: 'MEDIUM',
          category: 'MISSING_DOCUMENT',
          title: `Последняя фотография сделана более ${Math.round(daysSinceLastPhoto)} дней назад`,
          description: 'Регулярная фотофиксация хода работ — требование ИД. Фото должны добавляться по мере выполнения работ.',
          affectedDocIds: [],
          affectedJournalIds: [],
          suggestedFix: 'Добавить актуальные фотоматериалы хода производства работ',
          standard: 'ГОСТ Р 70108-2025 п.7.5',
        },
      ];
    }
    return [];
  },

  // Правило 19: Нет АОСР для закрытых (скрытых) видов работ — более 30 записей без хотя бы 10 АОСР
  (ctx) => {
    const aosrCount = getAosrDocs(ctx.docs).length;
    const ratio = ctx.workRecords.length > 0 ? aosrCount / ctx.workRecords.length : 1;
    if (ctx.workRecords.length >= 30 && ratio < 0.2) {
      return [
        {
          severity: 'HIGH',
          category: 'MISSING_DOCUMENT',
          title: 'Слишком мало АОСР относительно объёма работ',
          description: `Соотношение АОСР/WorkRecord = ${aosrCount}/${ctx.workRecords.length}. При значительном объёме скрытых работ необходимо оформлять АОСР для каждого вида.`,
          affectedDocIds: [],
          affectedJournalIds: [],
          suggestedFix: 'Создать АОСР для всех видов скрытых работ',
          standard: 'СП 48.13330.2019 п.5.4',
        },
      ];
    }
    return [];
  },

  // Правило 20: Пустые АОСР (нет title и нет workRecordId и статус DRAFT)
  (ctx) => {
    const emptyDrafts = getAosrDocs(ctx.docs).filter(
      (d) =>
        d.status === ExecutionDocStatus.DRAFT &&
        !d.workRecordId &&
        (!d.title || d.title.trim().length < 3),
    );
    if (emptyDrafts.length > 0) {
      return [
        {
          severity: 'MEDIUM',
          category: 'MISSING_FIELD',
          title: `${emptyDrafts.length} незаполненных черновиков АОСР`,
          description: 'Найдены АОСР-черновики без наименования и привязки к работам. Их необходимо заполнить или удалить.',
          affectedDocIds: emptyDrafts.map((d) => d.id),
          affectedJournalIds: [],
          suggestedFix: 'Заполнить или удалить незаполненные черновики АОСР',
        },
      ];
    }
    return [];
  },

  // Правило 21: OZR без единой записи журнала
  (ctx) => {
    const ozrDocs = ctx.docs.filter((d) => d.type === ExecutionDocType.OZR);
    if (ozrDocs.length > 0 && ctx.journalEntries.length === 0) {
      return [
        {
          severity: 'HIGH',
          category: 'MISSING_FIELD',
          title: 'ОЖР создан, но не содержит ни одной записи',
          description: 'Общий журнал работ существует, но записей нет. Журнал должен содержать ежедневные записи о производстве работ.',
          affectedDocIds: ozrDocs.map((d) => d.id),
          affectedJournalIds: [],
          suggestedFix: 'Заполнить ОЖР записями о выполненных работах',
          standard: 'РД-11-05-2007 п.4.3',
        },
      ];
    }
    return [];
  },

  // Правило 22: Документ с типом GENERAL_DOCUMENT без title
  (ctx) =>
    ctx.docs
      .filter((d) => d.type === ExecutionDocType.GENERAL_DOCUMENT && (!d.title || d.title.trim().length < 3))
      .map((d) => ({
        severity: 'LOW',
        category: 'MISSING_FIELD',
        title: `Документ «${d.id.slice(0, 8)}»: не указано наименование`,
        description: 'Общий документ должен иметь понятное наименование для идентификации в реестре ИД.',
        affectedDocIds: [d.id],
        affectedJournalIds: [],
        suggestedFix: 'Задать наименование документа',
      })),

  // Правило 23: Более 20% АОСР без сгенерированного PDF
  (ctx) => {
    const aosrDocs = getAosrDocs(ctx.docs).filter((d) => d.status === ExecutionDocStatus.SIGNED);
    const withoutPdf = aosrDocs.filter((d) => !d.s3Key);
    if (aosrDocs.length > 0 && withoutPdf.length / aosrDocs.length > 0.2) {
      return [
        {
          severity: 'MEDIUM',
          category: 'MISSING_DOCUMENT',
          title: `${withoutPdf.length} подписанных АОСР без сгенерированного PDF`,
          description: 'Подписанные акты должны иметь PDF для включения в архивный пакет ИД.',
          affectedDocIds: withoutPdf.map((d) => d.id),
          affectedJournalIds: [],
          suggestedFix: 'Сгенерировать PDF для всех подписанных АОСР',
        },
      ];
    }
    return [];
  },

  // Правило 24: Журнальные записи без описания работ
  (ctx) => {
    const emptyEntries = ctx.journalEntries.filter(
      (e) => !e.description || e.description.trim().length < 5,
    );
    if (emptyEntries.length > 0) {
      const journalIds = Array.from(new Set(emptyEntries.map((e) => e.journalId)));
      return [
        {
          severity: 'LOW',
          category: 'MISSING_FIELD',
          title: `${emptyEntries.length} записей журнала без описания работ`,
          description: 'Записи журнала должны содержать описание выполненных работ.',
          affectedDocIds: [],
          affectedJournalIds: journalIds,
          suggestedFix: 'Дополнить описание в отмеченных записях журнала',
          standard: 'РД-11-05-2007 п.4.3',
        },
      ];
    }
    return [];
  },

  // Правило 25: АОСР с датой генерации в будущем (техническая ошибка)
  (ctx) => {
    const now = new Date();
    return getAosrDocs(ctx.docs)
      .filter((d) => d.generatedAt && new Date(d.generatedAt) > now)
      .map((d) => ({
        severity: 'HIGH',
        category: 'WRONG_DATE',
        title: `АОСР «${d.number}»: дата акта в будущем`,
        description: 'Дата создания акта не может быть в будущем. Вероятная ошибка при вводе даты.',
        affectedDocIds: [d.id],
        affectedJournalIds: [],
        suggestedFix: 'Исправить дату АОСР',
        standard: 'ГОСТ Р 70108-2025 п.6.3.1',
      }));
  },

  // Правило 26: Общий пакет ИД: нет ни одного подписанного документа
  (ctx) => {
    const signedDocs = ctx.docs.filter((d) => d.status === ExecutionDocStatus.SIGNED);
    if (ctx.docs.length > 0 && signedDocs.length === 0) {
      return [
        {
          severity: 'CRITICAL',
          category: 'MISSING_SIGNATURE',
          title: 'В пакете ИД нет ни одного подписанного документа',
          description: 'Для сдачи пакета ИД необходимо, чтобы хотя бы ключевые документы были подписаны.',
          affectedDocIds: ctx.docs.map((d) => d.id),
          affectedJournalIds: [],
          suggestedFix: 'Подписать основные документы пакета ИД',
          standard: 'ГОСТ Р 70108-2025 п.6.1',
        },
      ];
    }
    return [];
  },

  // Правило 27: Дефекты со статусом не RESOLVED при формировании пакета
  (ctx) => {
    const openDefects = ctx.defects.filter(
      (d) => (d as unknown as { status: string }).status !== 'RESOLVED' &&
        (d as unknown as { status: string }).status !== 'CLOSED',
    );
    if (openDefects.length > 0) {
      return [
        {
          severity: 'HIGH',
          category: 'REGULATORY',
          title: `${openDefects.length} незакрытых дефектов/замечаний`,
          description: 'Перед сдачей пакета ИД все выявленные дефекты должны быть устранены и закрыты.',
          affectedDocIds: [],
          affectedJournalIds: [],
          suggestedFix: 'Устранить и закрыть все открытые дефекты',
          standard: 'СП 48.13330.2019 п.7.2',
        },
      ];
    }
    return [];
  },

  // Правило 28: Документы без номера
  (ctx) =>
    ctx.docs
      .filter((d) => !d.number || d.number.trim().length === 0)
      .map((d) => ({
        severity: 'MEDIUM',
        category: 'MISSING_FIELD',
        title: `Документ «${d.title || d.id.slice(0, 8)}»: не указан номер`,
        description: 'Каждый документ ИД должен иметь порядковый номер для идентификации в реестре.',
        affectedDocIds: [d.id],
        affectedJournalIds: [],
        suggestedFix: 'Присвоить документу порядковый номер',
        standard: 'ГОСТ Р 70108-2025 п.5.3',
      })),

  // Правило 29: Записи ОЖР с датой в будущем
  (ctx) => {
    const now = new Date();
    const futureEntries = ctx.journalEntries.filter((e) => new Date(e.date) > now);
    if (futureEntries.length > 0) {
      const journalIds = Array.from(new Set(futureEntries.map((e) => e.journalId)));
      return [
        {
          severity: 'MEDIUM',
          category: 'WRONG_DATE',
          title: `${futureEntries.length} записей ОЖР с датой в будущем`,
          description: 'Записи журнала с датами в будущем, вероятно, содержат ошибку при вводе даты.',
          affectedDocIds: [],
          affectedJournalIds: journalIds,
          suggestedFix: 'Исправить даты записей журнала',
        },
      ];
    }
    return [];
  },

  // Правило 30: Суммарная проверка — достаточность ИД для сдачи объекта
  (ctx) => {
    const aosrSigned = getAosrDocs(ctx.docs).filter((d) => d.status === ExecutionDocStatus.SIGNED).length;
    const totalAosr = getAosrDocs(ctx.docs).length;
    if (totalAosr > 0 && aosrSigned < totalAosr * 0.8) {
      return [
        {
          severity: 'HIGH',
          category: 'MISSING_SIGNATURE',
          title: `Только ${aosrSigned} из ${totalAosr} АОСР подписаны`,
          description: `${totalAosr - aosrSigned} АОСР ещё не подписаны. Для готовности к сдаче необходимо подписать все акты.`,
          affectedDocIds: getAosrDocs(ctx.docs)
            .filter((d) => d.status !== ExecutionDocStatus.SIGNED)
            .map((d) => d.id),
          affectedJournalIds: [],
          suggestedFix: 'Завершить подписание всех АОСР',
          standard: 'ГОСТ Р 70108-2025 п.6.3.2',
        },
      ];
    }
    return [];
  },
];
