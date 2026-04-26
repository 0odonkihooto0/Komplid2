import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';

export const dynamic = 'force-dynamic';

const schema = z.object({
  workspaceId: z.string().min(1),
});

/** POST /api/user/active-workspace — переключить активный workspace */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return errorResponse('Неверные данные', 400, parsed.error.issues);

    const { workspaceId } = parsed.data;
    const userId = session.user.id;

    // Проверяем что пользователь является активным членом этого workspace
    const member = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { id: true, role: true, status: true },
    });

    if (!member || member.status !== 'ACTIVE') {
      return errorResponse('Нет доступа к этому рабочему пространству', 403);
    }

    await db.user.update({
      where: { id: userId },
      data: { activeWorkspaceId: workspaceId },
    });

    return successResponse({ workspaceId, role: member.role });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return errorResponse('Ошибка переключения рабочего пространства', 500);
  }
}
