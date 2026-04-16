import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const sp = req.nextUrl.searchParams;
    const stage = sp.get('stage');
    const objectIds = sp.getAll('objectIds[]').filter(Boolean);

    if (!stage) return errorResponse('Параметр stage обязателен', 400);

    const objWhere = objectIds.length > 0
      ? { id: { in: objectIds }, organizationId: orgId }
      : { organizationId: orgId };

    const stages = await db.ganttStage.findMany({
      where: {
        name: stage,
        isCurrent: true,
        project: objWhere,
      },
      select: {
        id: true,
        name: true,
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    return successResponse(stages);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения объектов по стадии для дашборда');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
