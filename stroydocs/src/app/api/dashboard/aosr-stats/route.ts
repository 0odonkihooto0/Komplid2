import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalThisMonth, signedThisMonth, inProgress] = await Promise.all([
      db.executionDoc.count({
        where: {
          type: 'AOSR',
          contract: { buildingObject: { organizationId: orgId } },
          createdAt: { gte: monthStart },
        },
      }),
      db.executionDoc.count({
        where: {
          type: 'AOSR',
          status: 'SIGNED',
          contract: { buildingObject: { organizationId: orgId } },
          createdAt: { gte: monthStart },
        },
      }),
      db.executionDoc.count({
        where: {
          type: 'AOSR',
          status: 'IN_REVIEW',
          contract: { buildingObject: { organizationId: orgId } },
        },
      }),
    ]);

    const signedPercent =
      totalThisMonth > 0 ? Math.round((signedThisMonth / totalThisMonth) * 100) : 0;

    return successResponse({ totalThisMonth, signedThisMonth, inProgress, signedPercent });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения статистики АОСР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
