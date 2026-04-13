import ExcelJS from 'exceljs';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

/** Перевод статусов задач ГПР на русский */
const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Не начата',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершена',
  DELAYED: 'Задержка',
  ON_HOLD: 'Приостановлена',
};

/** Стиль заголовка */
const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD9D9D9' },
};
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true };

/** Формат даты DD.MM.YYYY */
function fmtDate(d: Date | null): string {
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

/** Строит иерархическую нумерацию (1, 1.1, 1.2, 2, 2.1...) */
function buildNumbering(
  tasks: Array<{ id: string; parentId: string | null; sortOrder: number }>,
): Map<string, string> {
  const numbering = new Map<string, string>();
  // Группируем по parentId
  const childrenMap = new Map<string | null, typeof tasks>();
  for (const t of tasks) {
    const key = t.parentId ?? null;
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(t);
  }

  function walk(parentId: string | null, prefix: string): void {
    const children = childrenMap.get(parentId) ?? [];
    // Сортировка по sortOrder внутри группы
    children.sort((a, b) => a.sortOrder - b.sortOrder);
    let idx = 1;
    for (const child of children) {
      const num = prefix ? `${prefix}.${idx}` : String(idx);
      numbering.set(child.id, num);
      walk(child.id, num);
      idx++;
    }
  }
  walk(null, '');
  return numbering;
}

/**
 * Экспорт ГПР в Excel (один лист с задачами).
 */
export async function exportGprToExcel(versionId: string): Promise<Buffer> {
  logger.info({ versionId }, 'Экспорт ГПР в Excel');

  const tasks = await db.ganttTask.findMany({
    where: { versionId },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true, name: true, level: true, sortOrder: true,
      planStart: true, planEnd: true, factStart: true, factEnd: true,
      progress: true, status: true, volume: true, volumeUnit: true,
      amount: true, parentId: true, isCritical: true,
    },
  });

  const numbering = buildNumbering(tasks);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'StroyDocs';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('ГПР', {
    pageSetup: { orientation: 'landscape', fitToPage: true },
  });

  sheet.columns = [
    { key: 'num', header: '№', width: 10 },
    { key: 'name', header: 'Наименование', width: 40 },
    { key: 'unit', header: 'Ед. изм.', width: 10 },
    { key: 'volume', header: 'Количество', width: 12 },
    { key: 'unitCost', header: 'Стоимость за ед. ₽', width: 18 },
    { key: 'amount', header: 'Общая стоимость ₽', width: 18 },
    { key: 'planStart', header: 'План начало', width: 14 },
    { key: 'planEnd', header: 'План окончание', width: 14 },
    { key: 'factStart', header: 'Факт начало', width: 14 },
    { key: 'factEnd', header: 'Факт окончание', width: 14 },
    { key: 'progress', header: 'Прогресс %', width: 12 },
    { key: 'status', header: 'Статус', width: 16 },
  ];

  // Стиль заголовка
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: 'center' };
  });

  // Суммарная стоимость
  let totalAmount = 0;

  for (const t of tasks) {
    const unitCost = t.volume && t.amount ? Math.round((t.amount / t.volume) * 100) / 100 : null;
    const row = sheet.addRow({
      num: numbering.get(t.id) ?? '',
      name: t.name,
      unit: t.volumeUnit ?? '',
      volume: t.volume,
      unitCost,
      amount: t.amount,
      planStart: fmtDate(t.planStart),
      planEnd: fmtDate(t.planEnd),
      factStart: fmtDate(t.factStart),
      factEnd: fmtDate(t.factEnd),
      progress: Math.round(t.progress),
      status: STATUS_LABELS[t.status] ?? t.status,
    });

    // Форматирование денежных колонок
    row.getCell('unitCost').numFmt = '#,##0.00';
    row.getCell('amount').numFmt = '#,##0.00';

    // Секции (level 0): жирный шрифт + серый фон
    if (t.level === 0) {
      row.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = HEADER_FILL;
      });
    }

    totalAmount += t.amount ?? 0;
  }

  // Итоговая строка
  const totalsRow = sheet.addRow({ num: '', name: 'Итого', amount: totalAmount });
  totalsRow.font = { bold: true };
  totalsRow.getCell('amount').numFmt = '#,##0.00';

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Экспорт ГПР в Excel с дополнительным листом зависимостей.
 */
