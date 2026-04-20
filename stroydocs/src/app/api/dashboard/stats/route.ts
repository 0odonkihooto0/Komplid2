import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const [
      projectsCount, contractsCount, employeesCount, pendingInvitations,
      workItemsCount, materialsCount, workRecordsCount, photosCount,
      recentContracts,
      executionDocCount, designDocCount, sedDocCount, correspondenceCount,
      tasksTotal,
    ] = await Promise.all([
      db.buildingObject.count({ where: { organizationId: orgId } }),
      db.contract.count({ where: { buildingObject: { organizationId: orgId } } }),
      db.user.count({ where: { organizationId: orgId, isActive: true } }),
      db.invitation.count({ where: { organizationId: orgId, status: 'PENDING' } }),
      db.workItem.count({ where: { contract: { buildingObject: { organizationId: orgId } } } }),
      db.material.count({ where: { contract: { buildingObject: { organizationId: orgId } } } }),
      db.workRecord.count({ where: { contract: { buildingObject: { organizationId: orgId } } } }),
      db.photo.count({ where: { author: { organizationId: orgId } } }),
      db.contract.findMany({
        where: { buildingObject: { organizationId: orgId } },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          number: true,
          name: true,
          status: true,
          updatedAt: true,
          buildingObject: { select: { id: true, name: true } },
        },
      }),
      // documentsTotal — ИД + ПД + СЭД + Переписка
      db.executionDoc.count({ where: { contract: { buildingObject: { organizationId: orgId } } } }),
      db.designDocument.count({ where: { buildingObject: { organizationId: orgId } } }),
      db.sEDDocument.count({ where: { buildingObject: { organizationId: orgId } } }),
      db.correspondence.count({ where: { buildingObject: { organizationId: orgId } } }),
      db.task.count({ where: { project: { organizationId: orgId } } }),
    ]);

    const documentsTotal = executionDocCount + designDocCount + sedDocCount + correspondenceCount;

    return successResponse({
      projectsCount, contractsCount, employeesCount, pendingInvitations,
      workItemsCount, materialsCount, workRecordsCount, photosCount,
      recentContracts,
      documentsTotal,
      tasksTotal,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения статистики');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
