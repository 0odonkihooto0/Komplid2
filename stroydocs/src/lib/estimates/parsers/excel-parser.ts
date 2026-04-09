import ExcelJS from 'exceljs';
import type { ParsedEstimateItem } from '../types';
import { logger } from '@/lib/logger';
import {
  sanitizeCell,
  formatCellValue,
  parseNumericCell,
  removeEmptyRowsAndCols,
  trimHeadersToData,
  filterEstimateRows,
  findEstimateHeaders,
} from './excel-parser-utils';

export { sanitizeCell, removeEmptyRowsAndCols } from './excel-parser-utils';

/** Максимальная длина текста для одного запроса к YandexGPT (~6000 токенов ≈ 18000 символов) */
const MAX_CHUNK_LENGTH = 16000;

/** Результат предобработки Excel-файла для чанкования на фронтенде */
export interface ExcelExtractResult {
  headers: string[];
  rows: string[][];
  totalRows: number;
  sheetName: string;
}

/**
 * Извлекает очищенные данные из Excel-файла.
 * Используется для нового конвейера: бэкенд готовит 2D-массив,
 * фронтенд делит его на чанки по 20 строк и последовательно отправляет в GPT.
 */
export async function extractExcelData(buffer: Buffer): Promise<ExcelExtractResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { headers: [], rows: [], totalRows: 0, sheetName: '' };
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = sanitizeCell(formatCellValue(cell.value));
  });

  const rawRows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 1) return;
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      cells.push(sanitizeCell(formatCellValue(cell.value)));
    });
    rawRows.push(cells);
  });

  const cleanedRows = removeEmptyRowsAndCols(rawRows);
  const cleanedHeaders = trimHeadersToData(headers, cleanedRows);
  const filteredRows = filterEstimateRows(cleanedRows, cleanedHeaders);

  logger.info(
    {
      sheet: sheet.name,
      headers: cleanedHeaders.length,
      rowsBefore: cleanedRows.length,
      rowsAfter: filteredRows.length,
    },
    'Excel данные извлечены для чанкования'
  );

  return {
    headers: cleanedHeaders,
    rows: filteredRows,
    totalRows: filteredRows.length,
    sheetName: sheet.name,
  };
}

/** Извлечение текста из Excel-файла для отправки в YandexGPT (старый конвейер, для PDF/резерв) */
export async function extractExcelText(buffer: Buffer): Promise<string[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const chunks: string[] = [];
  let currentChunk = '';

  workbook.eachSheet((worksheet) => {
    const sheetName = worksheet.name;
    const sheetHeader = `\n=== Лист: ${sheetName} ===\n`;

    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber] = sanitizeCell(String(cell.value || `Кол${colNumber}`));
    });

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber] || `Кол${colNumber}`;
        const value = sanitizeCell(formatCellValue(cell.value));
        if (value) {
          cells.push(`${header}: ${value}`);
        }
      });

      if (cells.length === 0) return;

      const rowText = `Строка ${rowNumber}: ${cells.join(' | ')}\n`;

      if (currentChunk.length + rowText.length > MAX_CHUNK_LENGTH) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
        }
        currentChunk = sheetHeader + rowText;
      } else {
        if (currentChunk.length === 0) {
          currentChunk = sheetHeader;
        }
        currentChunk += rowText;
      }
    });
  });

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  logger.info(
    { sheetsCount: workbook.worksheets.length, chunksCount: chunks.length },
    'Excel-файл извлечён в текст'
  );

  return chunks;
}

/** Попытка прямого парсинга таблицы Excel без GPT (если структура очевидна) */
export function tryDirectExcelParse(buffer: Buffer): Promise<ParsedEstimateItem[] | null> {
  return new Promise(async (resolve) => {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

      const sheet = workbook.worksheets[0];
      if (!sheet) {
        resolve(null);
        return;
      }

      const headerRow = sheet.getRow(1);
      const headerMap = findEstimateHeaders(headerRow);

      if (!headerMap.name) {
        resolve(null);
        return;
      }

      const items: ParsedEstimateItem[] = [];
      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber <= 1) return;

        const name = sanitizeCell(String(row.getCell(headerMap.name!).value || '').trim());
        if (!name || name.length < 2) return;

        items.push({
          sortOrder: items.length + 1,
          rawName: name,
          rawUnit: headerMap.unit
            ? sanitizeCell(String(row.getCell(headerMap.unit).value || '').trim()) || null
            : null,
          volume: headerMap.volume
            ? parseNumericCell(row.getCell(headerMap.volume).value)
            : null,
          price: headerMap.price
            ? parseNumericCell(row.getCell(headerMap.price).value)
            : null,
          total: headerMap.total
            ? parseNumericCell(row.getCell(headerMap.total).value)
            : null,
          itemType: 'WORK',
        });
      });

      resolve(items.length > 0 ? items : null);
    } catch {
      resolve(null);
    }
  });
}
