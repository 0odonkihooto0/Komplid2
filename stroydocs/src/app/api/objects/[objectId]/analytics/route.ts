import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { getCachedAnalytics } from '@/lib/analytics/cache';

export const dynamic = 'force-dynamic';

interface Params {
  objectId: string;
}

export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { objectId: projectId } = params;

    // Проверяем доступ к проекту
    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true, name: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const cacheKey = `analytics:project:${projectId}`;

    const data = await getCachedAnalytics(cacheKey, async () => {
      const now = new Date();

      const [
        contractsCount,
        workItemsCount,
        workRecordsCount,
        executionDocsTotals,
        defectsTotals,
        recentActivity,
      ] = await Promise.all([
        // Всего договоров по проекту
        db.contract.count({ where: { projectId } }),

        // Всего видов работ
        db.workItem.count({ where: { contract: { projectId } } }),

        // Всего записей о работах
        db.workRecord.count({ where: { contract: { projectId } } }),

        // Статистика по исполнительным документам
        db.executionDoc.groupBy({
          by: ['status'],
          where: { contract: { projectId } },
          _count: { id: true },
        }),

        // Статистика по дефектам
        db.defect.groupBy({
          by: ['status'],
          where: { projectId },
          _count: { id: true },
        }),

        // Активность по месяцам (последние 6 месяцев)
        db.workRecord.findMany({
          where: {
            contract: { projectId },
            date: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
          },
          select: { date: true },
          orderBy: { date: 'asc' },
        }),
      ]);

      // Подсчёт ИД по статусам
      const docsMap: Record<string, number> = {};
      for (const row of executionDocsTotals) {
        docsMap[row.status] = row._count.id;
      }
      const docsTotalCount =
        Object.values(docsMap).reduce((a, b) => a + b, 0);
      const docsSignedCount = docsMap['SIGNED'] ?? 0;
      const docsInReviewCount = docsMap['IN_REVIEW'] ?? 0;
      const docsDraftCount = docsMap['DRAFT'] ?? 0;
      const docsRejectedCount = docsMap['REJECTED'] ?? 0;

      // Воронка ИД
      const idFunnel = {
        workRecords: workRecordsCount,
        docsTotal: docsTotalCount,
        docsInReview: docsInReviewCount,
        docsSigned: docsSignedCount,
        docsDraft: docsDraftCount,
        docsRejected: docsRejectedCount,
      };

      // Подсчёт дефектов по статусам
      const defMap: Record<string, number> = {};
      for (const row of defectsTotals) {
        defMap[row.status] = row._count.id;
      }
      const defectsOpen = defMap['OPEN'] ?? 0;
      const defectsInProgress = defMap['IN_PROGRESS'] ?? 0;
      const defectsResolved = defMap['RESOLVED'] ?? 0;
      const defectsConfirmed = defMap['CONFIRMED'] ?? 0;
      const defectsTotal = Object.values(defMap).reduce((a, b) => a + b, 0);

      // Просроченные дефекты
      const overdueDefects = await db.defect.count({
        where: {
          projectId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          deadline: { lt: now },
        },
      });

      // Активность по месяцам — группируем в JS
      const activityByMonth: Record<string, number> = {};
      for (const record of recentActivity) {
        const key = `${record.date.getFullYear()}-${String(record.date.getMonth() + 1).padStart(2, '0')}`;
        activityByMonth[key] = (activityByMonth[key] ?? 0) + 1;
      }
      const activityChart = Object.entries(activityByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count }));

      return {
        projectId,
        projectName: project.name,
        contractsCount,
        workItemsCount,
        workRecordsCount,
        idFunnel,
        defects: {
          total: defectsTotal,
          open: defectsOpen,
          inProgress: defectsInProgress,
          resolved: defectsResolved,
          confirmed: defectsConfirmed,
          overdue: overdueDefects,
        },
        activityChart,
      };
    });

    return successResponse(data);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка аналитики проекта');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
