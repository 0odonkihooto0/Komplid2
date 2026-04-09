import ExcelJS from 'exceljs';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

const RU_MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

/** Преобразует "2025-01" → "Янв 2025" */
function monthLabel(year: number, month: number): string {
  return `${RU_MONTHS[month - 1]} ${year}`;
}

/**
 * Экспортирует план освоения версии ГПР в формат xlsx.
 *
 * Лист 1 «Суммы»:  помесячный план в рублях (колонки: Месяц, Плановая сумма ₽).
 * Лист 2 «Объёмы»: помесячный план по объёмам работ (колонки: Месяц, Объём, Ед.изм.).
 */
export async function exportMasteringToExcel(
  versionId: string,
  year: number,
): Promise<Buffer> {
  logger.info({ versionId, year }, 'Экспорт плана освоения ГПР в Excel');

  // Загружаем задачи версии с необходимыми полями
  const tasks = await db.ganttTask.findMany({
    where: { versionId },
    select: {
      name: true,
      planStart: true,
      planEnd: true,
      amount: true,
      volume: true,
      volumeUnit: true,
    },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'StroyDocs';
  workbook.created = new Date();

  // ── Стиль заголовка ──────────────────────────────────────────────────────────
  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9D9D9' },
  };
  const headerFont: Partial<ExcelJS.Font> = { bold: true };

  // ── Лист 1: Суммы ────────────────────────────────────────────────────────────
  const sheetAmounts = workbook.addWorksheet('Суммы', {
    pageSetup: { orientation: 'portrait', fitToPage: true },
  });

  sheetAmounts.columns = [
    { key: 'month', width: 14 },
    { key: 'plan', width: 20 },
  ];

  // Заголовок
  const amountsHeader = sheetAmounts.addRow(['Месяц', 'Плановая сумма, ₽']);
  amountsHeader.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center' };
  });

  let totalPlan = 0;

  // Строки по месяцам
  for (let m = 1; m <= 12; m++) {
    const monthStart = new Date(year, m - 1, 1);
    const monthEnd = new Date(year, m, 0, 23, 59, 59, 999);

    // Задачи, чей плановый период пересекается с месяцем
    const planAmount = tasks
      .filter(
        (t) =>
          t.planStart !== null &&
          t.planEnd !== null &&
          t.planStart <= monthEnd &&
          t.planEnd >= monthStart,
      )
      .reduce((sum, t) => sum + (t.amount ?? 0), 0);

    totalPlan += planAmount;

    const row = sheetAmounts.addRow([monthLabel(year, m), planAmount]);
    row.getCell(2).numFmt = '#,##0.00';
    row.getCell(2).alignment = { horizontal: 'right' };
  }

  // Итого
  const totalAmountsRow = sheetAmounts.addRow(['Итого', totalPlan]);
  totalAmountsRow.font = { bold: true };
  totalAmountsRow.getCell(2).numFmt = '#,##0.00';
  totalAmountsRow.getCell(2).alignment = { horizontal: 'right' };

  // ── Лист 2: Объёмы ───────────────────────────────────────────────────────────
  const sheetVolumes = workbook.addWorksheet('Объёмы', {
    pageSetup: { orientation: 'portrait', fitToPage: true },
  });

  sheetVolumes.columns = [
    { key: 'month', width: 14 },
    { key: 'volume', width: 16 },
    { key: 'unit', width: 12 },
  ];

  // Заголовок
  const volumesHeader = sheetVolumes.addRow(['Месяц', 'Объём работ', 'Ед. изм.']);
  volumesHeader.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center' };
  });

  let totalVolume = 0;

  for (let m = 1; m <= 12; m++) {
    const monthStart = new Date(year, m - 1, 1);
    const monthEnd = new Date(year, m, 0, 23, 59, 59, 999);

    // Задачи с объёмом, чей период пересекается с месяцем
    const activeTasks = tasks.filter(
      (t) =>
        t.planStart !== null &&
        t.planEnd !== null &&
        t.planStart <= monthEnd &&
        t.planEnd >= monthStart &&
        t.volume !== null,
    );

    const volume = activeTasks.reduce((sum, t) => sum + (t.volume ?? 0), 0);
    // Ед. изм. — из первой задачи с ненулевым объёмом (или пусто)
    const unit = activeTasks.find((t) => t.volumeUnit)?.volumeUnit ?? '';

    totalVolume += volume;

    const row = sheetVolumes.addRow([monthLabel(year, m), volume, unit]);
    row.getCell(2).numFmt = '#,##0.00';
    row.getCell(2).alignment = { horizontal: 'right' };
  }

  // Итого
  const totalVolumesRow = sheetVolumes.addRow(['Итого', totalVolume, '']);
  totalVolumesRow.font = { bold: true };
  totalVolumesRow.getCell(2).numFmt = '#,##0.00';
  totalVolumesRow.getCell(2).alignment = { horizontal: 'right' };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
