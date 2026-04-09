import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { getCachedAnalytics } from '@/lib/analytics/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;

    const cacheKey = `analytics:global:${orgId}`;

    const data = await getCachedAnalytics(cacheKey, async () => {
      const now = new Date();
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [projects, globalDefects, workRecordsRaw, defectsByCategoryRaw] = await Promise.all([
        // Все проекты с агрегатами
        db.buildingObject.findMany({
          where: { organizationId: orgId },
          select: {
            id: true,
            name: true,
            status: true,
            _count: {
              select: {
                contracts: true,
                defects: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        }),

        // Глобальные дефекты по статусам
        db.defect.groupBy({
          by: ['status'],
          where: { buildingObject: { organizationId: orgId } },
          _count: { id: true },
        }),

        // Записи о работах за последние 6 месяцев
        db.workRecord.findMany({
          where: {
            contract: { buildingObject: { organizationId: orgId } },
            date: { gte: sixMonthsAgo },
          },
          select: { date: true },
        }),

        // Дефекты по категориям
        db.defect.groupBy({
          by: ['category'],
          where: { buildingObject: { organizationId: orgId } },
          _count: { id: true },
        }),
      ]);

      // Подсчёт ИД по каждому проекту
      const projectIds = projects.map((p) => p.id);
      const [docsGrouped, overdueByProject, signedDocsByProject] = await Promise.all([
        db.executionDoc.groupBy({
          by: ['status'],
          where: { contract: { buildingObject: { organizationId: orgId } } },
          _count: { id: true },
        }),
        db.defect.groupBy({
          by: ['projectId'],
          where: {
            projectId: { in: projectIds },
            status: { in: ['OPEN', 'IN_PROGRESS'] },
            deadline: { lt: now },
          },
          _count: { id: true },
        }),
        // Подписанные ИД по проектам
        db.executionDoc.groupBy({
          by: ['status'],
          where: {
            contract: { projectId: { in: projectIds } },
          },
          _count: { id: true },
        }),
      ]);

      const overdueMap: Record<string, number> = {};
      for (const row of overdueByProject) {
        overdueMap[row.projectId] = row._count.id;
      }

      const docsMap: Record<string, number> = {};
      for (const row of docsGrouped) {
        docsMap[row.status] = row._count.id;
      }

      const defMap: Record<string, number> = {};
      for (const row of globalDefects) {
        defMap[row.status] = row._count.id;
      }

      // Группировка записей о работах по месяцам (YYYY-MM)
      const monthCountMap: Record<string, number> = {};
      for (const wr of workRecordsRaw) {
        const d = new Date(wr.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthCountMap[key] = (monthCountMap[key] ?? 0) + 1;
      }
      const workRecordsByMonth = Object.entries(monthCountMap)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Дефекты по категориям
      const defectsByCategory = defectsByCategoryRaw.map((row) => ({
        category: row.category as string,
        count: row._count.id,
      }));

      const projectsData = projects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        contractsCount: p._count.contracts,
        defectsCount: p._count.defects,
        overdueDefects: overdueMap[p.id] ?? 0,
        signedDocsCount: signedDocsByProject.find((r) => r.status === 'SIGNED')?._count.id ?? 0,
        totalDocsCount: signedDocsByProject.reduce((s, r) => s + r._count.id, 0),
      }));

      return {
        projectsCount: projects.length,
        contractsCount: projects.reduce((sum, p) => sum + p._count.contracts, 0),
        docsTotal: Object.values(docsMap).reduce((a, b) => a + b, 0),
        docsSigned: docsMap['SIGNED'] ?? 0,
        defectsOpen: (defMap['OPEN'] ?? 0) + (defMap['IN_PROGRESS'] ?? 0),
        defectsTotal: Object.values(defMap).reduce((a, b) => a + b, 0),
        projects: projectsData,
        workRecordsByMonth,
        defectsByCategory,
      };
    });

    return successResponse(data);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка глобальной аналитики');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
