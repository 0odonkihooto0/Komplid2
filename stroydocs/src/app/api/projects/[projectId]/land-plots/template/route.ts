import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

async function verifyObjectAccess(projectId: string, organizationId: string) {
  return db.buildingObject.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
}

// Заголовки колонок шаблона импорта земельных участков
const TEMPLATE_COLUMNS = [
  'Кадастровый номер *',
  'Адрес',
  'Площадь (кв.м)',
  'Категория земель',
  'Вид разрешённого использования',
  'Кадастровая стоимость (руб.)',
] as const;

// GET — генерация xlsx-шаблона для импорта земельных участков
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const object = await verifyObjectAccess(params.projectId, session.user.organizationId);
    if (!object) return errorResponse('Объект не найден', 404);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Земельные участки');

    // Добавляем строку заголовков с жирным шрифтом
    const headerRow = sheet.addRow(TEMPLATE_COLUMNS);
    headerRow.font = { bold: true };

    // Автоподбор ширины колонок под содержимое заголовков
    sheet.columns = TEMPLATE_COLUMNS.map((header) => ({
      header,
      width: Math.max(header.length + 4, 20),
    }));

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="land-plots-template.xlsx"',
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации шаблона земельных участков');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
