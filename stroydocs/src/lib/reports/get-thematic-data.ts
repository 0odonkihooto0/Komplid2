import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

// ────────────────────────────────────────────────────────────────────────────
// Получение данных для тематических отчётов по slug-идентификатору.
// Каждый slug соответствует конкретному типу данных и набору колонок.
// Возвращает массив строк для отображения в таблице отчёта.
// ────────────────────────────────────────────────────────────────────────────

/** Фильтры для тематических отчётов */
export interface ThematicFilters {
  /** Дата начала периода (ISO 8601) */
  dateFrom?: string;
  /** Дата окончания периода (ISO 8601) */
  dateTo?: string;
  /** Фильтр по конкретному договору */
  contractId?: string;
}

/** Строка тематического отчёта — значения всех доступных колонок */
export type ThematicRow = Record<string, string | number | boolean | null>;

/** Форматирование даты для отображения в таблице (dd.mm.yyyy) */
function fmtDate(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toLocaleDateString('ru-RU');
}

// ─── Получение данных по slug ────────────────────────────────────────────────

/** defects-report — Отчёт по недостаткам */
async function getDefectsReport(
  projectId: string,
  filters: ThematicFilters
): Promise<ThematicRow[]> {
  const dateFilter =
    filters.dateFrom || filters.dateTo
      ? {
          ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
          ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
        }
      : undefined;

  const defects = await db.defect.findMany({
    where: {
      projectId,
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      title: true,
      category: true,
      description: true,
      normativeRef: true,
      deadline: true,
      status: true,
      createdAt: true,
      author: { select: { firstName: true, lastName: true } },
      assignee: { select: { firstName: true, lastName: true } },
      buildingObject: { select: { name: true } },
    },
  });

  return defects.map((d, i) => ({
    objectName: d.buildingObject.name,
    number: i + 1,
    category: d.category,
    description: d.title,
    standard: d.normativeRef ?? '',
    deadline: fmtDate(d.deadline),
    status: d.status,
    responsible: d.assignee
      ? `${d.assignee.lastName} ${d.assignee.firstName}`.trim()
      : '',
    author: `${d.author.lastName} ${d.author.firstName}`.trim(),
    createdAt: fmtDate(d.createdAt),
  }));
}

/** prescriptions-report — Оперативный отчёт по предписаниям */
async function getPrescriptionsReport(
  projectId: string,
  filters: ThematicFilters
): Promise<ThematicRow[]> {
  const dateFilter =
    filters.dateFrom || filters.dateTo
      ? {
          ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
          ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
        }
      : undefined;

  const prescriptions = await db.prescription.findMany({
    where: {
      inspection: { projectId },
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      number: true,
      type: true,
      status: true,
      issuedAt: true,
      deadline: true,
      closedAt: true,
      createdAt: true,
      issuedBy: { select: { firstName: true, lastName: true } },
      responsible: { select: { firstName: true, lastName: true } },
      inspection: {
        select: {
          buildingObject: { select: { name: true } },
        },
      },
    },
  });

  return prescriptions.map((p) => ({
    objectName: p.inspection.buildingObject.name,
    number: p.number,
    type: p.type,
    description: `Предписание ${p.number}`,
    deadline: fmtDate(p.deadline),
    closedAt: fmtDate(p.closedAt),
    status: p.status,
    responsible: p.responsible
      ? `${p.responsible.lastName} ${p.responsible.firstName}`.trim()
      : '',
    author: `${p.issuedBy.lastName} ${p.issuedBy.firstName}`.trim(),
    createdAt: fmtDate(p.issuedAt),
  }));
}

