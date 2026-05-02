import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { guestScopeSchema } from '@/types/guest-scope';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { projectId: string } }
) {
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

    // Проверка доступа к конкретному объекту
    if (!scope.allowedProjectIds.includes(params.projectId)) {
      return errorResponse('Нет доступа к этому объекту', 403);
    }

    // Основные данные объекта
    const project = await db.buildingObject.findFirst({
      where: { id: params.projectId },
      select: {
        id: true,
        name: true,
        shortName: true,
        status: true,
        address: true,
        region: true,
        constructionType: true,
        cadastralNumber: true,
        area: true,
        floors: true,
        responsibilityClass: true,
        permitNumber: true,
        permitDate: true,
        permitAuthority: true,
        designOrg: true,
        chiefEngineer: true,
        generalContractor: true,
        customer: true,
        plannedStartDate: true,
        plannedEndDate: true,
        actualStartDate: true,
        actualEndDate: true,
        latitude: true,
        longitude: true,
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

    if (!project) {
      return errorResponse('Объект не найден', 404);
    }

    // Подсчёт ИД по всем контрактам
    const allDocs = project.contracts.flatMap((c) => c.executionDocs);
    const totalDocs = allDocs.length;
    const signedDocs = allDocs.filter((d) => d.status === 'SIGNED').length;

    // Критические дефекты — запрашиваем отдельно если разрешено
    let criticalDefectsCount: number | undefined;
    if (scope.permissions.canViewDocuments) {
      criticalDefectsCount = await db.defect.count({
        where: {
          projectId: params.projectId,
          status: 'OPEN',
        },
      });
    }

    const { contracts: _contracts, area, ...projectRest } = project;
    void _contracts;

    // Финансовые данные (площадь) не возвращаем если запрещено
    const result: Record<string, unknown> = {
      ...projectRest,
      progress: {
        totalDocs,
        signedDocs,
        percent: totalDocs > 0 ? Math.round((signedDocs / totalDocs) * 100) : 0,
      },
    };

    if (scope.permissions.canViewCosts) {
      result.area = area;
    }

    if (scope.permissions.canViewDocuments) {
      result.criticalDefectsCount = criticalDefectsCount;
    }

    return successResponse(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения деталей объекта для гостя');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
