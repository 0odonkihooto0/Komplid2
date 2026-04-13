/**
 * Парсер Excel-шаблона ГПР (График Производства Работ).
 * Шаблон содержит колонки: № п/п, Наименование, Ед. изм., Количество,
 * Стоимость за единицу, Общая стоимость, План начало, План окончание.
 */
import ExcelJS from 'exceljs';

import type { ParsedTask, ParseResult } from './types';

/** Маппинг паттернов заголовков → ключи колонок */
const HEADER_PATTERNS: Record<string, RegExp> = {
  numCol: /^(№\s*п\/п|№)$/i,
  nameCol: /^(наименование|название)$/i,
  unitCol: /^(ед\.\s*изм\.|ед\.|единица)$/i,
  volumeCol: /^(количество|объ[её]м|кол-во)$/i,
  unitCostCol: /^(стоимость за единицу|цена)$/i,
  totalCostCol: /^(общая стоимость|итого|сумма)$/i,
  startCol: /^(план\s*начало|начало)$/i,
  endCol: /^(план\s*окончание|окончание)$/i,
};

/** Парсинг строковой даты формата "дд.мм.гггг" */
function parseDateStr(raw: string): Date | null {
  const m = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const [, day, month, year] = m;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

/** Извлечение Date из значения ячейки ExcelJS */
function extractDate(val: ExcelJS.CellValue): Date | null {
  if (val instanceof Date) return val;
  if (typeof val === 'string') return parseDateStr(val.trim());
  return null;
}

/** Извлечение числа из значения ячейки */
function extractNumber(val: ExcelJS.CellValue): number | null {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = parseFloat(val.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Строковое значение ячейки */
function cellText(val: ExcelJS.CellValue): string {
  if (val == null) return '';
  return String(val).trim();
}

/** Проверка: строка-итог (пропускаем) */
function isTotalRow(name: string): boolean {
  return /^(итого|всего)\b/i.test(name);
}

export async function parseGprExcel(buffer: Buffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { tasks: [], dependencies: [], warnings: ['Лист не найден в файле'] };

  const warnings: string[] = [];
  const cols: Record<string, number> = {};

  /* --- Поиск строки-заголовка (первые 5 строк) --- */
  let headerRowNum = 0;
  for (let r = 1; r <= Math.min(5, sheet.rowCount); r++) {
    const row = sheet.getRow(r);
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = cellText(cell.value).toLowerCase();
      if (text.includes('наименование')) headerRowNum = r;
      for (const [key, re] of Object.entries(HEADER_PATTERNS)) {
        if (re.test(cellText(cell.value)) && !cols[key]) {
          cols[key] = colNumber;
        }
      }
    });
    if (headerRowNum) break;
  }

  if (!headerRowNum || !cols['nameCol']) {
    return { tasks: [], dependencies: [], warnings: ['Не найдена строка заголовка с колонкой "Наименование"'] };
  }

  /* --- Обход строк данных --- */
  const tasks: ParsedTask[] = [];
  let taskIdx = 0;
  let currentParentId: string | null = null;
  const defaultStart = new Date();
  const defaultEnd = new Date(defaultStart.getTime() + 30 * 24 * 3600 * 1000);

  for (let r = headerRowNum + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const numVal = cols['numCol'] ? cellText(row.getCell(cols['numCol']).value) : '';
    const name = cols['nameCol'] ? cellText(row.getCell(cols['nameCol']).value) : '';

    if (!name) continue; // пустая строка
    if (isTotalRow(name)) continue; // строка итогов

    taskIdx++;
    const externalId = `excel_${taskIdx}`;
    const isWorkItem = /^\d+$/.test(numVal);
    const level = isWorkItem ? 1 : 0;

    /* Даты */
    let planStart = cols['startCol'] ? extractDate(row.getCell(cols['startCol']).value) : null;
    let planEnd = cols['endCol'] ? extractDate(row.getCell(cols['endCol']).value) : null;
    if (!planStart || !planEnd) {
      warnings.push(`Строка ${r}: отсутствуют даты, использованы значения по умолчанию`);
      planStart = planStart ?? defaultStart;
      planEnd = planEnd ?? defaultEnd;
    }

    /* Числовые поля */
    const rawVolume = cols['volumeCol'] ? extractNumber(row.getCell(cols['volumeCol']).value) : null;
    const rawUnit = cols['unitCol'] ? cellText(row.getCell(cols['unitCol']).value) : '';
    const rawUnitCost = cols['unitCostCol'] ? extractNumber(row.getCell(cols['unitCostCol']).value) : null;
    const rawTotalCost = cols['totalCostCol'] ? extractNumber(row.getCell(cols['totalCostCol']).value) : null;

    if (cols['volumeCol'] && rawVolume === null && cellText(row.getCell(cols['volumeCol']).value)) {
      warnings.push(`Строка ${r}: нечисловое значение в колонке "Количество"`);
    }

    /* Родительская связь */
    if (level === 0) {
      currentParentId = externalId;
    }

    tasks.push({
      externalId,
      name,
      planStart,
      planEnd,
      factStart: null,
      factEnd: null,
      progress: 0,
      level,
      parentExternalId: level === 1 ? currentParentId : null,
      volume: rawVolume ?? 100,
      volumeUnit: rawUnit || '%',
      unitCost: rawUnitCost,
      totalCost: rawTotalCost,
      isMilestone: false,
      totalFloat: null,
    });
  }

  return { tasks, dependencies: [], warnings };
}