/** defects-by-object — Пообъектный отчёт по недостаткам */
async function getDefectsByObject(
  projectId: string,
  filters: ThematicFilters
): Promise<ThematicRow[]> {
  const dateFilter =
    filters.dateFrom || filters.dateTo
      ? {
          ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
          ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
        }
      : undefined;

  const defects = await db.defect.findMany({
    where: {
      projectId,
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    },
    take: 200,
    select: {
      status: true,
      deadline: true,
      buildingObject: { select: { name: true } },
    },
  });

  // Группировка по объекту (в данном контексте — всегда один объект)
  const now = new Date();
  const objectName = defects[0]?.buildingObject?.name ?? '';
  const totalDefects = defects.length;
  const openDefects = defects.filter(
    (d) => d.status === 'OPEN' || d.status === 'IN_PROGRESS'
  ).length;
  const closedDefects = defects.filter(
    (d) => d.status === 'CONFIRMED' || d.status === 'RESOLVED'
  ).length;
  const overdueDefects = defects.filter(
    (d) =>
      (d.status === 'OPEN' || d.status === 'IN_PROGRESS') &&
      d.deadline !== null &&
      d.deadline < now
  ).length;

  if (totalDefects === 0) return [];

  return [
    {
      objectName,
      totalDefects,
      openDefects,
      closedDefects,
      overdueDefects,
    },
  ];
}

/** sk-engineers-report — Отчёт о работе инженеров СК */
async function getSkEngineersReport(
  projectId: string,
  filters: ThematicFilters
): Promise<ThematicRow[]> {
  const dateFilter =
    filters.dateFrom || filters.dateTo
      ? {
          ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
          ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
        }
      : undefined;

  const inspections = await db.inspection.findMany({
    where: {
      projectId,
      ...(dateFilter ? { startedAt: dateFilter } : {}),
    },
    orderBy: { startedAt: 'desc' },
    take: 200,
    select: {
      number: true,
      status: true,
      startedAt: true,
      completedAt: true,
      inspector: { select: { firstName: true, lastName: true } },
      buildingObject: { select: { name: true } },
      _count: {
        select: {
          defects: true,
          prescriptions: true,
        },
      },
    },
  });

  return inspections.map((ins) => ({
    engineerName: `${ins.inspector.lastName} ${ins.inspector.firstName}`.trim(),
    objectName: ins.buildingObject.name,
    date: fmtDate(ins.startedAt),
    type: 'Проверка СК',
    result: ins.status === 'COMPLETED' ? 'Завершена' : 'В процессе',
    defectsFound: ins._count.defects,
    prescriptionsIssued: ins._count.prescriptions,
  }));
}

/** sk-signatures-report — Отчёт по подписаниям документов СК */
async function getSkSignaturesReport(
  projectId: string,
  filters: ThematicFilters
): Promise<ThematicRow[]> {
  const dateFilter =
    filters.dateFrom || filters.dateTo
      ? {
          ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
          ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
        }
      : undefined;

  const acts = await db.inspectionAct.findMany({
    where: {
      inspection: { projectId },
      ...(dateFilter ? { issuedAt: dateFilter } : {}),
    },
    orderBy: { issuedAt: 'desc' },
    take: 200,
    select: {
      number: true,
      issuedAt: true,
      createdAt: true,
      issuedBy: { select: { firstName: true, lastName: true } },
      inspection: {
        select: {
          buildingObject: { select: { name: true } },
        },
      },
      approvalRoute: {
        select: {
          status: true,
        },
      },
    },
  });

  return acts.map((a) => ({
    objectName: a.inspection.buildingObject.name,
    actType: 'Акт проверки СК',
    actNumber: a.number,
    status: a.approvalRoute?.status ?? 'DRAFT',
    signatories: `${a.issuedBy.lastName} ${a.issuedBy.firstName}`.trim(),
    createdAt: fmtDate(a.createdAt),
    signedAt: fmtDate(a.issuedAt),
  }));
}

