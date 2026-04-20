import ExcelJS from 'exceljs';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// ────────────────────────────────────────────────────────────────────────────
// Генерация тематических xlsx-отчётов по slug-идентификатору конфигурации.
// Каждый slug соответствует одному предустановленному отчёту (ThematicReportConfig).
// ────────────────────────────────────────────────────────────────────────────

/** Фильтры, передаваемые при генерации тематического отчёта */
export interface ThematicFilters {
  /** Дата начала периода (ISO 8601) */
  dateFrom?: string;
  /** Дата окончания периода (ISO 8601) */
  dateTo?: string;
  /** Фильтр по конкретному договору */
  contractId?: string;
}

// ─── Вспомогательные функции ────────────────────────────────────────────────

/** Форматирование даты для ячеек Excel (dd.mm.yyyy) */
function fmtDate(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toLocaleDateString('ru-RU');
}

/** Стиль заголовочной строки — синий фон, белый текст, жирный шрифт */
function applyHeaderStyle(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  row.height = 22;
}

/** Добавляет заголовок листа (название отчёта и период) */
function addSheetTitle(
  sheet: ExcelJS.Worksheet,
  title: string,
  colCount: number,
  filters: ThematicFilters
): void {
  const titleRow = sheet.addRow([title]);
  titleRow.getCell(1).font = { bold: true, size: 13 };
  sheet.mergeCells(`A${titleRow.number}:${String.fromCharCode(64 + colCount)}${titleRow.number}`);

  const periodLabel = [
    filters.dateFrom ? `с ${new Date(filters.dateFrom).toLocaleDateString('ru-RU')}` : '',
    filters.dateTo   ? `по ${new Date(filters.dateTo).toLocaleDateString('ru-RU')}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (periodLabel) {
    const periodRow = sheet.addRow([`Период: ${periodLabel}`]);
    periodRow.getCell(1).font = { italic: true, color: { argb: 'FF555555' }, size: 10 };
    sheet.mergeCells(`A${periodRow.number}:${String.fromCharCode(64 + colCount)}${periodRow.number}`);
  }

  sheet.addRow([]); // пустая строка перед данными
}

// ─── Генераторы по slug ──────────────────────────────────────────────────────

/** sk-defects — Сводка дефектов строительного контроля */
async function generateSkDefects(
  workbook: ExcelJS.Workbook,
  projectId: string,
  filters: ThematicFilters
): Promise<void> {
  const sheet = workbook.addWorksheet('Дефекты СК');

  // Модель Defect: title, description, category, status, normativeRef, deadline, createdAt
  sheet.columns = [
    { key: 'num',          width: 6  },
    { key: 'category',     width: 28 },
    { key: 'status',       width: 20 },
    { key: 'title',        width: 42 },
    { key: 'normativeRef', width: 28 },
    { key: 'deadline',     width: 14 },
    { key: 'created',      width: 14 },
  ];

  addSheetTitle(sheet, 'Сводка дефектов (строительный контроль)', 7, filters);

  const headerRow = sheet.addRow(['№', 'Категория', 'Статус', 'Описание', 'Норматив', 'Срок устранения', 'Дата выявления']);
  applyHeaderStyle(headerRow);

  const where: Prisma.DefectWhereInput = { projectId };
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo   ? { lte: new Date(filters.dateTo)   } : {}),
    };
  }

  const defects = await db.defect.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      category: true,
      status: true,
      title: true,
      normativeRef: true,
      deadline: true,
      createdAt: true,
    },
  });

  Array.from(defects.entries()).forEach(([i, d]) => {
    sheet.addRow([
      i + 1,
      d.category,
      d.status,
      d.title,
      d.normativeRef ?? '',
      fmtDate(d.deadline),
      fmtDate(d.createdAt),
    ]);
  });

  // Итоговая строка: количество по статусам
  sheet.addRow([]);
  const byStatus: Record<string, number> = {};
  for (const d of defects) {
    byStatus[d.status] = (byStatus[d.status] ?? 0) + 1;
  }
  const summaryLabel = Object.entries(byStatus)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
  const summaryRow = sheet.addRow([`Итого: ${defects.length} дефектов | ${summaryLabel}`]);
  summaryRow.getCell(1).font = { bold: true };
  sheet.mergeCells(`A${summaryRow.number}:G${summaryRow.number}`);
}

/** sk-prescriptions — Предписания строительного контроля */
async function generateSkPrescriptions(
  workbook: ExcelJS.Workbook,
  projectId: string,
  filters: ThematicFilters
): Promise<void> {
  const sheet = workbook.addWorksheet('Предписания СК');

  // Модель Prescription: number, type, status, issuedAt, deadline, closedAt
  // Связь с projectId — через inspection.projectId
  sheet.columns = [
    { key: 'num',       width: 6  },
    { key: 'number',    width: 18 },
    { key: 'type',      width: 22 },
    { key: 'status',    width: 18 },
    { key: 'issuedAt',  width: 14 },
    { key: 'deadline',  width: 14 },
    { key: 'closedAt',  width: 14 },
  ];

  addSheetTitle(sheet, 'Предписания строительного контроля', 7, filters);

  const headerRow = sheet.addRow(['№', 'Номер', 'Тип', 'Статус', 'Дата выдачи', 'Срок', 'Закрыто']);
  applyHeaderStyle(headerRow);

  const where: Prisma.PrescriptionWhereInput = {
    inspection: { projectId },
  };
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo   ? { lte: new Date(filters.dateTo)   } : {}),
    };
  }

  const prescriptions = await db.prescription.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      number: true,
      type: true,
      status: true,
      issuedAt: true,
      deadline: true,
      closedAt: true,
    },
  });

  Array.from(prescriptions.entries()).forEach(([i, p]) => {
    sheet.addRow([
      i + 1,
      p.number,
      p.type,
      p.status,
      fmtDate(p.issuedAt),
      fmtDate(p.deadline),
      fmtDate(p.closedAt),
    ]);
  });

  const summaryRow = sheet.addRow([`Итого: ${prescriptions.length} предписаний`]);
  summaryRow.getCell(1).font = { bold: true };
  sheet.mergeCells(`A${summaryRow.number}:G${summaryRow.number}`);
}

/** smr-work-volumes — Объёмы строительно-монтажных работ */
async function generateSmrWorkVolumes(
  workbook: ExcelJS.Workbook,
  projectId: string,
  filters: ThematicFilters
): Promise<void> {
  const sheet = workbook.addWorksheet('Объёмы СМР');

  sheet.columns = [
    { key: 'num',      width: 6  },
    { key: 'date',     width: 12 },
    { key: 'workName', width: 44 },
    { key: 'unit',     width: 10 },
    { key: 'quantity', width: 12 },
    { key: 'location', width: 28 },
    { key: 'contract', width: 30 },
  ];

  addSheetTitle(sheet, 'Объёмы выполненных СМР', 7, filters);

  const headerRow = sheet.addRow(['№', 'Дата', 'Наименование работ', 'Ед.', 'Объём', 'Место', 'Договор']);
  applyHeaderStyle(headerRow);

  const dateFilter =
    filters.dateFrom || filters.dateTo
      ? {
          ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
          ...(filters.dateTo   ? { lte: new Date(filters.dateTo)   } : {}),
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
    take: 500,
    select: {
      date: true,
      location: true,
      workItem: { select: { name: true, unit: true, volume: true } },
      contract: { select: { number: true } },
    },
  });

  Array.from(records.entries()).forEach(([i, r]) => {
    sheet.addRow([
      i + 1,
      fmtDate(r.date),
      r.workItem.name,
      r.workItem.unit ?? '',
      r.workItem.volume ?? '',
      r.location ?? '',
      r.contract.number ?? '',
    ]);
  });

  const summaryRow = sheet.addRow([`Итого записей: ${records.length}`]);
  summaryRow.getCell(1).font = { bold: true };
  sheet.mergeCells(`A${summaryRow.number}:G${summaryRow.number}`);
}

/** ks2-summary — Сводка актов КС-2 */
async function generateKs2Summary(
  workbook: ExcelJS.Workbook,
  projectId: string,
  filters: ThematicFilters
): Promise<void> {
  const sheet = workbook.addWorksheet('Акты КС-2');

  sheet.columns = [
    { key: 'num',         width: 6  },
    { key: 'number',      width: 18 },
    { key: 'contract',    width: 32 },
    { key: 'periodStart', width: 14 },
    { key: 'periodEnd',   width: 14 },
    { key: 'totalAmount', width: 18 },
    { key: 'status',      width: 18 },
  ];

  addSheetTitle(sheet, 'Сводка актов приёмки выполненных работ (КС-2)', 7, filters);

  const headerRow = sheet.addRow(['№', 'Номер акта', 'Договор', 'Период с', 'Период по', 'Сумма, ₽', 'Статус']);
  applyHeaderStyle(headerRow);

  const where: Prisma.Ks2ActWhereInput = {
    contract: {
      projectId,
      ...(filters.contractId ? { id: filters.contractId } : {}),
    },
  };
  if (filters.dateFrom) where.periodStart = { gte: new Date(filters.dateFrom) };
  if (filters.dateTo)   where.periodEnd   = { lte: new Date(filters.dateTo)   };

  const acts = await db.ks2Act.findMany({
    where,
    orderBy: { periodStart: 'desc' },
    take: 500,
    select: {
      number: true,
      periodStart: true,
      periodEnd: true,
      totalAmount: true,
      status: true,
      contract: { select: { number: true, name: true } },
    },
  });

  Array.from(acts.entries()).forEach(([i, a]) => {
    const row = sheet.addRow([
      i + 1,
      a.number,
      `${a.contract.number ?? ''} ${a.contract.name ?? ''}`.trim(),
      fmtDate(a.periodStart),
      fmtDate(a.periodEnd),
      a.totalAmount,
      a.status,
    ]);
    // Числовой формат для суммы
    row.getCell(6).numFmt = '#,##0.00';
  });

  sheet.addRow([]);
  const total = acts.reduce((s, a) => s + a.totalAmount, 0);
  const totalRow = sheet.addRow(['', '', '', '', 'ИТОГО:', total, '']);
  totalRow.getCell(5).font = { bold: true };
  totalRow.getCell(6).font = { bold: true };
  totalRow.getCell(6).numFmt = '#,##0.00';
}

/** gpr-deviations — Отклонения от графика производства работ */
async function generateGprDeviations(
  workbook: ExcelJS.Workbook,
  projectId: string,
  filters: ThematicFilters
): Promise<void> {
  const sheet = workbook.addWorksheet('Отклонения ГПР');

  sheet.columns = [
    { key: 'num',        width: 6  },
    { key: 'name',       width: 40 },
    { key: 'planStart',  width: 14 },
    { key: 'planEnd',    width: 14 },
    { key: 'factStart',  width: 14 },
    { key: 'factEnd',    width: 14 },
    { key: 'progress',   width: 12 },
    { key: 'deviation',  width: 16 },
    { key: 'isCritical', width: 14 },
  ];

  addSheetTitle(sheet, 'Отклонения от графика производства работ (ГПР)', 9, filters);

  const headerRow = sheet.addRow(['№', 'Работа', 'План от', 'План до', 'Факт от', 'Факт до', 'Прогресс, %', 'Откл., дн.', 'Критич.']);
  applyHeaderStyle(headerRow);

  const tasks = await db.ganttTask.findMany({
    where: { version: { projectId } },
    orderBy: { sortOrder: 'asc' },
    take: 500,
    select: {
      name: true,
      planStart: true,
      planEnd: true,
      factStart: true,
      factEnd: true,
      progress: true,
      isCritical: true,
    },
  });

  Array.from(tasks.entries()).forEach(([i, t]) => {
    // Отклонение в днях: фактический конец минус плановый конец
    // Положительное значение — задержка; отрицательное — опережение графика
    const deviationDays =
      t.factEnd && t.planEnd
        ? Math.ceil((t.factEnd.getTime() - t.planEnd.getTime()) / 86_400_000)
        : null;

    const row = sheet.addRow([
      i + 1,
      t.name,
      fmtDate(t.planStart),
      fmtDate(t.planEnd),
      fmtDate(t.factStart),
      fmtDate(t.factEnd),
      t.progress,
      deviationDays ?? '',
      t.isCritical ? 'Да' : 'Нет',
    ]);

    // Подсветить красным задачи с задержкой более 0 дней
    if (deviationDays !== null && deviationDays > 0) {
      row.getCell(8).font = { color: { argb: 'FFDC2626' }, bold: true };
    }
  });

  const summaryRow = sheet.addRow([`Итого задач: ${tasks.length}`]);
  summaryRow.getCell(1).font = { bold: true };
  sheet.mergeCells(`A${summaryRow.number}:I${summaryRow.number}`);
}

/** finance-payments — Оплаты по договорам */
async function generateFinancePayments(
  workbook: ExcelJS.Workbook,
  projectId: string,
  filters: ThematicFilters
): Promise<void> {
  const sheet = workbook.addWorksheet('Оплаты');

  sheet.columns = [
    { key: 'num',         width: 6  },
    { key: 'date',        width: 14 },
    { key: 'type',        width: 16 },
    { key: 'amount',      width: 18 },
    { key: 'contract',    width: 32 },
    { key: 'budgetType',  width: 22 },
    { key: 'description', width: 36 },
  ];

  addSheetTitle(sheet, 'Оплаты по договорам', 7, filters);

  const headerRow = sheet.addRow(['№', 'Дата', 'Тип', 'Сумма, ₽', 'Договор', 'Вид бюджета', 'Примечание']);
  applyHeaderStyle(headerRow);

  const where: Prisma.ContractPaymentWhereInput = {
    contract: {
      projectId,
      ...(filters.contractId ? { id: filters.contractId } : {}),
    },
  };
  if (filters.dateFrom || filters.dateTo) {
    where.paymentDate = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo   ? { lte: new Date(filters.dateTo)   } : {}),
    };
  }

  const payments = await db.contractPayment.findMany({
    where,
    orderBy: { paymentDate: 'asc' },
    take: 500,
    select: {
      paymentDate: true,
      paymentType: true,
      amount: true,
      budgetType: true,
      description: true,
      contract: { select: { number: true, name: true } },
    },
  });

  Array.from(payments.entries()).forEach(([i, p]) => {
    const row = sheet.addRow([
      i + 1,
      fmtDate(p.paymentDate),
      p.paymentType,
      p.amount,
      `${p.contract.number ?? ''} ${p.contract.name ?? ''}`.trim(),
      p.budgetType ?? '',
      p.description ?? '',
    ]);
    row.getCell(4).numFmt = '#,##0.00';
  });

  sheet.addRow([]);
  const total = payments.reduce((s, p) => s + p.amount, 0);
  const totalRow = sheet.addRow(['', '', 'ИТОГО:', total, '', '', '']);
  totalRow.getCell(3).font = { bold: true };
  totalRow.getCell(4).font = { bold: true };
  totalRow.getCell(4).numFmt = '#,##0.00';
}

/** sk-engineers-report — Активность инженеров строительного контроля */
async function generateSkEngineersReport(
  workbook: ExcelJS.Workbook,
  projectId: string,
  filters: ThematicFilters
): Promise<void> {
  const sheet = workbook.addWorksheet('Инженеры СК');

  sheet.columns = [
    { key: 'num',           width: 6  },
    { key: 'name',          width: 34 },
    { key: 'inspections',   width: 14 },
    { key: 'completed',     width: 14 },
    { key: 'defects',       width: 14 },
    { key: 'prescriptions', width: 14 },
  ];

  addSheetTitle(sheet, 'Работа инженеров строительного контроля', 6, filters);

  const headerRow = sheet.addRow(['№', 'Инженер СК', 'Проверок', 'Завершено', 'Дефектов', 'Предписаний']);
  applyHeaderStyle(headerRow);

  const dateFilter =
    filters.dateFrom || filters.dateTo
      ? {
          ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
          ...(filters.dateTo   ? { lte: new Date(filters.dateTo)   } : {}),
        }
      : undefined;

  const inspections = await db.inspection.findMany({
    where: {
      projectId,
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    },
    take: 500,
    select: {
      status: true,
      inspector: { select: { firstName: true, lastName: true } },
      _count: { select: { defects: true, prescriptions: true } },
    },
  });

  // Группировка по ФИО инспектора
  const byInspector = new Map<string, { name: string; total: number; completed: number; defects: number; prescriptions: number }>();
  for (const ins of inspections) {
    const name = `${ins.inspector.lastName} ${ins.inspector.firstName}`;
    const entry = byInspector.get(name) ?? { name, total: 0, completed: 0, defects: 0, prescriptions: 0 };
    entry.total++;
    if (ins.status === 'COMPLETED') entry.completed++;
    entry.defects += ins._count.defects;
    entry.prescriptions += ins._count.prescriptions;
    byInspector.set(name, entry);
  }

  Array.from(byInspector.values()).forEach((eng, i) => {
    sheet.addRow([i + 1, eng.name, eng.total, eng.completed, eng.defects, eng.prescriptions]);
  });

  const summaryRow = sheet.addRow([`Итого инженеров: ${byInspector.size} | Проверок: ${inspections.length}`]);
  summaryRow.getCell(1).font = { bold: true };
  sheet.mergeCells(`A${summaryRow.number}:F${summaryRow.number}`);
}

/** sk-signatures-report — Подписания исполнительных документов */
async function generateSkSignaturesReport(
  workbook: ExcelJS.Workbook,
  projectId: string,
  filters: ThematicFilters
): Promise<void> {
  const sheet = workbook.addWorksheet('Подписи ИД');

  sheet.columns = [
    { key: 'num',      width: 6  },
    { key: 'docNum',   width: 18 },
    { key: 'docType',  width: 22 },
    { key: 'signer',   width: 34 },
    { key: 'signedAt', width: 14 },
    { key: 'sigType',  width: 14 },
  ];

  addSheetTitle(sheet, 'Подписания документов (исполнительная документация)', 6, filters);

  const headerRow = sheet.addRow(['№', 'Номер документа', 'Тип документа', 'Подписант', 'Дата подписи', 'Тип подписи']);
  applyHeaderStyle(headerRow);

  const dateFilter =
    filters.dateFrom || filters.dateTo
      ? {
          ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
          ...(filters.dateTo   ? { lte: new Date(filters.dateTo)   } : {}),
        }
      : undefined;

  const signatures = await db.signature.findMany({
    where: {
      executionDoc: {
        contract: {
          projectId,
          ...(filters.contractId ? { id: filters.contractId } : {}),
        },
      },
      ...(dateFilter ? { signedAt: dateFilter } : {}),
    },
    orderBy: { signedAt: 'desc' },
    take: 500,
    select: {
      signedAt: true,
      signatureType: true,
      user: { select: { firstName: true, lastName: true } },
      executionDoc: { select: { number: true, type: true } },
    },
  });

  Array.from(signatures.entries()).forEach(([i, s]) => {
    sheet.addRow([
      i + 1,
      s.executionDoc.number,
      s.executionDoc.type,
      `${s.user.lastName} ${s.user.firstName}`,
      fmtDate(s.signedAt),
      s.signatureType,
    ]);
  });

  const summaryRow = sheet.addRow([`Итого подписей: ${signatures.length}`]);
  summaryRow.getCell(1).font = { bold: true };
  sheet.mergeCells(`A${summaryRow.number}:F${summaryRow.number}`);
}

/** funding-report — Исполнение финансирования по источникам */
async function generateFundingReport(
  workbook: ExcelJS.Workbook,
  projectId: string,
  filters: ThematicFilters
): Promise<void> {
  const sheet = workbook.addWorksheet('Финансирование');

  sheet.columns = [
    { key: 'num',      width: 6  },
    { key: 'year',     width: 8  },
    { key: 'type',     width: 16 },
    { key: 'total',    width: 18 },
    { key: 'federal',  width: 18 },
    { key: 'regional', width: 18 },
    { key: 'local',    width: 18 },
    { key: 'own',      width: 18 },
    { key: 'extra',    width: 18 },
  ];

  addSheetTitle(sheet, 'Исполнение финансирования', 9, filters);

  const headerRow = sheet.addRow(['№', 'Год', 'Тип', 'Итого, ₽', 'Федеральный, ₽', 'Региональный, ₽', 'Местный, ₽', 'Собственные, ₽', 'Внебюджетные, ₽']);
  applyHeaderStyle(headerRow);

  const records = await db.fundingRecord.findMany({
    where: { projectId },
    orderBy: [{ year: 'asc' }, { recordType: 'asc' }],
    take: 200,
  });

  const typeLabel = (t: string) => (t === 'ALLOCATED' ? 'Выделено' : 'Освоено');

  Array.from(records.entries()).forEach(([i, r]) => {
    const row = sheet.addRow([
      i + 1,
      r.year,
      typeLabel(r.recordType),
      r.totalAmount,
      r.federalBudget,
      r.regionalBudget,
      r.localBudget,
      r.ownFunds,
      r.extraBudget,
    ]);
    for (let col = 4; col <= 9; col++) {
      row.getCell(col).numFmt = '#,##0.00';
    }
  });

  sheet.addRow([]);
  const totalAllocated = records
    .filter((r) => r.recordType === 'ALLOCATED')
    .reduce((s, r) => s + r.totalAmount, 0);
  const totalDelivered = records
    .filter((r) => r.recordType === 'DELIVERED')
    .reduce((s, r) => s + r.totalAmount, 0);

  const allocRow = sheet.addRow(['', '', 'Выделено итого:', totalAllocated, '', '', '', '', '']);
  allocRow.getCell(3).font = { bold: true };
  allocRow.getCell(4).font = { bold: true };
  allocRow.getCell(4).numFmt = '#,##0.00';

  const delivRow = sheet.addRow(['', '', 'Освоено итого:', totalDelivered, '', '', '', '', '']);
  delivRow.getCell(3).font = { bold: true };
  delivRow.getCell(4).font = { bold: true };
  delivRow.getCell(4).numFmt = '#,##0.00';
}

// ─── Публичный API ───────────────────────────────────────────────────────────

/**
 * Генерирует тематический Excel-отчёт по slug-идентификатору.
 * Список slug соответствует значениям ThematicReportConfig.slug в БД.
 *
 * Поддерживаемые slug:
 *   defects-report       — Отчёт по недостаткам
 *   prescriptions-report — Предписания СК
 *   defects-by-object    — Пообъектный отчёт по недостаткам
 *   sk-engineers-report  — Отчёт о работе инженеров СК
 *   sk-signatures-report — Подписания документов СК
 *   work-volumes         — Объёмы выполненных работ
 *   ks2-summary          — Сводка КС-2
 *   gpr-deviation        — Отклонения ГПР
 *   payments-report      — Оплаты
 *   funding-report       — Исполнение финансирования
 */
export async function generateThematicXlsx(
  slug: string,
  projectId: string,
  filters: ThematicFilters
): Promise<Buffer> {
  logger.info({ slug, projectId }, 'Генерация тематического отчёта XLSX');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'StroyDocs';
  workbook.created = new Date();

  switch (slug) {
    // Отчёты по дефектам и предписаниям СК
    case 'defects-report':
    case 'defects-by-object': // пообъектный — те же данные, группировка на уровне UI
      await generateSkDefects(workbook, projectId, filters);
      break;

    case 'prescriptions-report':
      await generateSkPrescriptions(workbook, projectId, filters);
      break;

    case 'sk-engineers-report':
      await generateSkEngineersReport(workbook, projectId, filters);
      break;

    case 'sk-signatures-report':
      await generateSkSignaturesReport(workbook, projectId, filters);
      break;

    case 'work-volumes':
      await generateSmrWorkVolumes(workbook, projectId, filters);
      break;

    case 'ks2-summary':
      await generateKs2Summary(workbook, projectId, filters);
      break;

    case 'gpr-deviation':
      await generateGprDeviations(workbook, projectId, filters);
      break;

    case 'payments-report':
      await generateFinancePayments(workbook, projectId, filters);
      break;

    case 'funding-report':
      await generateFundingReport(workbook, projectId, filters);
      break;

    default: {
      // Неизвестный slug — возвращаем пустую книгу с сообщением
      logger.warn({ slug }, 'Тематический отчёт не реализован для данного slug');
      const sheet = workbook.addWorksheet('Не реализовано');
      sheet.addRow([`Отчёт "${slug}" ещё не реализован.`]);
      sheet.addRow(['Обратитесь к администратору StroyDocs.']);
      break;
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