export async function exportGprToExcelWithDeps(versionId: string): Promise<Buffer> {
  logger.info({ versionId }, 'Экспорт ГПР в Excel с зависимостями');

  // Основной лист — переиспользуем логику exportGprToExcel,
  // но нужен доступ к workbook, поэтому дублируем запрос
  const tasks = await db.ganttTask.findMany({
    where: { versionId },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true, name: true, level: true, sortOrder: true,
      planStart: true, planEnd: true, factStart: true, factEnd: true,
      progress: true, status: true, volume: true, volumeUnit: true,
      amount: true, parentId: true, isCritical: true,
    },
  });

  const deps = await db.ganttDependency.findMany({
    where: { predecessor: { versionId } },
    include: {
      predecessor: { select: { name: true } },
      successor: { select: { name: true } },
    },
  });

  const numbering = buildNumbering(tasks);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'StroyDocs';
  workbook.created = new Date();

  // ── Лист 1: ГПР ─────────────────────────────────────────────────
  const sheet = workbook.addWorksheet('ГПР', {
    pageSetup: { orientation: 'landscape', fitToPage: true },
  });

  sheet.columns = [
    { key: 'num', header: '№', width: 10 },
    { key: 'name', header: 'Наименование', width: 40 },
    { key: 'unit', header: 'Ед. изм.', width: 10 },
    { key: 'volume', header: 'Количество', width: 12 },
    { key: 'unitCost', header: 'Стоимость за ед. ₽', width: 18 },
    { key: 'amount', header: 'Общая стоимость ₽', width: 18 },
    { key: 'planStart', header: 'План начало', width: 14 },
    { key: 'planEnd', header: 'План окончание', width: 14 },
    { key: 'factStart', header: 'Факт начало', width: 14 },
    { key: 'factEnd', header: 'Факт окончание', width: 14 },
    { key: 'progress', header: 'Прогресс %', width: 12 },
    { key: 'status', header: 'Статус', width: 16 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: 'center' };
  });

  let totalAmount = 0;
  for (const t of tasks) {
    const unitCost = t.volume && t.amount ? Math.round((t.amount / t.volume) * 100) / 100 : null;
    const row = sheet.addRow({
      num: numbering.get(t.id) ?? '',
      name: t.name,
      unit: t.volumeUnit ?? '',
      volume: t.volume,
      unitCost,
      amount: t.amount,
      planStart: fmtDate(t.planStart),
      planEnd: fmtDate(t.planEnd),
      factStart: fmtDate(t.factStart),
      factEnd: fmtDate(t.factEnd),
      progress: Math.round(t.progress),
      status: STATUS_LABELS[t.status] ?? t.status,
    });
    row.getCell('unitCost').numFmt = '#,##0.00';
    row.getCell('amount').numFmt = '#,##0.00';
    if (t.level === 0) {
      row.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = HEADER_FILL;
      });
    }
    totalAmount += t.amount ?? 0;
  }
  const totalsRow = sheet.addRow({ num: '', name: 'Итого', amount: totalAmount });
  totalsRow.font = { bold: true };
  totalsRow.getCell('amount').numFmt = '#,##0.00';

  // ── Лист 2: Зависимости ──────────────────────────────────────────
  const depSheet = workbook.addWorksheet('Зависимости');
  depSheet.columns = [
    { key: 'predecessor', header: 'Предшественник', width: 40 },
    { key: 'successor', header: 'Последователь', width: 40 },
    { key: 'type', header: 'Тип связи', width: 12 },
    { key: 'lag', header: 'Задержка (дн.)', width: 14 },
  ];

  const depHeaderRow = depSheet.getRow(1);
  depHeaderRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: 'center' };
  });

  for (const d of deps) {
    depSheet.addRow({
      predecessor: d.predecessor.name,
      successor: d.successor.name,
      type: d.type,
      lag: d.lagDays,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
