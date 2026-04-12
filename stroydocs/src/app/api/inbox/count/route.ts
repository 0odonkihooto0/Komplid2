import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSessionOrThrow();
    const userId = session.user.id;

    // Точный подсчёт: только шаги, являющиеся текущим активным шагом маршрута
    const result = await db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "approval_steps" s
      JOIN "approval_routes" r ON s."routeId" = r."id"
      WHERE s."userId" = ${userId}
        AND s."status" = 'WAITING'
        AND s."stepIndex" = r."currentStepIdx"
    `;

    return successResponse({ count: Number(result[0].count) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения счётчика входящих');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
