import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { downloadFile } from '@/lib/s3-utils';
import { extractExcelData } from '@/lib/estimates/parsers/excel-parser';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST — подготовка Excel-файла сметы к чанкованию.
 * Скачивает файл из S3, очищает данные (sanitize + remove empty),
 * возвращает 2D-массив строк для последующего чанкования на фронтенде.
 *
 * Этап 1 нового конвейера Excel-парсинга.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { projectId: string; contractId: string; importId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const estimateImport = await db.estimateImport.findFirst({
      where: {
        id: params.importId,
        contractId: params.contractId,
      },
    });

    if (!estimateImport) {
      return errorResponse('Импорт не найден', 404);
    }

    if (estimateImport.format !== 'EXCEL') {
      return errorResponse('Этот эндпоинт только для Excel-файлов', 400);
    }

    logger.info({ importId: params.importId }, 'Подготовка Excel к чанкованию');

    // Скачиваем файл из S3
    const buffer = await downloadFile(estimateImport.fileS3Key);

    // Извлекаем очищенные данные
    const { headers, rows, totalRows, sheetName } = await extractExcelData(buffer);

    if (rows.length === 0) {
      return errorResponse('Excel-файл не содержит данных', 400);
    }

    logger.info(
      { importId: params.importId, totalRows, sheetsName: sheetName },
      'Excel подготовлен к чанкованию'
    );

    return successResponse({
      headers,
      rows,
      totalRows,
      sheetName,
      /** Рекомендуемый размер чанка (строк данных) */
      chunkSize: 20,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка подготовки Excel к чанкованию');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
