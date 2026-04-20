import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

async function verifyObjectAccess(projectId: string, organizationId: string) {
  return db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
}

// POST — импорт земельных участков из xlsx-файла
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const object = await verifyObjectAccess(params.projectId, session.user.organizationId);
    if (!object) return errorResponse('Объект не найден', 404);

    // Получаем файл из FormData
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return errorResponse('Файл не загружен', 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = new ExcelJS.Workbook();
    // ExcelJS типы основаны на @types/node@14 (нет generic), @types/node@20 возвращает Buffer<ArrayBuffer>.
    // Cast через unknown обходит несовместимость типов (безопасно — runtime идентичен).
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return errorResponse('Файл не содержит листов', 400);
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    interface ParsedRow {
      cadastralNumber: string;
      address: string | null;
      area: number | null;
      landCategory: string | null;
      permittedUse: string | null;
      cadastralValue: number | null;
    }

    // Первый проход: парсим строки без DB-запросов
    const rows = sheet.getRows(2, sheet.rowCount - 1) ?? [];
    const parsedRows: ParsedRow[] = [];

    for (const row of rows) {
      const cadastralNumber = String(row.getCell(1).value ?? '').trim();
      if (!cadastralNumber) {
        skipped++;
        continue;
      }

      const address = row.getCell(2).value
        ? String(row.getCell(2).value).trim()
        : null;

      const areaRaw = row.getCell(3).value;
      const area =
        areaRaw !== null && areaRaw !== undefined && !isNaN(Number(areaRaw))
          ? Number(areaRaw)
          : null;

      const landCategory = row.getCell(4).value
        ? String(row.getCell(4).value).trim()
        : null;

      const permittedUse = row.getCell(5).value
        ? String(row.getCell(5).value).trim()
        : null;

      const cadastralValueRaw = row.getCell(6).value;
      const cadastralValue =
        cadastralValueRaw !== null &&
        cadastralValueRaw !== undefined &&
        !isNaN(Number(cadastralValueRaw))
          ? Number(cadastralValueRaw)
          : null;

      parsedRows.push({ cadastralNumber, address, area, landCategory, permittedUse, cadastralValue });
    }

    // Один запрос вместо N: находим все уже существующие участки
    const allCadastralNumbers = parsedRows.map((r) => r.cadastralNumber);
    const existingPlots = await db.landPlot.findMany({
      where: { projectId: params.projectId, cadastralNumber: { in: allCadastralNumbers } },
      select: { id: true, cadastralNumber: true },
    });
    const existingMap = new Map(existingPlots.map((p) => [p.cadastralNumber, p.id]));

    // Второй проход: создаём/обновляем по результатам batch-lookup
    for (const row of parsedRows) {
      const existingId = existingMap.get(row.cadastralNumber);
      if (existingId) {
        // Обновляем только поля из шаблона, не затрагивая остальные данные
        await db.landPlot.update({
          where: { id: existingId },
          data: {
            address: row.address ?? undefined,
            area: row.area ?? undefined,
            landCategory: row.landCategory ?? undefined,
            permittedUse: row.permittedUse ?? undefined,
            cadastralValue: row.cadastralValue ?? undefined,
          },
        });
        updated++;
      } else {
        await db.landPlot.create({
          data: {
            cadastralNumber: row.cadastralNumber,
            address: row.address,
            area: row.area,
            landCategory: row.landCategory,
            permittedUse: row.permittedUse,
            cadastralValue: row.cadastralValue,
            projectId: params.projectId,
          },
        });
        imported++;
      }
    }

    return successResponse({ imported, updated, skipped });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка импорта земельных участков');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
