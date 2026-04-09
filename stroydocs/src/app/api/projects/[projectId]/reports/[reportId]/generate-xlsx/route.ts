import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile, getDownloadUrl, buildS3Key } from '@/lib/s3-utils';
import { ReportStatus } from '@prisma/client';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

interface Params { projectId: string; reportId: string }

/** POST /api/projects/[projectId]/reports/[reportId]/generate-xlsx
 *  Сгенерировать Excel отчёта из блоков, загрузить в S3, вернуть presigned URL */
export async function POST(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId, reportId } = params;

    // Проверяем доступ к проекту
    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const report = await db.report.findFirst({
      where: { id: reportId, projectId },
      include: {
        blocks: { orderBy: { order: 'asc' } },
      },
    });
    if (!report) return errorResponse('Отчёт не найден', 404);

    // Формируем Excel-книгу
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'StroyDocs';
    workbook.created = new Date();

    // Титульный лист
    const titleSheet = workbook.addWorksheet('Отчёт');
    titleSheet.columns = [
      { header: 'Параметр', key: 'param', width: 30 },
      { header: 'Значение', key: 'value', width: 50 },
    ];
    titleSheet.addRow({ param: 'Наименование отчёта', value: report.name });
    titleSheet.addRow({ param: 'Номер', value: String(report.number) });
    titleSheet.addRow({ param: 'Период (начало)', value: report.periodStart?.toLocaleDateString('ru-RU') ?? '—' });
    titleSheet.addRow({ param: 'Период (конец)', value: report.periodEnd?.toLocaleDateString('ru-RU') ?? '—' });
    titleSheet.addRow({ param: 'Статус', value: report.status });

    // Лист по каждому блоку
    for (const block of report.blocks) {
      const sheetName = block.title.slice(0, 31); // Excel ограничение: 31 символ
      const sheet = workbook.addWorksheet(sheetName);

      if (!block.content) {
        sheet.addRow(['Блок не заполнен']);
        continue;
      }

      const content = block.content as Record<string, unknown>;

      // Если блок содержит массив rows — выводим таблицей
      if (Array.isArray(content.rows) && content.rows.length > 0) {
        const firstRow = content.rows[0] as Record<string, unknown>;
        const keys = Object.keys(firstRow);
        sheet.columns = keys.map((k) => ({ header: k, key: k, width: 20 }));
        for (const row of content.rows as Record<string, unknown>[]) {
          sheet.addRow(row);
        }
      } else {
        // Выводим как пары ключ-значение
        sheet.columns = [
          { header: 'Параметр', key: 'param', width: 30 },
          { header: 'Значение', key: 'value', width: 50 },
        ];
        for (const [key, value] of Object.entries(content)) {
          sheet.addRow({ param: key, value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? '') });
        }
      }
    }

    // Записываем в буфер
    const buffer = await workbook.xlsx.writeBuffer();
    const xlsxBuffer = Buffer.from(buffer);

    // Загружаем в S3
    const fileName = `report-${report.number}-${Date.now()}.xlsx`;
    const s3Key = buildS3Key(orgId, 'reports', fileName);
    await uploadFile(xlsxBuffer, s3Key, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Обновляем запись отчёта
    await db.report.update({
      where: { id: reportId },
      data: {
        xlsxS3Key: s3Key,
        status: ReportStatus.GENERATED,
      },
    });

    // Возвращаем presigned URL (TTL: 1 час)
    const url = await getDownloadUrl(s3Key);

    return successResponse({ url, fileName, s3Key });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка генерации Excel отчёта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
