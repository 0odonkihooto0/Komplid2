import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

interface Params { orgId: string }

export type ScheduleStatus = 'ON_TRACK' | 'SLIGHT_DELAY' | 'CRITICAL_DELAY';

export interface MonitoringObject {
  id: string;
  name: string;
  address: string | null;
  gprProgress: number;
  idProgress: number;
  openDefects: number;
  overdueDefects: number;
  ks2AmountMonth: number;
  maxDeviationDays: number;
  scheduleStatus: ScheduleStatus;
}

/**
 * GET /api/organizations/[orgId]/monitoring
 * Агрегированные показатели по всем объектам организации.
 * Используется для глобальной карты мониторинга.
 */
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { orgId: requestedOrgId } = params;

    if (requestedOrgId !== orgId) {
      return errorResponse('Недостаточно прав', 403);
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Все объекты организации (лимит 50)
    const objects = await db.buildingObject.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, address: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    if (objects.length === 0) {
      return successResponse([]);
    }

    const objectIds = objects.map((o) => o.id);

    // Параллельный сбор агрегатов по всем объектам
    const [
      defectsOpen,
      defectsOverdue,
      _execDocsCounts,
      ks2Amounts,
      ganttTasksRaw,
    ] = await Promise.all([
      // Открытые дефекты по объектам
      db.defect.groupBy({
        by: ['projectId'],
        where: {
          projectId: { in: objectIds },
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
        _count: { id: true },
      }),

      // Просроченные дефекты по объектам
      db.defect.groupBy({
        by: ['projectId'],
        where: {
          projectId: { in: objectIds },
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          deadline: { lt: now },
        },
        _count: { id: true },
      }),

      // ИД: всего и подписанных по объектам
      db.executionDoc.groupBy({
        by: ['status'],
        where: { contract: { projectId: { in: objectIds } } },
        _count: { id: true },
      }),

      // КС-2 за текущий месяц (сумма totalAmount)
      db.ks2Act.findMany({
        where: {
          contract: { projectId: { in: objectIds } },
          periodEnd: { gte: monthStart, lte: monthEnd },
        },
        select: {
          totalAmount: true,
          contract: { select: { projectId: true } },
        },
      }),

      // Задачи ГПР с отклонением (активные версии, уровень > 0, не завершены)
      db.ganttTask.findMany({
        where: {
          version: { projectId: { in: objectIds }, isActive: true },
          planEnd: { lt: now },
          factEnd: null,
          progress: { lt: 100 },
          level: { gt: 0 },
          isMilestone: false,
        },
        select: {
          planEnd: true,
          progress: true,
          version: { select: { projectId: true } },
        },
      }),
    ]);

    // Прогресс ГПР по объектам (средний progress по всем задачам активной версии)
    const allGanttTasks = await db.ganttTask.findMany({
      where: {
        version: { projectId: { in: objectIds }, isActive: true },
        level: { gt: 0 },
        isMilestone: false,
      },
      select: {
        progress: true,
        version: { select: { projectId: true } },
      },
    });

    // Прогресс ИД по объектам
    const idDocsByProject = await db.executionDoc.groupBy({
      by: ['status'],
      where: { contract: { projectId: { in: objectIds } } },
      _count: { id: true },
    });

    // Строим map для каждого объекта
    const openDefectsMap: Record<string, number> = {};
    for (const row of defectsOpen) {
      openDefectsMap[row.projectId] = row._count.id;
    }

    const overdueDefectsMap: Record<string, number> = {};
    for (const row of defectsOverdue) {
      overdueDefectsMap[row.projectId] = row._count.id;
    }

    // ИД: суммируем по всей организации (без разбивки по объекту в groupBy)
    // Для точной разбивки по объектам нужен raw-запрос; используем агрегат по organization
    const idTotalByStatus: Record<string, number> = {};
    for (const row of idDocsByProject) {
      idTotalByStatus[row.status] = (idTotalByStatus[row.status] ?? 0) + row._count.id;
    }

    // КС-2 за месяц по объектам
    const ks2ByProject: Record<string, number> = {};
    for (const act of ks2Amounts) {
      const pid = act.contract.projectId;
      ks2ByProject[pid] = (ks2ByProject[pid] ?? 0) + act.totalAmount;
    }

    // ГПР прогресс по объектам (средний)
    const gprSumMap: Record<string, { sum: number; count: number }> = {};
    for (const task of allGanttTasks) {
      const pid = task.version.projectId;
      if (!pid) continue;
      if (!gprSumMap[pid]) gprSumMap[pid] = { sum: 0, count: 0 };
      gprSumMap[pid].sum += task.progress;
      gprSumMap[pid].count += 1;
    }

    // Максимальное отклонение по объектам (в днях)
    const deviationMap: Record<string, number> = {};
    for (const task of ganttTasksRaw) {
      const pid = task.version.projectId;
      if (!pid) continue;
      const daysLate = Math.round((now.getTime() - new Date(task.planEnd).getTime()) / 86400000);
      if (!deviationMap[pid] || daysLate > deviationMap[pid]) {
        deviationMap[pid] = daysLate;
      }
    }

    // ИД прогресс (общий для организации, без разбивки по объекту)
    const idTotal = Object.values(idTotalByStatus).reduce((a, b) => a + b, 0);
    const idSigned = idTotalByStatus['SIGNED'] ?? 0;
    const orgIdProgress = idTotal > 0 ? Math.round((idSigned / idTotal) * 100) : 0;

    // Формируем результат
    const result: MonitoringObject[] = objects.map((obj) => {
      const gprData = gprSumMap[obj.id];
      const gprProgress = gprData && gprData.count > 0
        ? Math.round(gprData.sum / gprData.count)
        : 0;

      const openDef = openDefectsMap[obj.id] ?? 0;
      const overdueDef = overdueDefectsMap[obj.id] ?? 0;
      const maxDeviation = deviationMap[obj.id] ?? 0;

      const scheduleStatus: ScheduleStatus =
        maxDeviation >= 30 || overdueDef >= 5
          ? 'CRITICAL_DELAY'
          : maxDeviation >= 1
            ? 'SLIGHT_DELAY'
            : 'ON_TRACK';

      return {
        id: obj.id,
        name: obj.name,
        address: obj.address,
        gprProgress,
        idProgress: orgIdProgress,
        openDefects: openDef,
        overdueDefects: overdueDef,
        ks2AmountMonth: Math.round(ks2ByProject[obj.id] ?? 0),
        maxDeviationDays: maxDeviation,
        scheduleStatus,
      };
    });

    logger.info({ orgId, objectsCount: result.length }, 'Мониторинг объектов загружен');
    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка загрузки мониторинга');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
