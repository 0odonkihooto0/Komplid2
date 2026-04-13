import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { uploadFile, buildS3Key } from '@/lib/s3-utils';
import { parsePrimaveraXer } from '@/lib/gantt/parsers/primavera-parser';
import { parseMsProjectXml } from '@/lib/gantt/parsers/msproject-parser';
import { parseGprExcel } from '@/lib/gantt/parsers/excel-gpr-parser';
import { importFromParsedFile } from '@/lib/gantt/import-from-file';
import type { ParseResult } from '@/lib/gantt/parsers/types';

export const dynamic = 'force-dynamic';

const formatSchema = z.enum(['PRIMAVERA', 'MS_PROJECT', 'EXCEL']);

/**
 * POST /api/projects/[projectId]/gantt-versions/[versionId]/import-file
 * Импорт файла ГПР (Primavera XER, MS Project XML, Excel-шаблон).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка версии ГПР и принадлежности к организации
    const version = await db.ganttVersion.findFirst({
      where: {
        id: params.versionId,
        projectId: params.projectId,
        project: { organizationId: session.user.organizationId },
      },
    });
    if (!version) return errorResponse('Версия ГПР не найдена', 404);

    // Проверка что версия пустая (нет задач)
    const existingTasks = await db.ganttTask.count({ where: { versionId: params.versionId } });
    if (existingTasks > 0) {
      return errorResponse(
        'Версия ГПР уже содержит задачи. Используйте пустую версию для импорта.',
        409,
      );
    }

    // Извлечение файла и формата из form-data
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return errorResponse('Файл не загружен', 400);
    }

    const rawFormat = formData.get('format');
    const parsedFormat = formatSchema.safeParse(rawFormat);
    if (!parsedFormat.success) {
      return errorResponse('Неверный формат. Допустимые: PRIMAVERA, MS_PROJECT, EXCEL', 400);
    }
    const format = parsedFormat.data;
    const withVat = formData.get('withVat') === 'true';

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file instanceof File ? file.name : `import.${format.toLowerCase()}`;

    // Сохраняем исходный файл в S3 для аудита
    const s3Key = buildS3Key(session.user.organizationId, 'gantt-imports', fileName);
    await uploadFile(buffer, s3Key, file.type || 'application/octet-stream');

    // Вызов соответствующего парсера
    let parsed: ParseResult;
    switch (format) {
      case 'PRIMAVERA':
        parsed = parsePrimaveraXer(buffer);
        break;
      case 'MS_PROJECT':
        parsed = await parseMsProjectXml(buffer);
        break;
      case 'EXCEL':
        parsed = await parseGprExcel(buffer);
        break;
    }

    if (parsed.tasks.length === 0) {
      return errorResponse('В файле не найдены задачи', 400);
    }

    // Запись в БД в транзакции
    const result = await db.$transaction(
      async (tx) => importFromParsedFile(tx, params.versionId, parsed, { withVat }),
      { timeout: 30000 },
    );

    return successResponse({ ...result, s3Key });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка импорта файла ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
