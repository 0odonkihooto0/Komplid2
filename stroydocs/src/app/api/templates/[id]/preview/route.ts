/**
 * GET /api/templates/[id]/preview
 *
 * Конвертирует .docx-шаблон в HTML для предпросмотра в браузере.
 * Использует mammoth.js (docx → HTML, ~80% точности форматирования).
 * Возвращает { html: string }.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import path from 'path';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getSessionOrThrow();

    const template = await db.documentTemplate.findFirst({
      where: { id: params.id, isActive: true },
    });

    if (!template) return errorResponse('Шаблон не найден', 404);
    if (!template.localPath) return errorResponse('Файл шаблона не настроен', 404);

    const absolutePath = path.join(process.cwd(), template.localPath);

    // Динамический импорт mammoth для конвертации docx → HTML
    const mammoth = await import('mammoth');
    const result = await mammoth.convertToHtml({ path: absolutePath });

    return successResponse({
      html: result.value,
      warnings: result.messages.map((m) => m.message),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка предпросмотра шаблона');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