/** work-volumes — Объёмы выполненных работ */
async function getWorkVolumes(
  projectId: string,
  filters: ThematicFilters
): Promise<ThematicRow[]> {
  const dateFilter =
    filters.dateFrom || filters.dateTo
      ? {
          ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
          ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
        }
      : undefined;

  const records = await db.workRecord.findMany({
    where: {
      contract: {
        projectId,
        ...(filters.contractId ? { id: filters.contractId } : {}),
      },
      ...(dateFilter ? { date: dateFilter } : {}),
    },
    orderBy: { date: 'asc' },
    take: 200,
    select: {
      date: true,
      location: true,
      workItem: { select: { name: true, unit: true, volume: true } },
      contract: {
        select: {
          number: true,
          buildingObject: { select: { name: true } },
        },
      },
    },
  });

  return records.map((r) => ({
    objectName: r.contract.buildingObject.name,
    date: fmtDate(r.date),
    workName: r.workItem.name,
    unit: r.workItem.unit ?? '',
    // Объём берём из справочника видов работ (workItem.volume), т.к. в WorkRecord нет поля quantity
    quantity: r.workItem.volume ?? null,
    location: r.location ?? '',
    contractorName: r.contract.number ?? '',
  }));
}

/** ks2-summary — Сводка КС-2 за период */
async function getKs2Summary(
  projectId: string,
  filters: ThematicFilters
): Promise<ThematicRow[]> {
  const where: Prisma.Ks2ActWhereInput = {
    contract: {
      projectId,
      ...(filters.contractId ? { id: filters.contractId } : {}),
    },
  };
  if (filters.dateFrom) {
    where.periodStart = { gte: new Date(filters.dateFrom) };
  }
  if (filters.dateTo) {
    where.periodEnd = { lte: new Date(filters.dateTo) };
  }

  const acts = await db.ks2Act.findMany({
    where,
    orderBy: { periodStart: 'desc' },
    take: 200,
    select: {
      number: true,
      periodStart: true,
      periodEnd: true,
      totalAmount: true,
      status: true,
      contract: {
        select: {
          number: true,
          name: true,
          buildingObject: { select: { name: true } },
        },
      },
    },
  });

  return acts.map((a) => ({
    objectName: a.contract.buildingObject.name,
    actNumber: a.number,
    contractName: `${a.contract.number ?? ''} ${a.contract.name ?? ''}`.trim(),
    periodStart: fmtDate(a.periodStart),
    periodEnd: fmtDate(a.periodEnd),
    amount: a.totalAmount,
    status: a.status,
  }));
}

/** gpr-deviation — Отклонения от ГПР */
async function getGprDeviation(
  projectId: string,
  _filters: ThematicFilters
): Promise<ThematicRow[]> {
  const tasks = await db.ganttTask.findMany({
    where: {
      version: {
        OR: [
          { projectId },
          { contract: { projectId } },
        ],
      },
    },
    orderBy: { sortOrder: 'asc' },
    take: 200,
    select: {
      name: true,
      planStart: true,
      planEnd: true,
      factStart: true,
      factEnd: true,
      progress: true,
      isCritical: true,
      version: {
        select: {
          project: { select: { name: true } },
          contract: { select: { buildingObject: { select: { name: true } } } },
        },
      },
    },
  });

  return tasks.map((t) => {
    // Отклонение в днях: фактический конец минус плановый конец
    const deviationDays =
      t.factEnd && t.planEnd
        ? Math.ceil((t.factEnd.getTime() - t.planEnd.getTime()) / 86_400_000)
        : null;

    const objectName =
      t.version.project?.name ??
      t.version.contract?.buildingObject?.name ??
      '';

    return {
      objectName,
      taskName: t.name,
      planStart: fmtDate(t.planStart),
      planEnd: fmtDate(t.planEnd),
      factStart: fmtDate(t.factStart),
      factEnd: fmtDate(t.factEnd),
      progress: t.progress,
      deviationDays: deviationDays ?? '',
      isCritical: t.isCritical ? 'Да' : 'Нет',
    };
  });
}

