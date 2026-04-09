import ExcelJS from 'exceljs';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Экспортирует смету контракта в формат xlsx.
 * Структура листа:
 * - Заголовок (название сметы контракта)
 * - Заголовки колонок
 * - Главы (жирный шрифт, объединённые ячейки)
 * - Позиции внутри глав
 * - Итоговая строка
 *
 * Колонки: №, Наименование, Ед., Объём, Цена за ед., Итого, ФОТ, Материалы
 */
export async function exportContractToExcel(contractId: string): Promise<Buffer> {
  logger.info({ contractId }, 'Экспорт сметы контракта в Excel');

  const estimateContract = await db.estimateContract.findFirst({
    where: { contractId },
    include: {
      versions: {
        orderBy: { order: 'asc' },
        include: {
          estimateVersion: {
            include: {
              chapters: {
                orderBy: { order: 'asc' },
                include: {
                  items: {
                    where: { isDeleted: false },
                    orderBy: { sortOrder: 'asc' },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'StroyDocs';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Смета контракта', {
    pageSetup: { orientation: 'landscape', fitToPage: true },
  });

  // Ширина колонок
  sheet.columns = [
    { key: 'num', width: 6 },
    { key: 'name', width: 50 },
    { key: 'unit', width: 8 },
    { key: 'volume', width: 10 },
    { key: 'unitPrice', width: 14 },
    { key: 'totalPrice', width: 14 },
    { key: 'laborCost', width: 14 },
    { key: 'materialCost', width: 14 },
  ];

  const TOTAL_COLS = 8;

  // Заголовок документа
  const titleRow = sheet.addRow([estimateContract?.name ?? 'Смета контракта']);
  titleRow.getCell(1).font = { bold: true, size: 14 };
  sheet.mergeCells(`A${titleRow.number}:H${titleRow.number}`);
  titleRow.height = 24;

  sheet.addRow([]); // пустая строка

  // Заголовки колонок
  const headerRow = sheet.addRow([
    '№',
    'Наименование',
    'Ед.',
    'Объём',
    'Цена за ед., ₽',
    'Итого, ₽',
    'ФОТ, ₽',
    'Материалы, ₽',
  ]);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
    cell.alignment = { horizontal: 'center', wrapText: true };
  });
  headerRow.height = 36;

  let itemNum = 1;
  let grandTotal = 0;
  let grandLabor = 0;
  let grandMat = 0;

  if (!estimateContract) {
    // Нет данных — пустой файл с заголовком
    const bufferEmpty = await workbook.xlsx.writeBuffer();
    return Buffer.from(bufferEmpty);
  }

  for (const ecv of estimateContract.versions) {
    const version = ecv.estimateVersion;

    // Заголовок версии (секция)
    const versionRow = sheet.addRow([`Смета: ${version.name}`]);
    versionRow.getCell(1).font = { bold: true, italic: true, color: { argb: 'FF2563EB' } };
    sheet.mergeCells(`A${versionRow.number}:H${versionRow.number}`);

    for (const chapter of version.chapters) {
      // Строка главы — жирный шрифт, серый фон
      const chapterLabel = chapter.code
        ? `${chapter.code}. ${chapter.name}`
        : chapter.name;
      const chapterRow = sheet.addRow([
        '',
        chapterLabel,
        '',
        '',
        '',
        chapter.totalAmount ?? '',
        chapter.totalLabor ?? '',
        chapter.totalMat ?? '',
      ]);
      chapterRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        if (colNum <= TOTAL_COLS) {
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEBF0FF' },
          };
        }
      });
      // Числовой формат для суммовых колонок главы
      ['F', 'G', 'H'].forEach((col) => {
        const cell = chapterRow.getCell(col);
        if (typeof cell.value === 'number') {
          cell.numFmt = '#,##0.00';
        }
      });

      // Позиции главы
      for (const item of chapter.items) {
        const dataRow = sheet.addRow([
          itemNum++,
          item.name,
          item.unit ?? '',
          item.volume ?? '',
          item.unitPrice ?? '',
          item.totalPrice ?? '',
          item.laborCost ?? '',
          item.materialCost ?? '',
        ]);

        // Числовой формат для числовых ячеек
        ['D', 'E', 'F', 'G', 'H'].forEach((col) => {
          const cell = dataRow.getCell(col);
          if (typeof cell.value === 'number') {
            cell.numFmt = '#,##0.00';
          }
        });

        grandTotal += item.totalPrice ?? 0;
        grandLabor += item.laborCost ?? 0;
        grandMat += item.materialCost ?? 0;
      }
    }
  }

  // Итоговая строка
  sheet.addRow([]);
  const totalRow = sheet.addRow([
    '',
    'ИТОГО ПО СМЕТЕ КОНТРАКТА:',
    '',
    '',
    '',
    grandTotal,
    grandLabor,
    grandMat,
  ]);
  totalRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
    if (colNum <= TOTAL_COLS) {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' },
      };
    }
  });
  ['F', 'G', 'H'].forEach((col) => {
    const cell = totalRow.getCell(col);
    cell.numFmt = '#,##0.00';
  });

  const buffer = await workbook.xlsx.writeBuffer();
  logger.info({ contractId, grandTotal }, 'Экспорт завершён');

  return Buffer.from(buffer);
}
