import ExcelJS from 'exceljs';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' }, bottom: { style: 'thin' },
  left: { style: 'thin' }, right: { style: 'thin' },
};

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' },
};

const CHAPTER_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF0FF' },
};

/**
 * Экспортирует версию сметы в Excel-шаблон формата ЦУС.
 * Лист «Смета» — позиции, лист «info» — инструкции.
 */
export async function exportVersionTemplate(versionId: string): Promise<Buffer> {
  logger.info({ versionId }, 'Экспорт версии сметы в Excel-шаблон');

  const version = await db.estimateVersion.findUniqueOrThrow({
    where: { id: versionId },
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
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'StroyDocs';
  workbook.created = new Date();

  // === Лист «Смета» ===
  const sheet = workbook.addWorksheet('Смета', {
    pageSetup: { orientation: 'landscape', fitToPage: true },
  });

  sheet.columns = [
    { key: 'num', width: 6 },
    { key: 'code', width: 14 },
    { key: 'name', width: 50 },
    { key: 'unit', width: 8 },
    { key: 'volume', width: 12 },
    { key: 'unitPrice', width: 14 },
    { key: 'totalPrice', width: 14 },
    { key: 'laborCost', width: 14 },
    { key: 'materialCost', width: 14 },
    { key: 'machineryCost', width: 14 },
  ];

  const TOTAL_COLS = 10;

  // Заголовок документа
  const titleRow = sheet.addRow([version.name]);
  titleRow.getCell(1).font = { bold: true, size: 14 };
  sheet.mergeCells(`A${titleRow.number}:J${titleRow.number}`);
  titleRow.height = 24;

  sheet.addRow([]);

  // Заголовки колонок
  const headerRow = sheet.addRow([
    '№', 'Код', 'Наименование', 'Ед.', 'Объём',
    'Цена за ед., \u20BD', 'Итого, \u20BD', 'ФОТ, \u20BD', 'Материалы, \u20BD', 'Механизмы, \u20BD',
  ]);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = HEADER_FILL;
    cell.border = THIN_BORDER;
    cell.alignment = { horizontal: 'center', wrapText: true };
  });
  headerRow.height = 36;

  let itemNum = 1;
  let grandTotal = 0;
  let grandLabor = 0;
  let grandMat = 0;
  let grandMach = 0;

  for (const chapter of version.chapters) {
    // Строка главы
    const chapterLabel = chapter.code ? `${chapter.code}. ${chapter.name}` : chapter.name;
    const chapterRow = sheet.addRow(['', '', chapterLabel, '', '', '', chapter.totalAmount ?? '', chapter.totalLabor ?? '', chapter.totalMat ?? '', '']);
    chapterRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      if (colNum <= TOTAL_COLS) {
        cell.font = { bold: true };
        cell.fill = CHAPTER_FILL;
      }
    });

    // Позиции главы
    for (const item of chapter.items) {
      const dataRow = sheet.addRow([
        itemNum++, item.code ?? '', item.name, item.unit ?? '',
        item.volume ?? '', item.unitPrice ?? '', item.totalPrice ?? '',
        item.laborCost ?? '', item.materialCost ?? '', item.machineryCost ?? '',
      ]);
      for (const col of ['E', 'F', 'G', 'H', 'I', 'J']) {
        const cell = dataRow.getCell(col);
        if (typeof cell.value === 'number') cell.numFmt = '#,##0.00';
      }
      grandTotal += item.totalPrice ?? 0;
      grandLabor += item.laborCost ?? 0;
      grandMat += item.materialCost ?? 0;
      grandMach += item.machineryCost ?? 0;
    }
  }

  // Итоговая строка
  sheet.addRow([]);
  const totalRow = sheet.addRow(['', '', 'ИТОГО:', '', '', '', grandTotal, grandLabor, grandMat, grandMach]);
  totalRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
    if (colNum <= TOTAL_COLS) {
      cell.font = { bold: true };
      cell.fill = HEADER_FILL;
    }
  });
  for (const col of ['G', 'H', 'I', 'J']) {
    totalRow.getCell(col).numFmt = '#,##0.00';
  }

  // === Лист «info» — инструкции ===
  const infoSheet = workbook.addWorksheet('info');
  infoSheet.columns = [{ key: 'text', width: 80 }];

  const instructions = [
    'Инструкция по заполнению шаблона сметы StroyDocs',
    '',
    'Лист «Смета» содержит текущие позиции сметы.',
    'Колонки: № — порядковый номер, Код — шифр по ГЭСН/ФЕР, Наименование — наименование работы/материала,',
    'Ед. — единица измерения, Объём — количество, Цена за ед. — единичная расценка,',
    'Итого — полная стоимость позиции, ФОТ — фонд оплаты труда,',
    'Материалы — стоимость материалов, Механизмы — стоимость эксплуатации машин.',
    '',
    'Для загрузки корректировки используйте функцию «Загрузить корректировку» в карточке версии сметы.',
  ];
  for (const line of instructions) {
    const row = infoSheet.addRow([line]);
    if (line.startsWith('Инструкция')) row.getCell(1).font = { bold: true, size: 12 };
  }

  const buf = await workbook.xlsx.writeBuffer();
  logger.info({ versionId, grandTotal }, 'Excel-шаблон сметы сформирован');
  return Buffer.from(buf);
}
