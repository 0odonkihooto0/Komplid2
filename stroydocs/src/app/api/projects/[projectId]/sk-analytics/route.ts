import { NextRequest, NextResponse } from 'next/server';
import type { DefectStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

interface Params { projectId: string }

// GET /api/projects/[projectId]/sk-analytics — аналитика строительного контроля (4 агрегации)
export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getSessionOrThrow();
    const orgId = session.user.organizationId;
    const { projectId } = params;

    const project = await db.buildingObject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return errorResponse('Проект не найден', 404);

    const url = new URL(req.url);
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const period = url.searchParams.get('period');
    const overdueOnly = url.searchParams.get('overdueOnly') === 'true';

    // Вычисляем фильтр по дате создания дефекта
    let createdAtFilter: { gte?: Date; lte?: Date } | undefined;

    if (period && period !== 'all') {
      // Пресет периода: неделя / месяц / квартал
      const now = new Date();
      if (period === 'week') {
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day; // начало недели (пн)
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() + diff);
        weekStart.setHours(0, 0, 0, 0);
        createdAtFilter = { gte: weekStart };
      } else if (period === 'month') {
        createdAtFilter = { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
      } else if (period === 'quarter') {
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        createdAtFilter = { gte: new Date(now.getFullYear(), quarterMonth, 1) };
      }
    } else if (dateFrom || dateTo) {
      // Произвольный диапазон дат
      createdAtFilter = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    // Фильтр просроченных: только открытые/в работе с истёкшим сроком
    const overdueFilter = overdueOnly
      ? { status: { in: ['OPEN', 'IN_PROGRESS'] as DefectStatus[] }, deadline: { lt: new Date() } }
      : {};

    const defectWhere = {
      projectId,
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      ...overdueFilter,
    };

    // 4 агрегации параллельно
    const [byCategory, byStatus, byAuthor, byAssignee] = await Promise.all([
      // 1. Категории недостатков
      db.defect.groupBy({
        by: ['category'],
        where: defectWhere,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      // 2. Статусы нарушений
      db.defect.groupBy({
        by: ['status'],
        where: defectWhere,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      // 3. Авторы СК (по authorId) — топ 10
      db.defect.groupBy({
        by: ['authorId'],
        where: defectWhere,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      // 4. Ответственные за устранение (по assigneeId) — топ 10
      db.defect.groupBy({
        by: ['assigneeId'],
        where: { ...defectWhere, assigneeId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    // Получаем имена пользователей для агрегаций по авторам и ответственным
    const userIds = [
      ...byAuthor.map((r) => r.authorId),
      ...byAssignee.map((r) => r.assigneeId).filter((id): id is string => id !== null),
    ];

    const users = userIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];

    const userMap = new Map(users.map((u) => [u.id, `${u.lastName} ${u.firstName}`]));

    // Обогащаем данные именами
    const byAuthorWithNames = byAuthor.map((r) => ({
      authorId: r.authorId,
      name: userMap.get(r.authorId) ?? 'Неизвестный',
      count: (r._count as { id: number }).id,
    }));

    const byAssigneeWithNames = byAssignee.map((r) => ({
      assigneeId: r.assigneeId,
      name: r.assigneeId ? (userMap.get(r.assigneeId) ?? 'Неизвестный') : 'Не назначен',
      count: (r._count as { id: number }).id,
    }));

    // Дополнительные общие метрики
    const [totalDefects, openDefects, overdueDefects, totalInspections] = await Promise.all([
      db.defect.count({ where: defectWhere }),
      db.defect.count({ where: { ...defectWhere, status: { in: ['OPEN', 'IN_PROGRESS'] as DefectStatus[] } } }),
      db.defect.count({
        where: {
          ...defectWhere,
          status: { in: ['OPEN', 'IN_PROGRESS'] as DefectStatus[] },
          deadline: { lt: new Date() },
        },
      }),
      db.inspection.count({ where: { projectId } }),
    ]);

    return successResponse({
      summary: {
        totalDefects,
        openDefects,
        overdueDefects,
        totalInspections,
      },
      byCategory: byCategory.map((r) => ({
        category: r.category,
        count: r._count.id,
      })),
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count: r._count.id,
      })),
      byAuthor: byAuthorWithNames,
      byAssignee: byAssigneeWithNames,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения аналитики СК');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
