import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionOrThrow } from '@/lib/auth-utils';
import { successResponse, errorResponse } from '@/utils/api';
import { logger } from '@/lib/logger';
import { guestScopeSchema } from '@/types/guest-scope';
import { GuestCommentTarget } from '@prisma/client';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

// Схема тела POST-запроса
const createCommentSchema = z.object({
  targetType: z.nativeEnum(GuestCommentTarget),
  targetId: z.string().uuid(),
  content: z.string().min(1, 'Содержимое комментария не может быть пустым').max(5000),
});

export async function GET(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const activeWorkspaceId = session.user.activeWorkspaceId;
    if (!activeWorkspaceId) return errorResponse('Нет активного workspace', 403);

    // Проверка что пользователь — гость в этом workspace
    const member = await db.workspaceMember.findFirst({
      where: { userId: session.user.id, workspaceId: activeWorkspaceId },
    });
    if (!member || member.role !== 'GUEST') return errorResponse('Нет доступа', 403);

    const scope = guestScopeSchema.parse(member.guestScope);

    // Проверка доступа к конкретному объекту строительства
    if (
      scope.scope !== 'FULL' &&
      !scope.allowedProjectIds.includes(params.projectId)
    ) {
      return errorResponse('Нет доступа к этому объекту', 403);
    }

    // Параметр пагинации
    const url = new URL(req.url);
    const page = Math.max(0, parseInt(url.searchParams.get('page') ?? '0', 10));
    const skip = page * PAGE_SIZE;

    // Получаем комментарии с именем автора
    const [comments, total] = await Promise.all([
      db.guestComment.findMany({
        where: {
          projectId: params.projectId,
          workspaceId: activeWorkspaceId,
        },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: PAGE_SIZE,
        skip,
      }),
      db.guestComment.count({
        where: {
          projectId: params.projectId,
          workspaceId: activeWorkspaceId,
        },
      }),
    ]);

    return successResponse({ items: comments, total, page, limit: PAGE_SIZE });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка получения комментариев гостя');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}

export async function POST(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionOrThrow();
    const activeWorkspaceId = session.user.activeWorkspaceId;
    if (!activeWorkspaceId) return errorResponse('Нет активного workspace', 403);

    // Проверка что пользователь — гость в этом workspace
    const member = await db.workspaceMember.findFirst({
      where: { userId: session.user.id, workspaceId: activeWorkspaceId },
    });
    if (!member || member.role !== 'GUEST') return errorResponse('Нет доступа', 403);

    const scope = guestScopeSchema.parse(member.guestScope);

    // Проверка разрешения на комментирование
    if (!scope.permissions.canComment) {
      return errorResponse('Комментирование запрещено', 403);
    }

    // Проверка доступа к конкретному объекту строительства
    if (
      scope.scope !== 'FULL' &&
      !scope.allowedProjectIds.includes(params.projectId)
    ) {
      return errorResponse('Нет доступа к этому объекту', 403);
    }

    // Валидация тела запроса
    const body = await req.json() as unknown;
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { targetType, targetId, content } = parsed.data;

    // Создаём комментарий гостя
    const comment = await db.guestComment.create({
      data: {
        workspaceId: activeWorkspaceId,
        projectId: params.projectId,
        authorUserId: session.user.id,
        targetType,
        targetId,
        content,
        status: 'OPEN',
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(comment);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    logger.error({ err: error }, 'Ошибка создания комментария гостя');
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
