import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import type { ProblemIssueType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const sp = req.nextUrl.searchParams;
    const type = sp.get('type');
    const objectIds = sp.getAll('objectIds[]').filter(Boolean);

    if (!type) return errorResponse('Параметр type обязателен', 400);

    const objWhere = objectIds.length > 0
      ? { id: { in: objectIds }, organizationId: orgId }
      : { organizationId: orgId };

    const issues = await db.problemIssue.findMany({
      where: {
        type: type as ProblemIssueType,
        status: 'ACTIVE',
        buildingObject: objWhere,
      },
      select: {
        id: true,
        type: true,
        description: true,
        buildingObject: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return successResponse(issues);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения проблемных вопросов для дашборда');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
