import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

interface Params { slug: string }

/** GET /api/reports/thematic/[slug] — конфигурация тематической формы */
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    await getSessionOrThrow();
    const { slug } = params;

    const config = await db.thematicReportConfig.findUnique({
      where: { slug },
    });
    if (!config || !config.isActive) {
      return errorResponse('Тематическая форма не найдена', 404);
    }

    return successResponse(config);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения конфигурации тематической формы');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
