import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { canUserSeeTask } from '@/lib/task-visibility';

export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const userId = session.user.id;
    const orgId = session.user.organizationId;
    const { id } = await params;

    const task = await db.task.findFirst({
      where: { id, project: { organizationId: orgId } },
      include: {
        roles: true,
        group: { select: { id: true, visibility: true, visibleUserIds: true } },
      },
    });
    if (!task || !canUserSeeTask(userId, task)) {
      return errorResponse('Задача не найдена', 404);
    }

    // Идемпотентно: вернуть существующий токен или создать новый
    const token = task.publicLinkToken ?? randomBytes(16).toString('hex');

    if (!task.publicLinkToken) {
      await db.task.update({ where: { id }, data: { publicLinkToken: token } });
    }

    const baseUrl = process.env.APP_URL ?? 'https://app.stroydocs.ru';
    return successResponse({
      token,
      url: `${baseUrl}/public/tasks/${token}`,
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[tasks/public-link] POST:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSessionOrThrow();
    const userId = session.user.id;
    const orgId = session.user.organizationId;
    const { id } = await params;

    const task = await db.task.findFirst({
      where: { id, project: { organizationId: orgId } },
      include: {
        roles: true,
        group: { select: { id: true, visibility: true, visibleUserIds: true } },
      },
    });
    if (!task || !canUserSeeTask(userId, task)) {
      return errorResponse('Задача не найдена', 404);
    }

    const isAuthor =
      task.createdById === userId ||
      task.roles.some((r) => r.userId === userId && r.role === 'AUTHOR');
    if (!isAuthor) {
      return errorResponse('Отозвать публичную ссылку может только автор', 403);
    }

    await db.task.update({ where: { id }, data: { publicLinkToken: null } });
    return successResponse({ id, revoked: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[tasks/public-link] DELETE:', err);
    return errorResponse('Ошибка сервера', 500);
  }
}
