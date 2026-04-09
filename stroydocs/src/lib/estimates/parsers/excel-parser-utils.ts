import ExcelJS from 'exceljs';

/** Управляющие символы, которые ломают JSON-парсинг */
const CONTROL_CHARS_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Очистка значения ячейки:
 * - удаляет управляющие символы (ломают JSON)
 * - нормализует множественные пробелы
 */
export function sanitizeCell(value: string): string {
  return value
    .replace(CONTROL_CHARS_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatCellValue(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && value !== null && 'result' in (value as unknown as Record<string, unknown>)) {
    return String((value as unknown as { result: unknown }).result ?? '');
  }
  return String(value);
}

export function parseNumericCell(value: ExcelJS.CellValue): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const str = String(value).replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Удаляет строки и колонки, где все ячейки пустые.
 * Предотвращает отправку мусора в AI.
 */
export function removeEmptyRowsAndCols(rows: string[][]): string[][] {
  if (rows.length === 0) return rows;

  const maxCols = Math.max(...rows.map((r) => r.length));

  const nonEmptyCols: number[] = [];
  for (let col = 0; col < maxCols; col++) {
    const hasValue = rows.some((row) => (row[col] || '').trim().length > 0);
    if (hasValue) nonEmptyCols.push(col);
  }

  return rows
    .filter((row) => row.some((cell) => (cell || '').trim().length > 0))
    .map((row) => nonEmptyCols.map((col) => row[col] || ''));
}

/** Обрезает заголовки до реального числа колонок в данных */
export function trimHeadersToData(headers: string[], rows: string[][]): string[] {
  if (rows.length === 0) return headers;
  const maxCols = Math.max(...rows.map((r) => r.length));
  return headers.slice(0, maxCols);
}

/** Ищет индекс колонки с объёмом/количеством по заголовкам */
export function findVolumeColumnIndex(headers: string[]): number | null {
  const volumePatterns = ['объем', 'объём', 'кол-во', 'количество', 'volume', 'qty', 'кол.'];
  for (let i = 0; i < headers.length; i++) {
    const h = (headers[i] || '').toLowerCase();
    if (volumePatterns.some((p) => h.includes(p))) return i;
  }
  return null;
}

/**
 * Программная фильтрация строк сметы перед отправкой в AI.
 * Убирает итоговые строки, заголовки разделов и строки без данных.
 */
export function filterEstimateRows(rows: string[][], headers: string[]): string[][] {
  const volumeColIdx = findVolumeColumnIndex(headers);

  const serviceKeywords = [
    'итого', 'всего', 'в т.ч.', 'ндс', 'накладные', 'прибыль',
    'непредвиденные', 'лимитированные', 'временные', 'итог', 'total',
    'сметная прибыль', 'накладные расходы', 'коэффициент',
  ];

  return rows.filter((row) => {
    const firstCell = (row[0] || '').toLowerCase().trim();
    const allText = row.join(' ').toLowerCase();

    if (
      serviceKeywords.some(
        (kw) =>
          firstCell.includes(kw) ||
          (allText.includes(kw) && !row.some((cell) => /^\d/.test(cell.trim())))
      )
    ) {
      return false;
    }

    if (volumeColIdx !== null) {
      const volumeCell = (row[volumeColIdx] || '').replace(/\s/g, '').replace(',', '.');
      const volume = parseFloat(volumeCell);
      if (!isNaN(volume) && volume === 0) return false;
      if (!volumeCell && !row.some((cell) => /\d/.test(cell))) return false;
    }

    return row.some((cell) => cell.trim().length > 3);
  });
}

export interface HeaderMap {
  name: number | null;
  unit: number | null;
  volume: number | null;
  price: number | null;
  total: number | null;
}

/** Поиск заголовков сметной таблицы */
export function findEstimateHeaders(row: ExcelJS.Row): HeaderMap {
  const map: HeaderMap = { name: null, unit: null, volume: null, price: null, total: null };

  const namePatterns = ['наименование', 'название', 'работ', 'name'];
  const unitPatterns = ['ед', 'единица', 'изм', 'unit'];
  const volumePatterns = ['объем', 'объём', 'кол-во', 'количество', 'volume', 'qty'];
  const pricePatterns = ['цена', 'стоимость ед', 'расценка', 'price'];
  const totalPatterns = ['сумма', 'итого', 'стоимость', 'total', 'amount'];

  row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const val = String(cell.value || '').toLowerCase();

    if (!map.name && namePatterns.some((p) => val.includes(p))) map.name = colNumber;
    if (!map.unit && unitPatterns.some((p) => val.includes(p))) map.unit = colNumber;
    if (!map.volume && volumePatterns.some((p) => val.includes(p))) map.volume = colNumber;
    if (!map.price && pricePatterns.some((p) => val.includes(p))) map.price = colNumber;
    if (!map.total && totalPatterns.some((p) => val.includes(p))) map.total = colNumber;
  });

  return map;
}
