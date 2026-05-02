import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET — аналитика просмотров публичного дашборда объекта
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    const session = await getSessionOrThrow();

    // Проверяем что объект принадлежит организации текущего пользователя
    const obj = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
    });
    if (!obj) return errorResponse('Не найдено', 404);

    // Ищем активный токен PROJECT_DASHBOARD для этого объекта
    const token = await db.projectPortalToken.findFirst({
      where: {
        projectId: params.projectId,
        scopeType: 'PROJECT_DASHBOARD',
        revokedAt: null,
      },
    });

    // Если публичный дашборд не включён — возвращаем пустую аналитику
    if (!token) {
      return successResponse({
        viewCount: 0,
        uniqueVisitors: 0,
        viewsByDay: [],
        topReferers: [],
      });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Всего просмотров из денормализованного счётчика на токене
    const viewCount = token.viewCount;

    // Уникальные посетители по ipHash
    const uniqueVisitorGroups = await db.portalView.groupBy({
      by: ['ipHash'],
      where: { tokenId: token.id },
      _count: { id: true },
    });
    const uniqueVisitors = uniqueVisitorGroups.length;

    // Просмотры по дням за последние 30 дней через raw SQL
    // groupBy по DateTime даёт строку на каждую запись, нужна группировка по DATE()
    const viewsByDay = await db.$queryRaw<{ date: string; count: number }[]>`
      SELECT DATE("viewedAt") as date, COUNT(*)::int as count
      FROM "portal_views"
      WHERE "tokenId" = ${token.id}
        AND "viewedAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("viewedAt")
      ORDER BY date ASC
    `;

    // Топ-5 источников перехода (не null)
    const topReferers = await db.$queryRaw<{ referer: string; count: number }[]>`
      SELECT "referer", COUNT(*)::int as count
      FROM "portal_views"
      WHERE "tokenId" = ${token.id} AND "referer" IS NOT NULL
      GROUP BY "referer"
      ORDER BY count DESC
      LIMIT 5
    `;

    return successResponse({
      viewCount,
      uniqueVisitors,
      viewsByDay,
      topReferers,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения аналитики публичного дашборда');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
