import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { buildJournalColumns } from '@/lib/journal-excel-generator';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; journalId: string } };

/** Строка предпросмотра */
interface PreviewRow {
  rowIndex: number;
  date: string;
  description: string;
  location: string | null;
  normativeRef: string | null;
  weather: string | null;
  temperature: number | null;
  data: Record<string, unknown> | null;
}

/**
 * Парсит дату из строки (принимает DD.MM.YYYY, YYYY-MM-DD и другие форматы).
 * Возвращает Date или null если не распарсилось.
 */
function parseDate(raw: ExcelJS.CellValue): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return raw;

  const str = String(raw).trim();
  if (!str) return null;

  // DD.MM.YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(dt.getTime())) return dt;
  }

  // YYYY-MM-DD или другие стандартные форматы
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) return dt;

  return null;
}

/**
 * POST .../import-excel[?preview=true] — импорт записей журнала из xlsx
 *
 * Тело: FormData { file: Blob }
 * ?preview=true — вернуть распарсенные строки без записи в БД
 * без параметра   — создать записи в БД
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const isPreview = req.nextUrl.searchParams.get('preview') === 'true';

    const object = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!object) return errorResponse('Объект не найден', 404);

    const journal = await db.specialJournal.findFirst({
      where: { id: params.journalId, projectId: params.projectId },
      select: { id: true, type: true, status: true },
    });
    if (!journal) return errorResponse('Журнал не найден', 404);

    // Редактирование запрещено в режиме хранения
    if (journal.status !== 'ACTIVE') {
      return errorResponse('Журнал в режиме хранения — импорт запрещён', 403);
    }

    // Получаем файл из FormData
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return errorResponse('Файл не загружен', 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

    const sheet = workbook.worksheets[0];
    if (!sheet) return errorResponse('Файл не содержит листов', 400);

    // Определяем колонки шаблона для текущего типа журнала
    const columns = buildJournalColumns(journal.type);

    // Индексы ключевых колонок (1-based в ExcelJS)
    const COL_DATE = 2; // Дата
    const COL_DESC = 4; // Описание

    // Данные начинаются с 3-й строки (1 — заголовок, 2 — примечание)
    const startRow = 3;
    const totalRows = sheet.rowCount;

    const validRows: PreviewRow[] = [];
    let skipped = 0;

    for (let rowNum = startRow; rowNum <= totalRows; rowNum++) {
      const row = sheet.getRow(rowNum);

      const rawDate = row.getCell(COL_DATE).value;
      const rawDesc = row.getCell(COL_DESC).value;

      const parsedDate = parseDate(rawDate);
      const description = rawDesc ? String(rawDesc).trim() : '';

      // Пропускаем строки без обязательных полей
      if (!parsedDate || !description) {
        skipped++;
        continue;
      }

      // Общие необязательные поля
      const location = row.getCell(5).value ? String(row.getCell(5).value).trim() : null;
      const normativeRef = row.getCell(6).value ? String(row.getCell(6).value).trim() : null;
      const weather = row.getCell(7).value ? String(row.getCell(7).value).trim() : null;
      const tempRaw = row.getCell(8).value;
      const temperature =
        tempRaw !== null && tempRaw !== undefined && !isNaN(Number(tempRaw))
          ? Number(tempRaw)
          : null;

      // Type-specific поля (колонки 9+)
      const typeSpecificData: Record<string, unknown> = {};
      // Базовых 8 колонок — дополнительные начинаются с индекса 8 (0-based) → колонка 9
      const extraCols = columns.slice(8);
      extraCols.forEach((col, i) => {
        const cellVal = row.getCell(9 + i).value;
        if (cellVal !== null && cellVal !== undefined && cellVal !== '') {
          typeSpecificData[col.key] = !isNaN(Number(cellVal)) ? Number(cellVal) : String(cellVal);
        }
      });

      const d = new Date(parsedDate);
      const dd = d.getDate().toString().padStart(2, '0');
      const mm = (d.getMonth() + 1).toString().padStart(2, '0');
      const yyyy = d.getFullYear();

      validRows.push({
        rowIndex: rowNum,
        date: `${dd}.${mm}.${yyyy}`,
        description,
        location,
        normativeRef,
        weather,
        temperature,
        data: Object.keys(typeSpecificData).length > 0 ? typeSpecificData : null,
      });
    }

    // Режим предпросмотра — вернуть строки без сохранения
    if (isPreview) {
      return successResponse({
        rows: validRows,
        total: validRows.length,
        skipped,
      });
    }

    // Режим импорта — создать записи в БД
    if (validRows.length === 0) {
      return successResponse({ imported: 0, skipped });
    }

    // Авто-нумерация: начинаем с MAX(entryNumber) + 1
    const result = await db.$queryRaw<Array<{ max_num: number | null }>>`
      SELECT MAX("entryNumber") AS max_num
      FROM special_journal_entries
      WHERE "journalId" = ${params.journalId}
    `;
    const startNum = (result[0]?.max_num ?? 0) + 1;

    const entriesToCreate: Prisma.SpecialJournalEntryCreateManyInput[] = validRows.map(
      (row, i) => ({
        entryNumber: startNum + i,
        date: new Date(
          Number(row.date.split('.')[2]),
          Number(row.date.split('.')[1]) - 1,
          Number(row.date.split('.')[0])
        ),
        description: row.description,
        location: row.location,
        normativeRef: row.normativeRef,
        weather: row.weather,
        temperature: row.temperature,
        data: row.data !== null ? (row.data as Prisma.InputJsonValue) : undefined,
        journalId: params.journalId,
        authorId: session.user.id,
      })
    );

    await db.specialJournalEntry.createMany({ data: entriesToCreate });

    return successResponse({ imported: validRows.length, skipped });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка импорта записей журнала из xlsx');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
