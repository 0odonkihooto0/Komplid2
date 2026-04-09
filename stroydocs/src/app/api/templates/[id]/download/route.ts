/**
 * GET /api/templates/[id]/download
 *
 * Скачать шаблон .docx напрямую с диска.
 * Возвращает файл как application/vnd.openxmlformats-officedocument.wordprocessingml.document.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { errorResponse } from '@/utils/api';
import fs from 'fs';
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

    if (!fs.existsSync(absolutePath)) {
      return errorResponse('Файл шаблона не найден на сервере', 404);
    }

    const fileBuffer = fs.readFileSync(absolutePath);
    const fileName = path.basename(absolutePath);

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Length': String(fileBuffer.length),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Ошибка скачивания шаблона');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
