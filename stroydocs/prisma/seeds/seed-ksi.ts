/**
 * Скрипт импорта справочника КСИ из файла XLSX (КТКСИ24122025.xlsx)
 *
 * Структура колонок в листах:
 *   №  |  Класс справочника...  |  Подкласс...  |  Код класса/элемента
 *   |  Наименование...  |  Описание...  |  Классификационная таблица
 *
 * Лист «Классификационная таблица» пропускается (другая структура).
 *
 * Запуск вручную (при наличии XLSX):
 *   npx ts-node --project tsconfig.json prisma/seeds/seed-ksi.ts
 */

import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import path from 'path';

const XLSX_PATH = path.resolve(__dirname, 'ksi/КТКСИ24122025.xlsx');

/** Лист с другой структурой — пропускаем */
const SKIP_SHEET_PATTERN = 'классификационная таблица';

/** Размер батча при вставке в БД */
const BATCH_SIZE = 500;

// ── Типы ────────────────────────────────────────────────────────────────────

interface RawRow {
  code: string;
  name: string;
  description?: string;
  tableCode?: string;
}

/** Индексы колонок (1-based для ExcelJS), определяются из заголовка */
interface ColIndex {
  code: number;
  name: number;
  description: number;
  tableCode: number;
}

// ── Вспомогательные функции ──────────────────────────────────────────────────

/**
 * Определяет индексы нужных колонок по содержимому строки-заголовка.
 * Ключевые слова для поиска (регистронезависимо):
 *   code    → «код»
 *   name    → «наименован» (или «назван»)
 *   desc    → «описан»
 *   table   → «классификационная»
 *
 * Если колонка не найдена — используем дефолтные позиции из задания.
 */
function detectColumns(headerRow: ExcelJS.Row): ColIndex {
  const defaults: ColIndex = { code: 4, name: 5, description: 6, tableCode: 7 };
  const result = { ...defaults };

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const val = String(cell.value || '').toLowerCase().trim();
    if (val.includes('код')) result.code = colNumber;
    else if (val.includes('наименован') || val.includes('назван')) result.name = colNumber;
    else if (val.includes('описан')) result.description = colNumber;
    else if (val.includes('классификационная')) result.tableCode = colNumber;
  });

  return result;
}

/**
 * Вычисляет parentCode для данного кода из набора всех известных кодов.
 *
 * Стратегии (в порядке приоритета):
 *  1. Убрать последний сегмент через «.»  → «CEn.01.001» → «CEn.01»
 *  2. Убрать последний сегмент через «_»  → «BF__0001»   → «BF__»
 *  3. Постепенно укорачивать код на 1 символ и искать совпадение
 */
function findParentCode(code: string, codeSet: Set<string>): string | null {
  // Стратегия 1: разделитель «.»
  if (code.includes('.')) {
    const parent = code.substring(0, code.lastIndexOf('.'));
    if (codeSet.has(parent)) return parent;
  }

  // Стратегия 2: разделитель «_» (коды вида «BF__0001»)
  if (code.includes('_')) {
    const idx = code.search(/[^_]+$/);
    if (idx > 0) {
      const parent = code.slice(0, idx);
      if (codeSet.has(parent)) return parent;
    }
  }

  // Стратегия 3: перебор по длине (от длинных к коротким)
  for (let len = code.length - 1; len >= 2; len--) {
    const prefix = code.slice(0, len);
    if (codeSet.has(prefix)) return prefix;
  }

  return null;
}

/**
 * Возвращает уровень вложенности по коду:
 *  - без разделителей («CEn») → 0
 *  - один «.» («CEn.01»)    → 1
 *  - два «.» («CEn.01.001») → 2
 * Fallback: 0
 */
function computeLevel(code: string, parentCode: string | null): number {
  if (!parentCode) return 0;
  if (code.includes('.')) return code.split('.').length - 1;
  // Если нет разделителя — определяем по длине кода относительно родителя
  return parentCode.length < code.length ? 1 : 0;
}

/**
 * Читает строку ExcelJS-ячейки в строку (обрабатывает RichText и формулы).
 */
function cellToString(cell: ExcelJS.Cell): string {
  const val = cell.value;
  if (!val) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val);
  // RichText объект
  if (typeof val === 'object' && 'richText' in val) {
    return (val as ExcelJS.CellRichTextValue).richText
      .map((rt) => rt.text)
      .join('')
      .trim();
  }
  // Формула
  if (typeof val === 'object' && 'result' in val) {
    return String((val as ExcelJS.CellFormulaValue).result || '').trim();
  }
  return String(val).trim();
}

// ── Основная функция ─────────────────────────────────────────────────────────

/**
 * Читает XLSX-файл КСИ и заполняет таблицу ksi_nodes в БД.
 * Двухпроходной алгоритм:
 *  1. Upsert всех узлов (без parentId)
 *  2. Установка parentId и level по вычисленной иерархии
 */
