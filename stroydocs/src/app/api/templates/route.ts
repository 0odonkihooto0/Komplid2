/**
 * GET /api/templates
 *
 * Возвращает список активных шаблонов документов.
 * Query-параметры:
 *   category — фильтр по категории (AOSR | OZR | KS2 | KS3 | AVK | ZHVK | TECH_READINESS | OTHER)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await getSessionOrThrow();

    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get('category');

    const templates = await db.documentTemplate.findMany({
      where: {
        isActive: true,
        organizationId: null, // только системные шаблоны (общедоступные)
        ...(category ? { category: category as never } : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        category: true,
        workType: true,
        description: true,
        version: true,
        format: true,
        localPath: true,
        isPublic: true,
        createdAt: true,
      },
    });

    // Добавить флаг наличия файла на диске
    const templatesWithFileStatus = templates.map((tpl) => {
      let fileExists = false;
      if (tpl.localPath) {
        fileExists = fs.existsSync(path.join(process.cwd(), tpl.localPath));
      }
      return { ...tpl, fileExists };
    });

    return successResponse(templatesWithFileStatus);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения шаблонов');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
