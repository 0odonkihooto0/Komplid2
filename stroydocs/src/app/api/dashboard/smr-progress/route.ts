import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Прогресс СМР: выполненные записи vs общее количество видов работ по активным договорам
export async function GET() {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const contracts = await db.contract.findMany({
      where: {
        buildingObject: { organizationId: orgId },
        status: 'ACTIVE',
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        number: true,
        name: true,
        buildingObject: { select: { id: true, name: true } },
        _count: {
          select: {
            workItems: true,
            workRecords: { where: { status: { in: ['COMPLETED', 'ACCEPTED'] } } },
          },
        },
      },
    });

    const data = contracts.map((c) => ({
      id: c.id,
      number: c.number,
      name: c.name,
      projectId: c.buildingObject.id,
      projectName: c.buildingObject.name,
      workItemsTotal: c._count.workItems,
      workRecordsDone: c._count.workRecords,
      progress: c._count.workItems > 0
        ? Math.round((c._count.workRecords / c._count.workItems) * 100)
        : 0,
    }));

    return successResponse(data);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения прогресса СМР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