export async function seedKsiFromXlsx(prisma: PrismaClient): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(XLSX_PATH);

  const allRows: RawRow[] = [];

  workbook.eachSheet((sheet) => {
    // Пропускаем служебный лист
    if (sheet.name.toLowerCase().includes(SKIP_SHEET_PATTERN)) {
      console.log(`[KSI XLSX] Пропускаем лист: "${sheet.name}"`);
      return;
    }

    console.log(`[KSI XLSX] Читаем лист: "${sheet.name}" (${sheet.rowCount} строк)`);

    // Определяем строку заголовка (ищем строку, содержащую «код» и «наименован»)
    let headerRowNumber = 1;
    let colIdx: ColIndex | null = null;

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (colIdx) return; // уже нашли
      const parts: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        parts.push(String(cell.value || '').toLowerCase());
      });
      const rowText = parts.join(' ');
      if (rowText.includes('код') && (rowText.includes('наименован') || rowText.includes('назван'))) {
        headerRowNumber = rowNumber;
        colIdx = detectColumns(row);
      }
    });

    if (!colIdx) {
      console.warn(`[KSI XLSX] Заголовок не найден на листе "${sheet.name}", пробуем дефолтные позиции`);
      colIdx = { code: 4, name: 5, description: 6, tableCode: 7 };
    }

    const idx = colIdx;
    let sheetRowCount = 0;

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= headerRowNumber) return;

      const code = cellToString(row.getCell(idx.code));
      const name = cellToString(row.getCell(idx.name));
      if (!code || !name) return;

      const description = cellToString(row.getCell(idx.description)) || undefined;
      const tableCode = cellToString(row.getCell(idx.tableCode)) || undefined;

      allRows.push({ code, name, description, tableCode });
      sheetRowCount++;
    });

    console.log(`[KSI XLSX]   → ${sheetRowCount} записей`);
  });

  if (allRows.length === 0) {
    console.log('[KSI XLSX] Данных не найдено — пропускаем импорт');
    return;
  }

  console.log(`[KSI XLSX] Всего записей для импорта: ${allRows.length}`);

  const codeSet = new Set(allRows.map((r) => r.code));

  // ── Проход 1: upsert всех узлов без parentId ────────────────────────────

  console.log('[KSI XLSX] Проход 1: вставка/обновление узлов...');

  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map((row) =>
        prisma.ksiNode.upsert({
          where: { code: row.code },
          update: {
            name: row.name,
            description: row.description ?? null,
            tableCode: row.tableCode ?? null,
          },
          create: {
            code: row.code,
            name: row.name,
            description: row.description ?? null,
            tableCode: row.tableCode ?? null,
            level: 0,
          },
        })
      )
    );

    const done = Math.min(i + BATCH_SIZE, allRows.length);
    console.log(`[KSI XLSX]   ${done}/${allRows.length} узлов обработано`);
  }

  // ── Проход 2: установка parentId и level ───────────────────────────────

  console.log('[KSI XLSX] Проход 2: построение иерархии...');

  // Загружаем id всех узлов для маппинга code → id
  const allNodes = await prisma.ksiNode.findMany({
    select: { id: true, code: true },
  });
  const codeToId = new Map<string, string>(allNodes.map((n) => [n.code, n.id]));

  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map((row) => {
        const parentCode = findParentCode(row.code, codeSet);
        const parentId = parentCode ? (codeToId.get(parentCode) ?? null) : null;
        const level = computeLevel(row.code, parentCode);
        const nodeId = codeToId.get(row.code);
        if (!nodeId) return Promise.resolve();

        return prisma.ksiNode.update({
          where: { id: nodeId },
          data: { parentId, level },
        });
      })
    );

    const done = Math.min(i + BATCH_SIZE, allRows.length);
    console.log(`[KSI XLSX]   ${done}/${allRows.length} иерархий установлено`);
  }

  // ── Проход 3: пропагация tableCode от листьев вверх к предкам ────────────
  // Необходимо, чтобы фильтрация по таблице КСИ работала на всех уровнях дерева

  console.log('[KSI XLSX] Проход 3: пропагация tableCode вверх по дереву...');

  let round = 0;
  let updated = 1;
  while (updated > 0 && round < 20) {
    round++;

    const nodesWithoutCode = await prisma.ksiNode.findMany({
      where: {
        tableCode: null,
        children: { some: { tableCode: { not: null } } },
      },
      select: {
        id: true,
        children: {
          where: { tableCode: { not: null } },
          select: { tableCode: true },
          take: 1,
        },
      },
    });

    updated = nodesWithoutCode.length;
    if (updated > 0) {
      await Promise.all(
        nodesWithoutCode
          .filter((n) => n.children[0]?.tableCode)
          .map((n) =>
            prisma.ksiNode.update({
              where: { id: n.id },
              data: { tableCode: n.children[0].tableCode },
            })
          )
      );
    }

    console.log(`[KSI XLSX]   Раунд ${round}: обновлено ${updated} предков`);
  }

  console.log(`[KSI XLSX] Импорт завершён: ${allRows.length} узлов КСИ загружено`);
}
