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

    // Обходим строки, пропуская первую (заголовок)
    const rows = sheet.getRows(2, sheet.rowCount - 1) ?? [];
    for (const row of rows) {
      // Читаем значения ячеек по индексу (1-based в ExcelJS)
      const cadastralNumber = String(row.getCell(1).value ?? '').trim();

      // Пропускаем строки без кадастрового номера (обязательное поле)
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

      // Поиск существующего участка с таким кадастровым номером в проекте
      const existing = await db.landPlot.findFirst({
        where: { projectId: params.projectId, cadastralNumber },
        select: { id: true },
      });

      if (existing) {
        // Обновляем только поля из шаблона, не затрагивая остальные данные
        await db.landPlot.update({
          where: { id: existing.id },
          data: {
            address: address ?? undefined,
            area: area ?? undefined,
            landCategory: landCategory ?? undefined,
            permittedUse: permittedUse ?? undefined,
            cadastralValue: cadastralValue ?? undefined,
          },
        });
        updated++;
      } else {
        await db.landPlot.create({
          data: {
            cadastralNumber,
            address,
            area,
            landCategory,
            permittedUse,
            cadastralValue,
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
