import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

export interface ConstructionProgressCategory {
  category: string;
  total: number;
  completed: number;
  progress: number;
}

export async function GET() {
  try {
    const session = await getSessionOrThrow();

    // Берём первый активный договор организации для виджета
    const contract = await db.contract.findFirst({
      where: {
        status: 'ACTIVE',
        buildingObject: { organizationId: session.user.organizationId },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        workItems: {
          include: {
            ksiNode: { select: { name: true } },
            workRecords: {
              where: { status: { in: ['COMPLETED', 'ACCEPTED'] } },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!contract || contract.workItems.length === 0) {
      return successResponse([]);
    }

    // Группируем по ksiNode.name или по первому слову названия работы
    const groups = new Map<string, { total: number; completed: number }>();

    for (const wi of contract.workItems) {
      const category = wi.ksiNode?.name ?? wi.name.split(' ').slice(0, 3).join(' ');
      const existing = groups.get(category) ?? { total: 0, completed: 0 };
      groups.set(category, {
        total: existing.total + 1,
        completed: existing.completed + (wi.workRecords.length > 0 ? 1 : 0),
      });
    }

    const result: ConstructionProgressCategory[] = Array.from(groups.entries())
      .map(([category, { total, completed }]) => ({
        category,
        total,
        completed,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      }))
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 8); // Не более 8 категорий в виджете

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения прогресса строительства');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