/** payments-report — Отчёт по оплатам */
async function getPaymentsReport(
  projectId: string,
  filters: ThematicFilters
): Promise<ThematicRow[]> {
  const where: Prisma.ContractPaymentWhereInput = {
    contract: {
      projectId,
      ...(filters.contractId ? { id: filters.contractId } : {}),
    },
  };
  if (filters.dateFrom || filters.dateTo) {
    where.paymentDate = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
    };
  }

  const payments = await db.contractPayment.findMany({
    where,
    orderBy: { paymentDate: 'asc' },
    take: 200,
    select: {
      paymentDate: true,
      paymentType: true,
      amount: true,
      budgetType: true,
      description: true,
      contract: {
        select: {
          number: true,
          name: true,
          buildingObject: { select: { name: true } },
        },
      },
    },
  });

  return payments.map((p) => ({
    objectName: p.contract.buildingObject.name,
    date: fmtDate(p.paymentDate),
    paymentType: p.paymentType,
    amount: p.amount,
    contractName: `${p.contract.number ?? ''} ${p.contract.name ?? ''}`.trim(),
    contractorName: p.contract.name ?? '',
    description: p.description ?? '',
  }));
}

/** funding-report — Исполнение финансирования */
async function getFundingReport(
  projectId: string,
  _filters: ThematicFilters
): Promise<ThematicRow[]> {
  const fundingSources = await db.fundingSource.findMany({
    where: { projectId },
    take: 200,
    select: {
      name: true,
      type: true,
      amount: true,
      period: true,
      project: { select: { name: true } },
    },
  });

  return fundingSources.map((fs) => {
    // Разбор периода вида "2024 Q1" → год и квартал
    const periodParts = fs.period?.split(' ') ?? [];
    const year = periodParts[0] ?? '';
    const quarter = periodParts[1] ?? '';

    return {
      objectName: fs.project.name,
      sourceName: fs.name,
      // TODO: поле actual (фактическое освоение) отсутствует в модели FundingSource
      // Требуется добавить поле actualAmount в схему Prisma для полноценного отчёта
      planned: fs.amount,
      actual: null,
      utilization: null,
      year,
      quarter,
    };
  });
}

// ─── Публичный API ───────────────────────────────────────────────────────────

/**
 * Возвращает данные для тематического отчёта по slug.
 * Поддерживаемые slug:
 *   defects-report       — Отчёт по недостаткам
 *   prescriptions-report — Оперативный отчёт по предписаниям
 *   defects-by-object    — Пообъектный отчёт по недостаткам
 *   sk-engineers-report  — Отчёт о работе инженеров СК
 *   sk-signatures-report — Отчёт по подписаниям документов СК
 *   work-volumes         — Объёмы выполненных работ
 *   ks2-summary          — Сводка КС-2 за период
 *   gpr-deviation        — Отклонения от ГПР
 *   payments-report      — Отчёт по оплатам
 *   funding-report       — Исполнение финансирования
 */
export async function getThematicData(
  slug: string,
  projectId: string,
  filters: ThematicFilters
): Promise<ThematicRow[]> {
  switch (slug) {
    case 'defects-report':
      return getDefectsReport(projectId, filters);

    case 'prescriptions-report':
      return getPrescriptionsReport(projectId, filters);

    case 'defects-by-object':
      return getDefectsByObject(projectId, filters);

    case 'sk-engineers-report':
      return getSkEngineersReport(projectId, filters);

    case 'sk-signatures-report':
      return getSkSignaturesReport(projectId, filters);

    case 'work-volumes':
      return getWorkVolumes(projectId, filters);

    case 'ks2-summary':
      return getKs2Summary(projectId, filters);

    case 'gpr-deviation':
      return getGprDeviation(projectId, filters);

    case 'payments-report':
      return getPaymentsReport(projectId, filters);

    case 'funding-report':
      return getFundingReport(projectId, filters);

    default:
      return [];
  }
}
