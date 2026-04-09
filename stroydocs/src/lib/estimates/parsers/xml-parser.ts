import { parseStringPromise } from 'xml2js';
import { EstimateFormat } from '@prisma/client';
import { detectXmlFormat } from '../detect-format';
import type { ParseResult, ParsedEstimateItem } from '../types';
import { logger } from '@/lib/logger';

/** Парсинг XML сметы (Гранд-Смета или РИК) — без GPT */
export async function parseXmlEstimate(buffer: Buffer): Promise<ParseResult> {
  const xmlContent = buffer.toString('utf-8');
  const format = detectXmlFormat(xmlContent);
  const parsed = await parseStringPromise(xmlContent, {
    explicitArray: false,
    ignoreAttrs: false,
    trim: true,
  });

  if (format === EstimateFormat.XML_RIK) {
    return parseRikXml(parsed);
  }
  return parseGrandSmetaXml(parsed);
}

/** Парсинг XML формата Гранд-Смета */
function parseGrandSmetaXml(data: Record<string, unknown>): ParseResult {
  const items: ParsedEstimateItem[] = [];
  const warnings: string[] = [];

  try {
    // Гранд-Смета: корневой элемент Estimate > Section > Row
    const estimate = (data as Record<string, Record<string, unknown>>)['Estimate'] ||
      (data as Record<string, Record<string, unknown>>)['estimate'] ||
      (data as Record<string, Record<string, unknown>>)['DocumentBody'];

    if (!estimate) {
      // Пробуем найти позиции в произвольной структуре
      const rows = findRowsRecursive(data);
      return processRows(rows);
    }

    const sections = normalizeToArray(
      (estimate as Record<string, unknown>)['Section'] ||
      (estimate as Record<string, unknown>)['section'] ||
      (estimate as Record<string, unknown>)['Chapter']
    );

    for (const section of sections) {
      const rows = normalizeToArray(
        (section as Record<string, unknown>)['Row'] ||
        (section as Record<string, unknown>)['row'] ||
        (section as Record<string, unknown>)['Item'] ||
        (section as Record<string, unknown>)['Position']
      );

      for (const row of rows) {
        const item = extractItemFromRow(row as Record<string, unknown>, items.length + 1);
        if (item) {
          items.push(item);
        }
      }
    }

    if (items.length === 0) {
      // Fallback: рекурсивный поиск позиций
      const rows = findRowsRecursive(data);
      return processRows(rows);
    }
  } catch (error) {
    logger.error({ error }, 'Ошибка парсинга Гранд-Смета XML');
    warnings.push('Частичная ошибка парсинга XML');
  }

  // Убираем позиции с нулевым объёмом и без наименования
  const validItems = items.filter(
    (item) => !(item.volume !== null && item.volume === 0) && item.rawName && item.rawName.trim().length >= 2
  );
  return { items: validItems, warnings };
}

/** Парсинг XML формата РИК */
function parseRikXml(data: Record<string, unknown>): ParseResult {
  const items: ParsedEstimateItem[] = [];
  const warnings: string[] = [];

  try {
    // РИК: rik:Smeta > rik:Section > rik:Position
    const root = findKeyContaining(data, 'Smeta') || findKeyContaining(data, 'smeta');
    if (!root) {
      warnings.push('Не найден корневой элемент РИК');
      return { items, warnings };
    }

    const sections = normalizeToArray(
      findKeyContaining(root as Record<string, unknown>, 'Section') ||
      findKeyContaining(root as Record<string, unknown>, 'section')
    );

    for (const section of sections) {
      const positions = normalizeToArray(
        findKeyContaining(section as Record<string, unknown>, 'Position') ||
        findKeyContaining(section as Record<string, unknown>, 'position') ||
        findKeyContaining(section as Record<string, unknown>, 'Row')
      );

      for (const pos of positions) {
        const item = extractItemFromRow(pos as Record<string, unknown>, items.length + 1);
        if (item) {
          items.push(item);
        }
      }
    }
  } catch (error) {
    logger.error({ error }, 'Ошибка парсинга РИК XML');
    warnings.push('Частичная ошибка парсинга РИК XML');
  }

  // Убираем позиции с нулевым объёмом и без наименования
  const validItems = items.filter(
    (item) => !(item.volume !== null && item.volume === 0) && item.rawName && item.rawName.trim().length >= 2
  );
  return { items: validItems, warnings };
}

/** Извлечение позиции из строки XML */
function extractItemFromRow(
  row: Record<string, unknown>,
  defaultOrder: number
): ParsedEstimateItem | null {
  const name = extractText(row, ['Name', 'name', 'Наименование', 'Title', 'WorkName']);
  if (!name) return null;

  return {
    sortOrder: parseFloat(String(extractText(row, ['Number', 'Num', 'number', 'num']) || '')) || defaultOrder,
    rawName: name,
    rawUnit: extractText(row, ['Unit', 'unit', 'Единица', 'MeasureUnit']),
    volume: parseNumeric(extractText(row, ['Volume', 'volume', 'Quantity', 'quantity', 'Объем', 'Count'])),
    price: parseNumeric(extractText(row, ['Price', 'price', 'UnitPrice', 'Цена', 'Cost'])),
    total: parseNumeric(extractText(row, ['Total', 'total', 'Sum', 'sum', 'Сумма', 'Amount'])),
    itemType: 'WORK' as const, // XML-сметы содержат только работы
  };
}

// === Вспомогательные функции ===

function normalizeToArray(val: unknown): unknown[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function extractText(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const val = obj[key];
    if (val !== undefined && val !== null) {
      // xml2js может вернуть объект с _ (текст) и $ (атрибуты)
      if (typeof val === 'object' && val !== null && '_' in (val as Record<string, unknown>)) {
        return String((val as Record<string, unknown>)['_']).trim();
      }
      return String(val).trim();
    }
  }
  return null;
}

function parseNumeric(val: string | null): number | null {
  if (!val) return null;
  const cleaned = val.replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function findKeyContaining(obj: Record<string, unknown>, substring: string): unknown {
  for (const key of Object.keys(obj)) {
    if (key.toLowerCase().includes(substring.toLowerCase())) {
      return obj[key];
    }
  }
  return null;
}

/** Рекурсивный поиск массивов строк в произвольной XML-структуре */
function findRowsRecursive(obj: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 10 || !obj || typeof obj !== 'object') return [];

  const results: Record<string, unknown>[] = [];

  for (const [, value] of Object.entries(obj as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      // Проверяем, содержит ли массив объекты с полями, похожими на позиции сметы
      const hasNameField = value.some(
        (item) =>
          typeof item === 'object' &&
          item !== null &&
          Object.keys(item).some((k) =>
            ['Name', 'name', 'Наименование', 'Title'].includes(k)
          )
      );
      if (hasNameField) {
        results.push(...(value as Record<string, unknown>[]));
      }
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      results.push(...findRowsRecursive(value, depth + 1));
    }
  }

  return results;
}

function processRows(rows: Record<string, unknown>[]): ParseResult {
  const items: ParsedEstimateItem[] = [];
  for (const row of rows) {
    const item = extractItemFromRow(row, items.length + 1);
    if (item) {
      items.push(item);
    }
  }
  return { items, warnings: items.length === 0 ? ['Не найдены позиции в XML'] : [] };
}
