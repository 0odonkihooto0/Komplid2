import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

type ResourceType = 'machines' | 'works' | 'labor';

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();

    // Проверка принадлежности объекта организации
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!project) return errorResponse('Объект не найден', 404);

    const sp = req.nextUrl.searchParams;

    // Параметр ganttVersionId обязателен
    const ganttVersionId = sp.get('ganttVersionId');
    if (!ganttVersionId) return errorResponse('Параметр ganttVersionId обязателен', 400);

    // Тип ресурса обязателен
    const resourceType = sp.get('resourceType') as ResourceType | null;
    if (!resourceType || !['machines', 'works', 'labor'].includes(resourceType)) {
      return errorResponse('Параметр resourceType должен быть: machines | works | labor', 400);
    }

    // Опциональная фильтрация по периоду
    const from = sp.get('from');
    const to = sp.get('to');

    // Проверяем что версия ГПР принадлежит данному проекту
    const ganttVersion = await db.ganttVersion.findFirst({
      where: { id: ganttVersionId, projectId: params.projectId },
      select: { id: true, name: true, isActive: true },
    });
    if (!ganttVersion) return errorResponse('Версия ГПР не найдена', 404);

    // Базовый фильтр периода (по плановым датам задачи)
    const periodFilter = from || to
      ? {
          ...(from ? { planStart: { gte: new Date(from) } } : {}),
          ...(to ? { planEnd: { lte: new Date(to) } } : {}),
        }
      : {};

    let items: unknown[];

    if (resourceType === 'machines') {
      // Машины и механизмы: задачи с ненулевыми машино-часами
      const tasks = await db.ganttTask.findMany({
        where: {
          versionId: ganttVersionId,
          machineHours: { gt: 0 },
          ...periodFilter,
        },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          planStart: true,
          planEnd: true,
          machineHours: true,
        },
      });

      items = tasks.map((t) => ({
        ganttTaskId: t.id,
        ganttTaskName: t.name,
        planStart: t.planStart,
        planEnd: t.planEnd,
        machineHours: t.machineHours ?? 0,
      }));
    } else if (resourceType === 'works') {
      // Работы: все задачи уровня > 0 (не разделы) — сами задачи являются работами
      const tasks = await db.ganttTask.findMany({
        where: {
          versionId: ganttVersionId,
          level: { gt: 0 },
          ...periodFilter,
        },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          workType: true,
          volume: true,
          volumeUnit: true,
          planStart: true,
          planEnd: true,
          status: true,
          workItem: {
            select: { name: true },
          },
        },
      });

      items = tasks.map((t) => ({
        ganttTaskId: t.id,
        ganttTaskName: t.name,
        workType: t.workType,
        volume: t.volume,
        volumeUnit: t.volumeUnit,
        planStart: t.planStart,
        planEnd: t.planEnd,
        status: t.status,
        workItemName: t.workItem?.name ?? null,
      }));
    } else {
      // labor: задачи с ненулевыми человеко-часами
      const tasks = await db.ganttTask.findMany({
        where: {
          versionId: ganttVersionId,
          manHours: { gt: 0 },
          ...periodFilter,
        },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          planStart: true,
          planEnd: true,
          manHours: true,
        },
      });

      items = tasks.map((t) => ({
        ganttTaskId: t.id,
        ganttTaskName: t.name,
        planStart: t.planStart,
        planEnd: t.planEnd,
        manHours: t.manHours ?? 0,
      }));
    }

    return successResponse({
      ganttVersion,
      resourceType,
      items,
      total: items.length,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения ресурсов из ГПР');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
