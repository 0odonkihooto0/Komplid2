import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { guestScopeSchema } from '@/types/guest-scope';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSessionOrThrow();

    // Проверка что пользователь — активный гость
    const member = await db.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: session.user.activeWorkspaceId!,
      },
      select: { role: true, guestScope: true },
    });

    if (!member || member.role !== 'GUEST') {
      return errorResponse('Нет доступа', 403);
    }

    const scope = guestScopeSchema.parse(member.guestScope);

    // Объекты строительства, доступные гостю
    const buildingObjects = await db.buildingObject.findMany({
      where: { id: { in: scope.allowedProjectIds } },
      select: {
        id: true,
        name: true,
        status: true,
        address: true,
        region: true,
        plannedStartDate: true,
        plannedEndDate: true,
        // Контракты нужны для подсчёта ИД
        contracts: {
          select: {
            id: true,
            executionDocs: {
              select: { id: true, status: true },
            },
          },
        },
      },
    });

    // Добавляем прогресс по ИД для каждого объекта
    const projects = buildingObjects.map((obj) => {
      const allDocs = obj.contracts.flatMap((c) => c.executionDocs);
      const totalDocs = allDocs.length;
      const signedDocs = allDocs.filter((d) => d.status === 'SIGNED').length;

      const { contracts: _contracts, ...rest } = obj;
      void _contracts;

      return {
        ...rest,
        progress: {
          totalDocs,
          signedDocs,
          percent: totalDocs > 0 ? Math.round((signedDocs / totalDocs) * 100) : 0,
        },
      };
    });

    return successResponse(projects);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения списка объектов гостя');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
