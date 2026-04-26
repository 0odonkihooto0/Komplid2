import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

/** GET /api/user/workspaces — все workspace текущего пользователя */
export async function GET() {
  try {
    const session = await getSessionOrThrow();
    const userId = session.user.id;

    const memberships = await db.workspaceMember.findMany({
      where: { userId, status: 'ACTIVE' },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    const activeWorkspaceId = session.user.activeWorkspaceId;

    return successResponse({ memberships, activeWorkspaceId });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return errorResponse('Ошибка загрузки рабочих пространств', 500);
  }
}
