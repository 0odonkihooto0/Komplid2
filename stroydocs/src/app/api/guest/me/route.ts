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

    // Название воркспейса
    const workspace = await db.workspace.findFirst({
      where: { id: session.user.activeWorkspaceId! },
      select: { name: true },
    });

    // Объекты строительства, доступные гостю
    const allowedProjects = await db.buildingObject.findMany({
      where: { id: { in: scope.allowedProjectIds } },
      select: {
        id: true,
        name: true,
        status: true,
        address: true,
      },
    });

    return successResponse({
      user: {
        id: session.user.id,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        email: session.user.email,
      },
      workspaceName: workspace?.name ?? null,
      scope,
      allowedProjects,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения данных гостя (me)');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
