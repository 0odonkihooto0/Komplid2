import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** GET /api/reports/thematic — список доступных тематических форм */
export async function GET() {
  try {
    await getSessionOrThrow();

    const configs = await db.thematicReportConfig.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return successResponse(configs);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения тематических форм');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
